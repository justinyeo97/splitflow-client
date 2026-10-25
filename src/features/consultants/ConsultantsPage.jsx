import ProximityHeading from '../../components/ProximityHeading.jsx'
import { useState } from 'react'
import { apiRequest } from '../../api/client.js'
import { ErrorState, LoadingState } from '../../components/States.jsx'
import { useApiList } from '../../hooks/useApiList.js'
import { useAuth } from '../auth/AuthProvider.jsx'
import { expenseCurrencies, money } from '../operations/operationsUi.jsx'

const emptyConsultant = {email:'', employment_start_date: new Date().toISOString().slice(0,10), employment_end_date:'', name: '', job_title: '', annual_salary: '', salary_currency: 'USD', salary_effective_from: new Date().toISOString().slice(0, 10), country_id: '', country_effective_from: new Date().toISOString().slice(0, 10), active: true }

export default function ConsultantsPage() {
  const { session, profile } = useAuth()
  const token = session?.access_token
  const invitationEnabled=Boolean(profile?.invitations_enabled)
  const canInvite=profile?.role==='administrator'
  const consultants = useApiList('consultants', token)
  const countries = useApiList('countries', token, 100)
  const [form, setForm] = useState(emptyConsultant)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const [historyId, setHistoryId] = useState(null)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')

  function beginEdit(person) {
    setEditing(person.id)
    setForm({ email:person.email||'', employment_start_date:person.employment_start_date||person.salary_effective_from||person.country_effective_from, employment_end_date:person.employment_end_date||'', name: person.name, job_title: person.job_title || '', annual_salary: person.annual_salary == null ? '' : String(person.annual_salary), salary_currency: person.salary_currency || 'USD', salary_effective_from: person.salary_effective_from || new Date().toISOString().slice(0, 10), country_id: person.country_id, country_effective_from: person.country_effective_from || new Date().toISOString().slice(0, 10), active: person.active })
    setFormError(''); setNotice('')
  }
  function cancelEdit() { setEditing(null); setForm(emptyConsultant); setFormError('') }

  async function submit(event) {
    event.preventDefault(); setSaving(true); setFormError(''); setNotice('')
    const payload = { ...form, name: form.name.trim(), job_title: form.job_title.trim(), annual_salary: String(form.annual_salary) }
    if(invitationEnabled&&canInvite) payload.email=form.email.trim().toLowerCase()||null
    else delete payload.email
    if (profile?.company) payload.employment_end_date=form.employment_end_date||null
    else { delete payload.employment_start_date; delete payload.employment_end_date }
    try {
      await apiRequest(editing ? `consultants/${editing}` : 'consultants', { method: editing ? 'PATCH' : 'POST', token, body: payload })
      setNotice(editing ? 'Consultant updated.' : 'Consultant created.')
      cancelEdit(); consultants.refresh()
    } catch (err) { setFormError(err.message || 'The consultant could not be saved.') }
    finally { setSaving(false) }
  }

  async function toggleHistory(personId) {
    if (historyId === personId) { setHistoryId(null); return }
    setHistoryId(personId); setHistory([]); setHistoryError(''); setHistoryLoading(true)
    try { const result = await apiRequest(`consultants/${personId}/country-history`, { token }); setHistory(result?.data || []) }
    catch (err) { setHistoryError(err.message || 'Could not load country history.') }
    finally { setHistoryLoading(false) }
  }

  return <section className="page-content">
    <div className="page-heading"><div><p className="eyebrow">DIRECTORY</p><ProximityHeading as="h1">Consultants</ProximityHeading></div><span className="scope-chip scope-live"><span className="scope-dot" /> Live API data</span></div>
    <p className="page-lede">Country assignments are effective-dated. Expenses retain attribution based on the consultant’s assigned country on the transaction date.</p>
    {notice && <div className="inline-notice" role="status">{notice}</div>}
    <div className="management-grid">
      <section className="panel form-panel"><div className="panel-heading"><div><ProximityHeading as="h2">{editing ? 'Edit consultant' : 'Add a consultant'}</ProximityHeading><p>Set the country assignment start date.</p></div></div>
        {formError && <div className="inline-error" role="alert">{formError}</div>}
        {countries.error && <div className="inline-error" role="alert">Could not load countries: {countries.error.message}</div>}
        <form className="record-form" onSubmit={submit}>
          <p className="form-footnote">Consultant ID is generated automatically when you create a consultant.</p>
          <label>Full name<input required maxLength={200} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Consultant name" /></label>
          {invitationEnabled&&<><label>Login email (optional)<input type="email" maxLength={254} disabled={!canInvite} value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="consultant@example.com" /></label><p className="form-footnote">An administrator adding this email invites its verified owner to this company. They can view only their own expenses. Changing or removing it revokes the previous consultant login.</p></>}
          <label>Job title<input required maxLength={200} value={form.job_title} onChange={e => setForm({ ...form, job_title: e.target.value })} placeholder="e.g. Recruitment Consultant" /></label>
          <div className="form-row">
            <label>Annual base salary<input type="number" required min="0" step="0.01" value={form.annual_salary} onChange={e => setForm({ ...form, annual_salary: e.target.value })} /></label>
            <label>Salary currency<select required value={form.salary_currency} onChange={e => setForm({ ...form, salary_currency: e.target.value })}>{[...new Set([...expenseCurrencies, form.salary_currency])].sort().map(currency => <option key={currency} value={currency}>{currency}</option>)}</select></label>
          </div>
          <label>Salary effective from<input type="date" required value={form.salary_effective_from} onChange={e => setForm({ ...form, salary_effective_from: e.target.value })} /></label>
          <p className="form-footnote">Annual base pay excludes bonuses, benefits and employer contributions. Monthly cost is annual salary ÷ 12; quarterly cost is annual salary ÷ 4. {profile?.company?'ROI includes salary accrued through today, prorated by calendar days.':'Salary costs will be included in ROI in a future update.'}</p>
          <label>Country assignment<select required value={form.country_id} onChange={e => setForm({ ...form, country_id: e.target.value })}><option value="">Select country</option>{countries.data.map(country => <option key={country.id} value={country.id}>{country.name} ({country.iso_code.trim()})</option>)}</select></label>
          <label>Assignment effective from<input type="date" required value={form.country_effective_from} onChange={e => setForm({ ...form, country_effective_from: e.target.value })} /></label>
          {profile?.company&&<><label>Employment start<input type="date" required value={form.employment_start_date} onChange={e=>setForm({...form,employment_start_date:e.target.value})} /></label><label>Employment end (optional)<input type="date" min={form.employment_start_date} value={form.employment_end_date} onChange={e=>setForm({...form,employment_end_date:e.target.value})} /></label><p className="form-footnote">Salary changes require a later effective date and preserve earlier pay. Employment dates determine payroll accrual; Active controls the current directory status.</p></>}
          <label className="checkbox-label"><input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} /> Active consultant</label>
          <div className="form-actions">{editing && <button type="button" className="secondary-action" onClick={cancelEdit} disabled={saving}>Cancel</button>}<button className="primary-button" type="submit" disabled={saving || countries.loading || countries.data.length === 0}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create consultant'}</button></div>
          <p className="form-footnote">A new country assignment affects expenses from its effective date onward. Past expense attribution is not reallocated.</p>
        </form>
      </section>
      <section className="panel table-panel"><div className="panel-heading"><div><ProximityHeading as="h2">Consultant directory</ProximityHeading><p>{consultants.pagination.total} total</p></div><button className="secondary-action" onClick={consultants.refresh} disabled={consultants.loading}>Refresh</button></div>
        {consultants.error ? <ErrorState title={consultants.error.status === 403 ? 'Access denied' : 'Could not load consultants'} message={consultants.error.message} onRetry={consultants.refresh} /> : consultants.loading ? <LoadingState label="Loading consultants…" /> : consultants.data.length === 0 ? <div className="table-empty">No consultants have been added yet.</div> : <div className="table-scroll"><table><thead><tr><th>Consultant</th><th>ID</th><th>Email</th><th>Job title</th><th>Annual base salary</th><th>Salary effective from</th><th>Country</th><th>Status</th><th>History</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{consultants.data.map(person => <ConsultantRows key={person.id} person={person} historyId={historyId} history={history} historyLoading={historyLoading} historyError={historyError} onHistory={toggleHistory} onEdit={beginEdit} />)}</tbody></table></div>}
        <Pagination pagination={consultants.pagination} offset={consultants.offset} setOffset={consultants.setOffset} loading={consultants.loading} />
      </section>
    </div>
  </section>
}

function ConsultantRows({ person, historyId, history, historyLoading, historyError, onHistory, onEdit }) {
  return <>
    <tr><td className="primary-cell">{person.name}</td><td><span className="code-pill">{person.external_id}</span></td><td>{person.email||'Not set'}</td><td>{person.job_title || 'Not set'}</td><td>{person.annual_salary == null ? 'Not set' : money(person.annual_salary, person.salary_currency)}</td><td>{person.salary_effective_from || 'Not set'}</td><td>{person.countries?.name || '—'} <span className="muted-cell">{person.countries?.iso_code || ''}</span></td><td><span className={`status-pill ${person.active ? 'status-active' : 'status-inactive'}`}>{person.active ? 'Active' : 'Inactive'}</span></td><td><button className="row-action" onClick={() => onHistory(person.id)}>{historyId === person.id ? 'Hide' : 'View'}</button></td><td><button className="row-action" onClick={() => onEdit(person)}>Edit</button></td></tr>
    {historyId === person.id && <tr className="history-row"><td colSpan="10">{historyLoading ? <LoadingState label="Loading assignment history…" /> : historyError ? <span className="inline-error">{historyError}</span> : history.length === 0 ? <span>No assignment history found.</span> : <div className="history-list">{history.map(item => <div key={item.id}><strong>{item.countries?.name || 'Country'}</strong><span>From {item.effective_from}{item.effective_to ? ` to ${item.effective_to}` : ' · current'}</span></div>)}</div>}</td></tr>}
  </>
}

function Pagination({ pagination, offset, setOffset, loading }) {
  if (!pagination.total || pagination.total <= pagination.limit) return null
  return <div className="pagination"><span>{offset + 1}–{Math.min(offset + pagination.limit, pagination.total)} of {pagination.total}</span><div><button disabled={loading || offset === 0} onClick={() => setOffset(Math.max(0, offset - pagination.limit))}>Previous</button><button disabled={loading || offset + pagination.limit >= pagination.total} onClick={() => setOffset(offset + pagination.limit)}>Next</button></div></div>
}
