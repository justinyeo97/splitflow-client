import { useEffect, useState } from 'react'
import { apiRequest } from '../../api/client.js'
import { ErrorState, LoadingState } from '../../components/States.jsx'
import { money, useToken, Panel, Table } from './operationsUi.jsx'

export default function RoiReport() {
  const token = useToken()
  const [month, setMonth] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  useEffect(() => {
    let current = true
    setLoading(true); setError('')
    apiRequest(`reports/roi${month ? `?month=${encodeURIComponent(month)}` : ''}`, { token })
      .then(result => { if (current) setRows(result.data) })
      .catch(err => { if (current) setError(err.message) })
      .finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [token, month, reload])
  function status(row) {
    const issues = []
    if (!row.country_id) issues.push('Country missing')
    if (row.missing_revenue_count) issues.push(`${row.missing_revenue_count} placement(s) need revenue`)
    if (row.missing_cost_rate_count) issues.push(`${row.missing_cost_rate_count} cost rate(s) missing`)
    if (row.missing_revenue_rate_count) issues.push(`${row.missing_revenue_rate_count} revenue rate(s) missing`)
    return issues.join('; ') || (row.roi_percent == null ? 'No costs: ROI undefined' : 'Complete')
  }
  return <Panel title="Monthly country ROI" detail="Revenue, costs and profit in USD" action={<button className="secondary-action" disabled={loading} onClick={() => setReload(value => value + 1)}>Refresh ROI</button>}>
    <div className="expense-toolbar"><label>Reporting month<input type="month" value={month} onChange={e => setMonth(e.target.value)} /></label><button type="button" className="secondary-action" onClick={() => setMonth('')}>All months</button></div>
    <p className="form-footnote">ROI = (recognized revenue − recorded costs) ÷ recorded costs × 100. All costs belong to the country and month of the expense; revenue belongs to its recognition month. Placement counts and cost per placement use that recognition month too.</p>
    <p className="form-footnote">Historical USD rates are used. Totals are partial when rates or revenue are missing; profit and ROI are withheld until complete. Older placements without revenue appear in their placement month until updated. Other reports below cover all dates.</p>
    {loading ? <LoadingState label="Calculating monthly ROI…" /> : error ? <ErrorState title="Could not calculate ROI" message={error} onRetry={() => setReload(value => value + 1)} /> : rows.length === 0 ? <div className="table-empty">No expenses or placements for this period.</div> : <Table columns={['Month', 'Country', 'Revenue (USD)', 'Costs (USD)', 'Profit (USD)', 'ROI', 'Placements', 'Cost / placement (USD)', 'Status']}>
      {rows.map(row => <tr key={`${row.month}:${row.country_id || 'unassigned'}`}><td>{row.month}</td><td>{row.country}</td><td>{money(row.revenue)}</td><td>{money(row.costs)}</td><td>{row.profit == null ? '—' : money(row.profit)}</td><td>{row.roi_percent == null ? '—' : `${row.roi_percent}%`}</td><td>{row.placement_count}</td><td>{row.cost_per_placement == null ? '—' : money(row.cost_per_placement)}</td><td>{status(row)}</td></tr>)}
    </Table>}
  </Panel>
}
