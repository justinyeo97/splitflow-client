import PaginatedTable from './PaginatedTable.jsx'
import { useAuth } from '../auth/AuthProvider.jsx'
import { useEffect, useState } from 'react'
import { apiRequest } from '../../api/client.js'
import { ErrorState, LoadingState } from '../../components/States.jsx'
import { money, useToken, Panel, Table } from './operationsUi.jsx'

export default function RoiReport({refreshKey=0}) {
  const token = useToken()
  const { profile } = useAuth()
  const homeCurrency = profile?.company?.home_currency || 'USD'
  const [reportCurrency, setReportCurrency] = useState(homeCurrency)
  const [salaryIncluded, setSalaryIncluded] = useState(false)
  const [salaryIssues, setSalaryIssues] = useState([])
  const [month, setMonth] = useState('')
  const [groupBy, setGroupBy] = useState('country')
  const [period, setPeriod] = useState('month')
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [quarter, setQuarter] = useState('')
  const [consultantId, setConsultantId] = useState('')
  const [consultants, setConsultants] = useState([])
  const [consultantError, setConsultantError] = useState('')
  useEffect(() => {
    let current = true
    setConsultantError('')
    async function load() {
      const people = []
      for (let offset=0;;offset+=100) {
        const result=await apiRequest('consultants?limit=100&offset='+offset,{token})
        people.push(...result.data)
        if (result.data.length<100) break
      }
      if(current) setConsultants(people)
    }
    load().catch(err=>{if(current)setConsultantError(err.message)})
    return ()=>{current=false}
  }, [token])
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  useEffect(() => {
    let current = true
    setLoading(true); setError('')
    const query = new URLSearchParams({group_by:groupBy,period})
    if (consultantId) query.set('consultant_id',consultantId)
    if (period==='month' && month) query.set('month',month)
    if (period!=='month' && year) query.set('year',year)
    if (period==='quarter' && year && quarter) query.set('quarter',quarter)
    if (period!=='month' && year && (!/^\d{4}$/.test(year)||Number(year)<1900||Number(year)>9998)) {setLoading(false);setError('Enter a year between 1900 and 9998.');return ()=>{current=false}}
    apiRequest('reports/roi?'+query, { token })
      .then(result => { if (current) {setRows(result.data);setReportCurrency(result.currency||homeCurrency);setSalaryIncluded(Boolean(result.salary_included));setSalaryIssues(result.salary_issues||[])} })
      .catch(err => { if (current) setError(err.message) })
      .finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [token, month, groupBy, period, year, quarter, consultantId, reload, homeCurrency, refreshKey])
  function status(row) {
    const issues = []
    if (groupBy!=='company' && (groupBy==='country' ? !row.country_id : !row.consultant_id)) issues.push(groupBy==='country'?'Country missing':'Consultant missing')
    if (row.missing_salary_count) issues.push('Salary coverage missing')
    if (row.missing_revenue_count) issues.push(`${row.missing_revenue_count} placement(s) need revenue`)
    if (row.missing_cost_rate_count) issues.push(`${row.missing_cost_rate_count} cost rate(s) missing`)
    if (row.missing_revenue_rate_count) issues.push(`${row.missing_revenue_rate_count} revenue rate(s) missing`)
    return issues.join('; ') || (row.roi_percent == null ? 'No costs: ROI undefined' : 'Complete')
  }
  return <Panel title={groupBy==='company'?'Headquarters consolidation':groupBy==='country'?'Country ROI':'Consultant ROI'} detail={'Revenue, costs and profit in '+reportCurrency} action={<button className="secondary-action" disabled={loading} onClick={() => setReload(value => value + 1)}>Refresh ROI</button>}>
    <div className="expense-toolbar roi-filters">
      <label>View<select value={groupBy} onChange={e=>setGroupBy(e.target.value)}><option value="country">Country ROI</option><option value="consultant">Consultant ROI</option>{profile?.company&&<option value="company">Headquarters consolidation</option>}</select></label>
      <label>Period<select value={period} onChange={e=>setPeriod(e.target.value)}><option value="month">Monthly</option><option value="quarter">Quarterly</option><option value="year">Yearly</option></select></label>
      {period==='month' ? <label>Month<input type="month" value={month} onChange={e=>setMonth(e.target.value)} /></label> : <label>Year<select value={year} onChange={e=>{setYear(e.target.value);setQuarter('')}}><option value="">All years</option>{Array.from({length:new Date().getFullYear()-1900+2},(_,index)=>new Date().getFullYear()+1-index).map(value=><option key={value} value={value}>{value}</option>)}</select></label>}
      {period==='quarter'&&<label>Quarter<select value={quarter} disabled={!year} onChange={e=>setQuarter(e.target.value)}><option value="">All quarters</option>{[1,2,3,4].map(q=><option key={q} value={q}>Q{q}</option>)}</select></label>}
      <label>Consultant<select value={consultantId} onChange={e=>setConsultantId(e.target.value)}><option value="">All consultants</option>{consultants.map(person=><option key={person.id} value={person.id}>{person.name} ({person.external_id})</option>)}</select></label>
      <button type="button" className="secondary-action" onClick={()=>{setMonth('');setYear('');setQuarter('');setConsultantId('')}}>Clear filters</button>
    </div>
    {consultantError&&<div className="inline-error" role="alert">Could not load consultant choices: {consultantError}</div>}
    <aside className="roi-guide" aria-label="Calculation guide">
      <p><strong>ROI = (Revenue - Costs) / Costs x 100</strong></p>
      <p>Grouped by {groupBy==='company'?'company':groupBy==='country'?'country':'consultant'} and {period==='month'?'month':period==='quarter'?'quarter':'year'}, in {reportCurrency}.</p>
      <details>
        <summary>How it is calculated</summary>
        <ul>
          <li><strong>Timing:</strong> Costs use expense dates; revenue and placement counts use recognition dates.</li>
          <li><strong>Cost per placement:</strong> Recorded costs / placements. {salaryIncluded?'Costs include accrued base salaries and operating expenses; payroll-marked expenses are excluded to avoid counting salary twice.':'Salaries are not included yet.'}</li>
          <li><strong>Currency:</strong> Amounts use historical exchange rates into {reportCurrency}, directly from the original currency.</li>
          <li><strong>Missing data:</strong> Totals may be partial; profit and ROI stay hidden until complete. ROI is undefined when costs are zero.</li>
        </ul>
        <p>Placements missing revenue use their placement month until updated. Filters apply only to this ROI table.</p>
      </details>
    </aside>
    {salaryIssues.length>0&&<div className="inline-error" role="alert">Salary information is missing for {salaryIssues.length} consultant(s). Report totals are incomplete.</div>}
    {loading ? <LoadingState label="Calculating ROI…" /> : error ? <ErrorState title="Could not calculate ROI" message={error} onRetry={() => setReload(value => value + 1)} /> : rows.length === 0 ? <div className="table-empty">No expenses or placements for this period.</div> : <PaginatedTable label="ROI" rows={rows} columns={['Period', groupBy==='company'?'Company':groupBy==='country'?'Country':'Consultant', 'Revenue ('+reportCurrency+')', 'Operating costs', 'Salary costs', 'Total costs ('+reportCurrency+')', 'Profit ('+reportCurrency+')', 'ROI', 'Placements', 'Cost / placement ('+reportCurrency+')', 'Status']} renderRow={row => (<tr key={(row.period||row.month)+':'+(row.country_id||row.consultant_id||row.company||'unassigned')}><td>{row.period||row.month}</td><td>{groupBy==='company'?row.company:groupBy==='country'?row.country:row.consultant}</td><td>{money(row.revenue)}</td><td>{money(row.operating_costs??row.costs)}</td><td>{salaryIncluded?money(row.salary_costs):'Not included'}</td><td>{money(row.costs)}</td><td>{row.profit == null ? '—' : money(row.profit)}</td><td>{row.roi_percent == null ? '—' : `${row.roi_percent}%`}</td><td>{row.placement_count}</td><td>{row.cost_per_placement == null ? '—' : money(row.cost_per_placement)}</td><td>{status(row)}</td></tr>)} />}
  </Panel>
}
