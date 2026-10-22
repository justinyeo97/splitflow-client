import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../api/client.js'
import { ErrorState, LoadingState } from '../../components/States.jsx'
import { useApiList } from '../../hooks/useApiList.js'
import { useAuth } from '../auth/AuthProvider.jsx'

const today = () => new Date().toISOString().slice(0, 10)
function money(amount, currency = '') {
  const raw = String(amount ?? '0').trim()
  const negative = raw.startsWith('-')
  const [wholePart = '0', fractionPart = ''] = (negative ? raw.slice(1) : raw).split('.')
  let whole = BigInt(wholePart || '0')
  let cents = BigInt((fractionPart + '00').slice(0, 2))
  if ((fractionPart[2] || '0') >= '5') cents += 1n
  if (cents === 100n) { whole += 1n; cents = 0n }
  const formatted = `${new Intl.NumberFormat().format(whole)}.${String(cents).padStart(2, '0')}`
  return `${currency ? `${currency} ` : ''}${negative && (whole > 0n || cents > 0n) ? '-' : ''}${formatted}`
}

function useToken() { return useAuth().session?.access_token }
function Heading({ eyebrow, title, children }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div>{children}</div>
}
function Notice({ error, notice }) {
  return <>{error && <div className="inline-error" role="alert">{error}</div>}{notice && <div className="inline-notice" role="status">{notice}</div>}</>
}
function Table({ columns, children }) {
  return <div className="table-scroll"><table><thead><tr>{columns.map(column => <th key={column}>{column}</th>)}</tr></thead><tbody>{children}</tbody></table></div>
}
function Pager({ list }) {
  if (!list.pagination.total || list.pagination.total <= list.pagination.limit) return null
  return <div className="pagination"><span>{list.offset + 1}–{Math.min(list.offset + list.pagination.limit, list.pagination.total)} of {list.pagination.total}</span><div><button disabled={list.loading || !list.offset} onClick={() => list.setOffset(Math.max(0, list.offset - list.pagination.limit))}>Previous</button><button disabled={list.loading || list.offset + list.pagination.limit >= list.pagination.total} onClick={() => list.setOffset(list.offset + list.pagination.limit)}>Next</button></div></div>
}
function Panel({ title, detail, action, children }) {
  return <section className="panel table-panel"><div className="panel-heading"><div><h2>{title}</h2>{detail && <p>{detail}</p>}</div>{action}</div>{children}</section>
}
function ListResult({ list, title, columns, children }) {
  if (list.error) return <ErrorState title={title} message={list.error.message} onRetry={list.refresh} />
  if (list.loading) return <LoadingState label={`Loading ${title.toLowerCase()}…`} />
  if (!list.data.length) return <div className="table-empty">No records yet.</div>
  return <>{<Table columns={columns}>{children}</Table>}<Pager list={list} /></>
}

export function DashboardPage() {
  const token = useToken()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [reload, setReload] = useState(0)
  useEffect(() => {
    let alive = true
    setLoading(true); setError('')
    Promise.all([
      apiRequest('expenses?limit=8&offset=0', { token }),
      apiRequest('reports/consolidated', { token }),
      apiRequest('conversions/exceptions', { token }).catch(err => err.status === 403 ? null : Promise.reject(err)),
    ]).then(([expenses, report, exceptions]) => {
      if (alive) setData({ expenses: expenses?.data || [], count: expenses?.pagination?.total || 0, report: report?.data, exceptions: exceptions?.data || null })
    }).catch(err => { if (alive) setError(err.message || 'Could not load dashboard data.') }).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [token, reload])
  const people = useApiList('consultants', token, 100)
  const countries = useApiList('countries', token, 100)
  const consultants = useMemo(() => Object.fromEntries(people.data.map(person => [person.id, person])), [people.data])
  const countryMap = useMemo(() => Object.fromEntries(countries.data.map(country => [country.id, country])), [countries.data])
  return <section className="page-content"><Heading eyebrow="REGIONAL COST ALLOCATION" title="Dashboard"><button className="secondary-action" onClick={() => setReload(n => n + 1)} disabled={loading}>Refresh</button></Heading>
    {error && <ErrorState title="Could not load dashboard" message={error} onRetry={() => setReload(n => n + 1)} />}
    {loading ? <LoadingState label="Loading live financial data…" /> : data && <>
      <div className="metric-grid"><article className="metric-card"><span>Recorded expenses</span><strong>{data.count.toLocaleString()}</strong><small>All expenses visible to your account</small></article><article className="metric-card"><span>Consolidated spend (USD)</span><strong>{money(data.report?.total, data.report?.currency || 'USD')}</strong><small>{data.report?.expense_count || 0} expenses included ? {data.report?.unconverted_count || 0} awaiting a USD rate</small></article><article className="metric-card"><span>Pending conversions</span><strong>{data.exceptions ? data.exceptions.length.toLocaleString() : '—'}</strong><small>{data.exceptions ? 'Requires finance access to retry' : 'Finance permission required to view'}</small></article><article className="metric-card"><span>Active consultants (first 100)</span><strong>{people.data.filter(person => person.active).length.toLocaleString()}</strong><small>{people.loading ? 'Loading directory…' : `${people.pagination.total} in directory`}</small></article></div>
      <Panel title="Recent expenses" detail="Latest records returned by the API"><ListResult list={{...{data:data.expenses,loading:false,error:null,pagination:{total:data.count,limit:8},offset:0}}} title="Recent expenses" columns={['Date','Consultant','Country','Category','Original amount']}>{data.expenses.map(expense => { const consultant=consultants[expense.consultant_id]; const country=countryMap[expense.attributed_country_id]; return <tr key={expense.id}><td>{expense.transaction_date}</td><td>{consultant?.name || '—'}</td><td>{country?.name || '—'}</td><td>{expense.category}</td><td>{money(expense.original_amount, expense.original_currency)}</td></tr> })}</ListResult></Panel>
    </>}
  </section>
}

export function ExpensesPage() {
  const token = useToken()
  const [range, setRange] = useState({ from: '', to: '' })
  const [filters, setFilters] = useState({ from: '', to: '' })
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value)).toString()
  const expenses = useApiList(`expenses?${query}`, token)
  const [selected, setSelected] = useState([])
  const [converting, setConverting] = useState(false)
  const consultants = useApiList('consultants', token, 100)
  const countries = useApiList('countries', token, 100)
  const [form, setForm] = useState({ consultant_id:'', transaction_date:today(), original_amount:'', original_currency:'USD', category:'Travel', vendor:'', description:'' })
  const [error,setError]=useState(''); const [notice,setNotice]=useState(''); const [saving,setSaving]=useState(false); const [editing,setEditing]=useState(null)
  const byId = Object.fromEntries(consultants.data.map(person=>[person.id,person]))
  const countryById = Object.fromEntries(countries.data.map(country=>[country.id,country]))
  const eligible = expenses.data.filter(expense => {
    const currency = countryById[expense.attributed_country_id]?.default_reporting_currency?.trim()
    return currency && !expense.expense_conversions?.some(item => item.target_currency.trim() === currency && item.status === 'finalized')
  })
  const selectedRows = eligible.filter(expense => selected.includes(expense.id))
  useEffect(() => { setSelected([]) }, [expenses.data])
  function applyFilters(event) {
    event.preventDefault()
    if (range.from && range.to && range.from > range.to) { setError('Start date must be on or before end date.'); return }
    setError(''); setSelected([]); expenses.setOffset(0); setFilters({ ...range })
  }
  async function batchConvert() {
    setConverting(true); setError(''); setNotice('')
    let finalized = 0, pending = 0
    const failures = []
    for (const expense of selectedRows) {
      try {
        const status = await convertForReports(expense)
        if (status === 'finalized') finalized++; else pending++
      } catch (err) { failures.push(`${expense.transaction_date} (${expense.id}): ${err.message}`) }
    }
    setNotice(`${finalized} finalized, ${pending} pending, ${failures.length} failed.`)
    if (failures.length) setError(failures.join('; '))
    setSelected([]); setConverting(false); expenses.refresh()
  }
  function editExpense(expense){setEditing(expense.id);setForm({consultant_id:expense.consultant_id,transaction_date:expense.transaction_date,original_amount:String(expense.original_amount),original_currency:expense.original_currency.trim(),category:expense.category,vendor:expense.vendor||'',description:expense.description||''});setError('');setNotice('')}
  function resetForm(){setEditing(null);setForm({consultant_id:'',transaction_date:today(),original_amount:'',original_currency:'USD',category:'Travel',vendor:'',description:''})}
  async function submit(event) { event.preventDefault(); setSaving(true);setError('');setNotice('');try { await apiRequest(editing?`expenses/${editing}`:'expenses',{method:editing?'PATCH':'POST',token,body:{...form,original_amount:String(form.original_amount)}});setNotice(editing?'Expense updated. Any finalized conversion rules were enforced by the API.':'Expense added. Convert it to the country reporting currency from the table.');resetForm();expenses.refresh() } catch(err){setError(err.message)} finally{setSaving(false)} }
  async function convertForReports(expense) {
    const currency = countryById[expense.attributed_country_id]?.default_reporting_currency?.trim()
    if (!currency) throw new Error('Could not find the expense country reporting currency.')
    const result = await apiRequest(`expenses/${expense.id}/conversions`, { method: 'POST', token, body: { target_currency: currency } })
    return result.data.status
  }
  async function convert(expense) {
    setConverting(true); setError(''); setNotice('')
    try {
      const status = await convertForReports(expense)
      setNotice(status === 'pending' ? 'Some conversions remain pending; check the exceptions page.' : 'Country reporting conversion finalized.')
    } catch (err) { setError(err.message) }
    finally { setConverting(false); expenses.refresh() }
  }
  return <section className="page-content"><Heading eyebrow="WORKSPACE" title="Expenses"><span className="scope-chip scope-live"><span className="scope-dot"/>Live API data</span></Heading><p className="page-lede">Record source expenses and convert them using the backend’s historical exchange rate policy.</p><Notice error={error} notice={notice}/>
    <div className="management-grid"><section className="panel form-panel"><div className="panel-heading"><div><h2>Add an expense</h2><p>Country attribution is determined by assignment on the transaction date.</p></div></div><form className="record-form" onSubmit={submit}>
      <label>Consultant<select required value={form.consultant_id} onChange={e=>setForm({...form,consultant_id:e.target.value})}><option value="">Select consultant</option>{consultants.data.map(person=><option key={person.id} value={person.id}>{person.name} ({person.external_id})</option>)}</select></label>
      <label>Transaction date<input type="date" required value={form.transaction_date} onChange={e=>setForm({...form,transaction_date:e.target.value})}/></label><div className="form-row"><label>Amount<input type="number" min="0" step="0.00000001" required value={form.original_amount} onChange={e=>setForm({...form,original_amount:e.target.value})}/></label><label>Currency<input required minLength="3" maxLength="3" value={form.original_currency} onChange={e=>setForm({...form,original_currency:e.target.value.toUpperCase()})}/></label></div>
      <label>Category<input required maxLength="100" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/></label><label>Vendor (optional)<input maxLength="200" value={form.vendor} onChange={e=>setForm({...form,vendor:e.target.value})}/></label><label>Description (optional)<input maxLength="1000" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
      <div className="form-actions">{editing&&<button type="button" className="secondary-action" disabled={saving} onClick={resetForm}>Cancel</button>}<button className="primary-button" disabled={saving||consultants.loading||consultants.data.length===0}>{saving?'Saving…':editing?'Save expense':'Create expense'}</button></div></form></section>
      <Panel title="Expense ledger" detail={`${expenses.pagination.total} total`} action={<button className="secondary-action" onClick={expenses.refresh} disabled={expenses.loading}>Refresh</button>}><form className="expense-toolbar" onSubmit={applyFilters}><label>From<input type="date" value={range.from} onChange={e=>setRange({...range,from:e.target.value})} disabled={converting}/></label><label>Through<input type="date" value={range.to} onChange={e=>setRange({...range,to:e.target.value})} disabled={converting}/></label><button className="secondary-action" disabled={converting}>Apply dates</button><button type="button" className="secondary-action" disabled={converting} onClick={()=>{setRange({from:'',to:''});setFilters({from:'',to:''});expenses.setOffset(0);setSelected([])}}>Clear</button></form><div className="expense-toolbar"><label><input type="checkbox" aria-label="Select all eligible expenses on this page" disabled={converting||expenses.loading||!eligible.length} checked={eligible.length>0&&selectedRows.length===eligible.length} ref={element=>{if(element)element.indeterminate=selectedRows.length>0&&selectedRows.length<eligible.length}} onChange={e=>setSelected(e.target.checked?eligible.map(item=>item.id):[])}/> Select all on this page</label><span>{selectedRows.length} selected</span><button type="button" className="secondary-action" disabled={converting||expenses.loading||!selectedRows.length} onClick={batchConvert}>{converting?'Converting?':'Convert selected'}</button><small>Each expense uses its country reporting currency.</small></div><ListResult list={expenses} title="Could not load expenses" columns={['Select','Date','Consultant','Country','Category','Original amount','Conversion','Actions']}>{expenses.data.map(expense=>{const person=byId[expense.consultant_id];const country=countryById[expense.attributed_country_id];const conversion=expense.expense_conversions?.find(c=>c.target_currency===country?.default_reporting_currency?.trim());return <tr key={expense.id}><td><input type="checkbox" aria-label={"Select expense " + expense.id} disabled={converting||expenses.loading||!eligible.some(item=>item.id===expense.id)} checked={selected.includes(expense.id)} onChange={e=>setSelected(ids=>e.target.checked?[...ids,expense.id]:ids.filter(id=>id!==expense.id))}/></td><td>{expense.transaction_date}</td><td>{person?.name||'—'}</td><td>{country?.name||'—'}</td><td>{expense.category}</td><td>{money(expense.original_amount,expense.original_currency)}</td><td>{conversion?.status==='finalized'?money(conversion.converted_amount,conversion.target_currency):conversion?.status||'Not converted'}</td><td><button className="row-action" disabled={converting} onClick={()=>editExpense(expense)}>Edit</button> <button className="row-action" onClick={()=>convert(expense)} disabled={converting||!country||!eligible.some(item=>item.id===expense.id)}>{eligible.some(item=>item.id===expense.id)?'Convert':'Finalized'}</button></td></tr>})}</ListResult></Panel></div>
    {consultants.error&&<p className="permission-note">Consultant list unavailable: {consultants.error.message}</p>}
  </section>
}

function SampleDownload({ token }) {
  const people = useApiList('consultants', token, 100)
  const [personId, setPersonId] = useState('')
  const [date, setDate] = useState(today())
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function download() {
    setBusy(true); setError('')
    try {
      const person = people.data.find(item => item.id === personId)
      const result = await apiRequest(`consultants/${personId}/country-history`, { token })
      if (!result.data?.some(item => item.effective_from <= date && (!item.effective_to || item.effective_to >= date))) throw new Error('Choose a date covered by this consultant’s country assignment.')
      const cell = value => `"${String(value).replaceAll('"', '""')}"`
      const rows = [['consultant_external_id','transaction_date','original_amount','original_currency','category','vendor','source_identifier','description']]
      ;['128.40','86.25','245.00','42.00','75.00'].forEach((amount, index) => rows.push([person.external_id,date,amount,'USD',index === 2 ? 'Software' : 'Travel','Sample vendor',`DEMO-W1-${person.id}-${date}-${index + 1}`,'Sample testing expense']))
      const url = URL.createObjectURL(new Blob([rows.map(row => row.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }))
      const link = document.createElement('a'); link.href = url; link.download = 'sample-expenses.csv'; link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <div className="record-form"><label>Sample consultant<select value={personId} onChange={event => setPersonId(event.target.value)}><option value="">Choose an existing consultant</option>{people.data.map(person => <option key={person.id} value={person.id}>{person.name} ({person.external_id})</option>)}</select></label><label>Sample transaction date<input type="date" value={date} onChange={event => setDate(event.target.value)} /></label><button type="button" className="secondary-action" disabled={!personId || !date || busy} onClick={download}>{busy ? 'Checking assignment…' : 'Download 5 valid sample rows'}</button><p className="form-footnote">Checks the assignment date before download. Reimporting this file uses the same source IDs for duplicate detection.</p>{(error || people.error) && <p role="alert">{error || people.error.message}</p>}</div>
}

export function ImportsPage() {
  const token=useToken();const [file,setFile]=useState(null);const [batchId,setBatchId]=useState('');const [batch,setBatch]=useState(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [notice,setNotice]=useState('')
  async function upload(event){event.preventDefault();if(!file)return;setBusy(true);setError('');setNotice('');setBatch(null);try{const csv=await file.text();const result=await apiRequest('imports/expenses',{method:'POST',token,headers:{'Content-Type':'text/csv','X-Filename':file.name},body:csv});setBatchId(result?.data?.id||'');setNotice(`Import finished: ${result.data.accepted} accepted, ${result.data.rejected} rejected, ${result.data.duplicates} duplicates.`)}catch(err){setError(err.message)}finally{setBusy(false)}}
  async function loadBatch(){setError('');setBatch(null);try{const result=await apiRequest(`imports/${batchId.trim()}`,{token});setBatch(result?.data)}catch(err){setError(err.message)}}
  return <section className="page-content"><Heading eyebrow="WORKSPACE" title="Expense imports"><span className="scope-chip scope-live"><span className="scope-dot"/>Live API data</span></Heading><p className="page-lede">Upload a CSV using the API’s required expense columns. Rows are accepted independently; rejected rows and duplicates are reported.</p><Notice error={error} notice={notice}/><div className="management-grid"><section className="panel form-panel"><div className="panel-heading"><div><h2>Upload CSV</h2><p>Maximum 5 MB and 5,000 rows.</p></div></div><form className="record-form" onSubmit={upload}><label>Expense CSV<input type="file" accept=".csv,text/csv" required onChange={e=>setFile(e.target.files?.[0]||null)}/></label><p className="form-footnote">Required headers: consultant_external_id, transaction_date, original_amount, original_currency, category. Optional: vendor, source_identifier, description.</p><SampleDownload token={token} /><p className="form-footnote">Importing writes expense and batch records to the connected database. Use a test or staging database for the sample file.</p><div className="form-actions"><button className="primary-button" disabled={busy||!file}>{busy?'Importing…':'Import expenses'}</button></div></form></section><section className="panel form-panel"><div className="panel-heading"><div><h2>Import batch detail</h2><p>Enter the batch ID returned after upload.</p></div></div><form className="record-form" onSubmit={e=>{e.preventDefault();loadBatch()}}><label>Batch ID<input required value={batchId} onChange={e=>setBatchId(e.target.value)} placeholder="UUID"/></label><div className="form-actions"><button className="secondary-action">Load batch</button></div></form>{batch&&<div className="batch-summary"><strong>{batch.filename}</strong><span>Status: {batch.status}</span><span>Rows: {batch.total_rows} · accepted {batch.accepted_rows} · rejected {batch.rejected_rows} · duplicates {batch.duplicate_rows}</span>{batch.import_row_errors?.length>0&&<Table columns={['Row','Error','Message']}>{batch.import_row_errors.map(item=><tr key={item.id}><td>{item.row_number}</td><td>{item.error_code}</td><td>{item.message}</td></tr>)}</Table>}</div>}</section></div></section>
}

export function ConversionsPage() {
  const token=useToken();const [items,setItems]=useState([]);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [busyId,setBusyId]=useState('');const [notice,setNotice]=useState('');const [reload,setReload]=useState(0)
  useEffect(()=>{let alive=true;setLoading(true);setError('');apiRequest('conversions/exceptions',{token}).then(result=>{if(alive)setItems(result?.data||[])}).catch(err=>{if(alive)setError(err.message)}).finally(()=>{if(alive)setLoading(false)});return()=>{alive=false}},[token,reload])
  async function retry(id){setBusyId(id);setError('');setNotice('');try{const result=await apiRequest(`conversions/${id}/retry`,{method:'POST',token});setNotice(result?.data?.status==='pending'?'No historical rate is available yet; conversion remains pending.':'Conversion finalized.');setReload(n=>n+1)}catch(err){setError(err.message)}finally{setBusyId('')}}
  return <section className="page-content"><Heading eyebrow="FINANCE" title="Conversions & exceptions"><button className="secondary-action" onClick={()=>setReload(n=>n+1)} disabled={loading}>Refresh</button></Heading><p className="page-lede">Pending historical currency conversions returned by the finance API.</p><Notice error={error} notice={notice}/>{loading?<LoadingState label="Loading conversion exceptions…"/>:error?<ErrorState title="Could not load exceptions" message={error} onRetry={()=>setReload(n=>n+1)}/>:<Panel title="Pending exceptions" detail={`${items.length} pending`}>{items.length===0?<div className="table-empty">No pending conversion exceptions.</div>:<Table columns={['Expense','Date','Currency pair','Amount','Reason','Action']}>{items.map(item=><tr key={item.id}><td>{item.expenses?.description||item.expenses?.vendor||item.expense_id}</td><td>{item.expenses?.transaction_date||'—'}</td><td>{item.expenses?.original_currency} → {item.target_currency}</td><td>{money(item.expenses?.original_amount,item.expenses?.original_currency)}</td><td>{item.error_metadata?.[0]?.message||item.error_metadata?.reason||'Rate unavailable'}</td><td><button className="row-action" disabled={busyId===item.id} onClick={()=>retry(item.id)}>{busyId===item.id?'Retrying…':'Retry'}</button></td></tr>)}</Table>}</Panel>}</section>
}

export function ReportsPage() {
  const token=useToken();const [data,setData]=useState(null);const [error,setError]=useState('');const [loading,setLoading]=useState(true);const [reload,setReload]=useState(0)
  useEffect(()=>{let alive=true;setLoading(true);setError('');Promise.all([apiRequest('reports/country-costs',{token}),apiRequest('reports/consolidated',{token}),apiRequest('reports/reconciliation',{token}).catch(err=>err.status===403?null:Promise.reject(err))]).then(([countries,consolidated,reconciliation])=>{if(alive)setData({countries:countries?.data||[],consolidated:consolidated?.data,reconciliation})}).catch(err=>{if(alive)setError(err.message)}).finally(()=>{if(alive)setLoading(false)});return()=>{alive=false}},[token,reload])
  return <section className="page-content"><Heading eyebrow="FINANCE" title="Reports & reconciliation"><button className="secondary-action" onClick={()=>setReload(n=>n+1)} disabled={loading}>Refresh reports</button></Heading><p className="page-lede">Live report endpoints. Totals cover the complete dataset; date filters are not currently supported by the API.</p>{error&&<ErrorState title="Could not load reports" message={error} onRetry={()=>setReload(n=>n+1)}/ >}{loading?<LoadingState label="Loading financial reports…"/>:data&&<><div className="metric-grid"><article className="metric-card"><span>Consolidated spend (USD)</span><strong>{money(data.consolidated?.total,data.consolidated?.currency||'USD')}</strong><small>{data.consolidated?.expense_count||0} expenses included ? {data.consolidated?.unconverted_count||0} awaiting a USD rate</small></article>{data.reconciliation?.summary&&<><article className="metric-card"><span>Conversions checked</span><strong>{data.reconciliation.summary.conversion_count}</strong><small>{data.reconciliation.summary.finalized_count} finalized</small></article><article className="metric-card"><span>Exceptions</span><strong>{data.reconciliation.summary.exception_count}</strong><small>Pending or unfinalized conversions</small></article></>}</div><Panel title="Country costs" detail="Finalized amounts in each country’s default reporting currency"><Table columns={['Country','Currency','Finalized total','Converted expenses','Unconverted']} >{data.countries.map(row=><tr key={row.country_id}><td className="primary-cell">{row.country}</td><td>{row.currency}</td><td>{money(row.total,row.currency)}</td><td>{row.expense_count}</td><td>{row.unconverted_count}</td></tr>)}</Table>{!data.countries.length&&<div className="table-empty">No country costs to report yet.</div>}</Panel>{data.reconciliation&&<Panel title="Conversion reconciliation" detail="Conversion status and source expense"><Table columns={['Status','Target','Rate','Converted amount','Requested date','Effective rate date']}>{data.reconciliation.data.map(row=><tr key={row.id}><td><span className={`status-pill ${row.status==='finalized'?'status-active':'status-inactive'}`}>{row.status}</span></td><td>{row.target_currency}</td><td>{row.applied_rate||'—'}</td><td>{row.converted_amount?money(row.converted_amount,row.target_currency):'—'}</td><td>{row.requested_date||'—'}</td><td>{row.effective_rate_date||'—'}</td></tr>)}</Table>{!data.reconciliation.data.length&&<div className="table-empty">No conversions to reconcile yet.</div>}</Panel>}</>}</section>
}

export function PlacementsPage() {
  const token=useToken();const placements=useApiList('placements',token);const consultants=useApiList('consultants',token,100);const countries=useApiList('countries',token,100);const [form,setForm]=useState({external_id:'',consultant_id:'',placement_date:today(),client:'',country_id:''});const [error,setError]=useState('');const [notice,setNotice]=useState('');const [saving,setSaving]=useState(false);const byId=Object.fromEntries(consultants.data.map(person=>[person.id,person]));const countryById=Object.fromEntries(countries.data.map(country=>[country.id,country]))
  async function submit(event){event.preventDefault();setSaving(true);setError('');setNotice('');const body={external_id:form.external_id.trim(),consultant_id:form.consultant_id,placement_date:form.placement_date,...(form.client.trim()?{client:form.client.trim()}:{}),...(form.country_id?{country_id:form.country_id}:{})};try{await apiRequest('placements',{method:'POST',token,body});setNotice('Placement created.');setForm({...form,external_id:'',client:''});placements.refresh()}catch(err){setError(err.message)}finally{setSaving(false)}}
  return <section className="page-content"><Heading eyebrow="FINANCE" title="Placements"><span className="scope-chip scope-live"><span className="scope-dot"/>Live API data</span></Heading><Notice error={error} notice={notice}/><div className="management-grid"><section className="panel form-panel"><div className="panel-heading"><div><h2>Add a placement</h2><p>Assign a consultant to a placement date.</p></div></div><form className="record-form" onSubmit={submit}><label>Placement ID<input required value={form.external_id} onChange={e=>setForm({...form,external_id:e.target.value})}/></label><label>Consultant<select required value={form.consultant_id} onChange={e=>setForm({...form,consultant_id:e.target.value})}><option value="">Select consultant</option>{consultants.data.map(person=><option key={person.id} value={person.id}>{person.name} ({person.external_id})</option>)}</select></label><label>Placement date<input type="date" required value={form.placement_date} onChange={e=>setForm({...form,placement_date:e.target.value})}/></label><label>Client (optional)<input maxLength="200" value={form.client} onChange={e=>setForm({...form,client:e.target.value})}/></label><label>Country (optional)<select value={form.country_id} onChange={e=>setForm({...form,country_id:e.target.value})}><option value="">No specific country</option>{countries.data.map(country=><option key={country.id} value={country.id}>{country.name}</option>)}</select></label><div className="form-actions"><button className="primary-button" disabled={saving||consultants.loading||!consultants.data.length}>{saving?'Saving…':'Create placement'}</button></div></form></section><Panel title="Placement records" detail={`${placements.pagination.total} total`} action={<button className="secondary-action" onClick={placements.refresh} disabled={placements.loading}>Refresh</button>}><ListResult list={placements} title="Could not load placements" columns={['Placement ID','Consultant','Date','Client','Country']}>{placements.data.map(row=><tr key={row.id}><td className="primary-cell">{row.external_id}</td><td>{byId[row.consultant_id]?.name||'—'}</td><td>{row.placement_date}</td><td>{row.client||'—'}</td><td>{countryById[row.country_id]?.name||'—'}</td></tr>)}</ListResult></Panel></div></section>
}
