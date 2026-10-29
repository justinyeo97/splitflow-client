import ProximityHeading from '../../components/ProximityHeading.jsx'
import MyExpensesPage from './MyExpensesPage.jsx'
import { useAuth } from '../auth/AuthProvider.jsx'
import { useSearchParams } from 'react-router-dom'
import ExpenseImports from './ExpenseImports.jsx'
import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../api/client.js'
import { ErrorState, LoadingState } from '../../components/States.jsx'
import { useApiList } from '../../hooks/useApiList.js'
import { today, expenseCurrencies, expenseCategories, money, useToken, Heading, Notice, Table, Panel, ListResult } from './operationsUi.jsx'

export function DashboardPage() {
  const token = useToken()
  const recentExpenses = useApiList('expenses', token, 8)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [reload, setReload] = useState(0)
  useEffect(() => {
    let alive = true
    setLoading(true); setError('')
    Promise.all([
      apiRequest('reports/consolidated', { token }),
      apiRequest('conversions/exceptions', { token }).catch(err => err.status === 403 ? null : Promise.reject(err)),
    ]).then(([report, exceptions]) => {
      if (alive) setData({ report: report?.data, exceptions: exceptions?.data || null })
    }).catch(err => { if (alive) setError(err.message || 'Could not load dashboard data.') }).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [token, reload])
  const people = useApiList('consultants', token, 100)
  const countries = useApiList('countries', token, 100)
  const consultants = useMemo(() => Object.fromEntries(people.data.map(person => [person.id, person])), [people.data])
  const countryMap = useMemo(() => Object.fromEntries(countries.data.map(country => [country.id, country])), [countries.data])
  return <section className="page-content"><Heading eyebrow="REGIONAL COST ALLOCATION" title="Dashboard"><button className="secondary-action" onClick={() => { setReload(n => n + 1); recentExpenses.refresh() }} disabled={loading || recentExpenses.loading}>Refresh</button></Heading>
    {error && <ErrorState title="Could not load dashboard" message={error} onRetry={() => setReload(n => n + 1)} />}
    {loading ? <LoadingState /> : data && <>
      <div className="metric-grid"><article className="metric-card"><span>Recorded expenses</span><strong>{recentExpenses.pagination.total.toLocaleString()}</strong><small>All expenses visible to your account</small></article><article className="metric-card"><span>Recorded expense spend</span><strong>{money(data.report?.total, data.report?.currency || 'USD')}</strong><small>{data.report?.expense_count || 0} expenses included | {data.report?.unconverted_count || 0} awaiting a reporting rate</small></article><article className="metric-card"><span>Pending conversions</span><strong>{data.exceptions ? data.exceptions.length.toLocaleString() : '—'}</strong><small>{data.exceptions ? 'Requires finance access to retry' : 'Finance permission required to view'}</small></article><article className="metric-card"><span>Active consultants (first 100)</span><strong>{people.data.filter(person => person.active).length.toLocaleString()}</strong><small>{people.loading ? 'Loading directory…' : `${people.pagination.total} in directory`}</small></article></div>
      <Panel title="Recent expenses" detail="Latest records returned by the API"><ListResult preserveHeight list={recentExpenses} title="Recent expenses" columns={['Date','Consultant','Country','Category','Original amount']}>{recentExpenses.data.map(expense => { const consultant=consultants[expense.consultant_id]; const country=countryMap[expense.attributed_country_id]; return <tr key={expense.id}><td>{expense.transaction_date}</td><td>{consultant?.name || '—'}</td><td>{country?.name || '—'}</td><td>{expense.category}</td><td>{money(expense.original_amount, expense.original_currency)}</td></tr> })}</ListResult></Panel>
    </>}
  </section>
}

export function ExpensesPage() {
  const {profile}=useAuth()
  return profile?.role==='consultant'?<MyExpensesPage />:<ManagedExpensesPage />
}

function ManagedExpensesPage() {
  const token = useToken()
  const { profile } = useAuth()
  const payrollEnabled = Boolean(profile?.company)
  const canDelete = ['administrator', 'finance'].includes(profile?.role)
  const [deleting, setDeleting] = useState(null)
  const [searchParams] = useSearchParams()
  const [showImport, setShowImport] = useState(() => searchParams.get('import') === '1')
  useEffect(() => { if (searchParams.get('import') === '1') setShowImport(true) }, [searchParams])
  const [range, setRange] = useState({ from: '', to: '' })
  const [filters, setFilters] = useState({ from: '', to: '' })
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value)).toString()
  const expenses = useApiList(`expenses?${query}`, token)
  const [converting, setConverting] = useState(false)
  const consultants = useApiList('consultants', token, 100)
  const countries = useApiList('countries', token, 100)
  const [form, setForm] = useState({ consultant_id:'', transaction_date:today(), original_amount:'', original_currency:'USD', is_payroll:false, category:'Travel', vendor:'', description:'' })
  const [error,setError]=useState(''); const [notice,setNotice]=useState(''); const [saving,setSaving]=useState(false); const [editing,setEditing]=useState(null)
  const currencyOptions = [...new Set([...expenseCurrencies, form.original_currency])].sort()
  const categoryOptions = [...new Set([...expenseCategories, form.category])]
  const byId = Object.fromEntries(consultants.data.map(person=>[person.id,person]))
  const countryById = Object.fromEntries(countries.data.map(country=>[country.id,country]))
  const eligible = expenses.data.filter(expense => {
    const currency = countryById[expense.attributed_country_id]?.default_reporting_currency?.trim()
    return currency && !expense.expense_conversions?.some(item => item.target_currency.trim() === currency && item.status === 'finalized')
  })
  function applyFilters(event) {
    event.preventDefault()
    if (range.from && range.to && range.from > range.to) { setError('Start date must be on or before end date.'); return }
    setError(''); expenses.setOffset(0); setFilters({ ...range })
  }
  const [editingLocked, setEditingLocked] = useState(false)
  function editExpense(expense){setEditingLocked(Boolean(expense.expense_conversions?.some(item=>item.finalized_at)));setEditing(expense.id);setForm({consultant_id:expense.consultant_id,transaction_date:expense.transaction_date,original_amount:String(expense.original_amount),original_currency:expense.original_currency.trim(),is_payroll:Boolean(expense.is_payroll),category:expense.category,vendor:expense.vendor||'',description:expense.description||''});setError('');setNotice('')}
  function resetForm(){setEditingLocked(false);setEditing(null);setForm({consultant_id:'',transaction_date:today(),original_amount:'',original_currency:'USD',is_payroll:false,category:'Travel',vendor:'',description:''})}
  async function submit(event) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('')
    const body = {...form, original_amount:String(form.original_amount)}
    if (!payrollEnabled) delete body.is_payroll
    if (editingLocked) for (const key of ['consultant_id','transaction_date','original_amount','original_currency']) delete body[key]
    try {
      const result = await apiRequest(editing ? 'expenses/'+editing : 'expenses', {method:editing?'PATCH':'POST',token,body})
      setNotice(result.conversion?.status === 'finalized' ? 'Expense saved and converted automatically.' : 'Expense saved. Conversion is pending; retry from Conversions & exceptions.')
      resetForm(); expenses.refresh()
    } catch(err) { setError(err.message) } finally { setSaving(false) }
  }
  async function deleteExpense(expense) {
    if (!window.confirm(`Delete this ${money(expense.original_amount, expense.original_currency)} expense dated ${expense.transaction_date}? Its conversions will also be deleted and reports will change. This cannot be undone.`)) return
    setDeleting(expense.id); setError(''); setNotice('')
    try {
      await apiRequest(`expenses/${expense.id}`, { method: 'DELETE', token })
      if (editing === expense.id) resetForm()
      setNotice('Expense and its conversions deleted. Reports will reflect the removal.')
      if (expenses.data.length === 1 && expenses.offset > 0) expenses.setOffset(Math.max(0, expenses.offset - expenses.pagination.limit))
      else expenses.refresh()
    } catch (err) { setError(err.message) } finally { setDeleting(null) }
  }
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
  return <section className="page-content"><Heading eyebrow="WORKSPACE" title="Expenses"><button type="button" className="secondary-action" aria-expanded={showImport} aria-controls="expense-import" onClick={() => setShowImport(value => !value)}>{showImport ? 'Hide CSV import' : 'Import CSV'}</button></Heading><p className="page-lede">Expenses convert automatically to the country reporting currency using historical rates. Unavailable rates remain pending for retry.</p><Notice error={error} notice={notice}/>
    <div id="expense-import" hidden={!showImport}><ExpenseImports onImported={() => { expenses.setOffset(0); expenses.refresh() }} /></div>
    <div className="management-grid"><section className="panel form-panel"><div className="panel-heading"><div><ProximityHeading as="h2">Add an expense</ProximityHeading><p>Country attribution is determined by assignment on the transaction date.</p></div></div><form className="record-form" onSubmit={submit}>
      <label>Consultant<select required disabled={editingLocked} value={form.consultant_id} onChange={e=>setForm({...form,consultant_id:e.target.value})}><option value="">Select consultant</option>{consultants.data.map(person=><option key={person.id} value={person.id}>{person.name} ({person.external_id})</option>)}</select></label>
      <label>Transaction date<input type="date" required disabled={editingLocked} value={form.transaction_date} onChange={e=>setForm({...form,transaction_date:e.target.value})}/></label><div className="form-row"><label>Amount<input type="number" min="0" step="0.00000001" required disabled={editingLocked} value={form.original_amount} onChange={e=>setForm({...form,original_amount:e.target.value})}/></label><label>Currency<select required disabled={editingLocked} value={form.original_currency} onChange={e=>setForm({...form,original_currency:e.target.value})}>{currencyOptions.map(currency=><option key={currency} value={currency}>{currency}</option>)}</select></label></div>
      {editingLocked&&<p className="form-footnote">Conversion is finalized. Amount, currency, date and consultant are locked; category, vendor and description can still be edited.</p>}{payrollEnabled&&<label className="checkbox-label"><input type="checkbox" checked={Boolean(form.is_payroll)} onChange={e=>setForm({...form,is_payroll:e.target.checked})} /> Payroll already covered by salary history (excluded from ROI expenses)</label>}<label>Category<select required value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{categoryOptions.map(category=><option key={category} value={category}>{category}</option>)}</select></label><label>Vendor (optional)<input maxLength="200" value={form.vendor} onChange={e=>setForm({...form,vendor:e.target.value})}/></label><label>Description (optional)<input maxLength="1000" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
      <div className="form-actions">{editing&&<button type="button" className="secondary-action" disabled={saving} onClick={resetForm}>Cancel</button>}<button className="primary-button" disabled={saving||Boolean(deleting)||consultants.loading||consultants.data.length===0}>{saving?'Saving…':editing?'Save expense':'Create expense'}</button></div></form></section>
      <Panel title="Expense ledger" detail={`${expenses.pagination.total} total`} action={<button className="secondary-action" onClick={expenses.refresh} disabled={expenses.loading}>Refresh</button>}><form className="expense-toolbar" onSubmit={applyFilters}><label>From<input type="date" value={range.from} onChange={e=>setRange({...range,from:e.target.value})} disabled={converting}/></label><label>Through<input type="date" value={range.to} onChange={e=>setRange({...range,to:e.target.value})} disabled={converting}/></label><button className="secondary-action" disabled={converting}>Apply dates</button><button type="button" className="secondary-action" disabled={converting} onClick={()=>{setRange({from:'',to:''});setFilters({from:'',to:''});expenses.setOffset(0)}}>Clear</button></form><ListResult list={expenses} title="Could not load expenses" columns={['Date','Consultant','Country','Category','Original amount','Conversion','Actions']}>{expenses.data.map(expense=>{const person=byId[expense.consultant_id];const country=countryById[expense.attributed_country_id];const conversion=expense.expense_conversions?.find(c=>c.target_currency===country?.default_reporting_currency?.trim());return <tr key={expense.id}><td>{expense.transaction_date}</td><td>{person?.name||'—'}</td><td>{country?.name||'—'}</td><td>{expense.category}</td><td>{money(expense.original_amount,expense.original_currency)}</td><td>{conversion?.status==='finalized'?money(conversion.converted_amount,conversion.target_currency):conversion?.status||'Awaiting conversion'}</td><td><button className="row-action" disabled={saving||converting||Boolean(deleting)} onClick={()=>editExpense(expense)}>Edit</button> {canDelete&&<button type="button" className="row-action" disabled={saving||converting||Boolean(deleting)} onClick={()=>deleteExpense(expense)}>{deleting===expense.id?'Deleting...':'Delete'}</button>} {eligible.some(item=>item.id===expense.id)&&<button className="row-action" onClick={()=>convert(expense)} disabled={converting||saving||Boolean(deleting)||!country}>{converting?'Retrying...':'Retry conversion'}</button>}</td></tr>})}</ListResult></Panel></div>
    {consultants.error&&<p className="permission-note">Consultant list unavailable: {consultants.error.message}</p>}
  </section>
}

export function ConversionsPage() {
  const token=useToken();const [items,setItems]=useState([]);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [busyId,setBusyId]=useState('');const [notice,setNotice]=useState('');const [reload,setReload]=useState(0)
  useEffect(()=>{let alive=true;setLoading(true);setError('');apiRequest('conversions/exceptions',{token}).then(result=>{if(alive)setItems(result?.data||[])}).catch(err=>{if(alive)setError(err.message)}).finally(()=>{if(alive)setLoading(false)});return()=>{alive=false}},[token,reload])
  async function retry(id){setBusyId(id);setError('');setNotice('');try{const result=await apiRequest(`conversions/${id}/retry`,{method:'POST',token});setNotice(result?.data?.status==='pending'?'No historical rate is available yet; conversion remains pending.':'Conversion finalized.');setReload(n=>n+1)}catch(err){setError(err.message)}finally{setBusyId('')}}
  return <section className="page-content"><Heading eyebrow="FINANCE" title="Conversions & exceptions"><button className="secondary-action" onClick={()=>setReload(n=>n+1)} disabled={loading}>Refresh</button></Heading><p className="page-lede">Pending historical currency conversions returned by the finance API.</p><Notice error={error} notice={notice}/>{loading?<LoadingState />:error?<ErrorState title="Could not load exceptions" message={error} onRetry={()=>setReload(n=>n+1)}/>:<Panel title="Pending exceptions" detail={`${items.length} pending`}>{items.length===0?<div className="table-empty">No pending conversion exceptions.</div>:<Table columns={['Expense','Date','Currency pair','Amount','Reason','Action']}>{items.map(item=><tr key={item.id}><td>{item.expenses?.description||item.expenses?.vendor||item.expense_id}</td><td>{item.expenses?.transaction_date||'—'}</td><td>{item.expenses?.original_currency} → {item.target_currency}</td><td>{money(item.expenses?.original_amount,item.expenses?.original_currency)}</td><td>{item.error_metadata?.[0]?.message||item.error_metadata?.reason||'Rate unavailable'}</td><td><button className="row-action" disabled={busyId===item.id} onClick={()=>retry(item.id)}>{busyId===item.id?'Retrying…':'Retry'}</button></td></tr>)}</Table>}</Panel>}</section>
}

export { default as ReportsPage } from './ReportsPage.jsx'

export { default as PlacementsPage } from './PlacementsPage.jsx'
