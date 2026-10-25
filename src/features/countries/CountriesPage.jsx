import ProximityHeading from '../../components/ProximityHeading.jsx'
import { useState } from 'react'
import { apiRequest } from '../../api/client.js'
import { ErrorState, LoadingState } from '../../components/States.jsx'
import { useApiList } from '../../hooks/useApiList.js'
import { useAuth } from '../auth/AuthProvider.jsx'

const blank = { name: '', iso_code: '', default_reporting_currency: '' }

export default function CountriesPage() {
  const { session } = useAuth()
  const token = session?.access_token
  const { data, pagination, loading, error, refresh, offset, setOffset } = useApiList('countries', token)
  const [form, setForm] = useState(blank)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')

  function beginEdit(country) {
    setEditing(country.id)
    setForm({ name: country.name, iso_code: country.iso_code.trim(), default_reporting_currency: country.default_reporting_currency.trim() })
    setFormError(''); setNotice('')
  }

  function cancelEdit() { setEditing(null); setForm(blank); setFormError('') }

  async function submit(event) {
    event.preventDefault(); setSaving(true); setFormError(''); setNotice('')
    const payload = { name: form.name.trim(), iso_code: form.iso_code.trim().toUpperCase(), default_reporting_currency: form.default_reporting_currency.trim().toUpperCase() }
    try {
      await apiRequest(editing ? `countries/${editing}` : 'countries', { method: editing ? 'PATCH' : 'POST', token, body: payload })
      setNotice(editing ? 'Country updated.' : 'Country created.')
      cancelEdit(); refresh()
    } catch (err) { setFormError(err.message || 'The country could not be saved.') }
    finally { setSaving(false) }
  }

  return <section className="page-content">
    <div className="page-heading"><div><p className="eyebrow">DIRECTORY</p><ProximityHeading as="h1">Countries</ProximityHeading></div><span className="scope-chip scope-live"><span className="scope-dot" /> Live API data</span></div>
    <p className="page-lede">Reporting currency is configured per country and used by the backend’s country cost report.</p>
    {notice && <div className="inline-notice" role="status">{notice}</div>}
    <div className="management-grid">
      <section className="panel form-panel"><div className="panel-heading"><div><ProximityHeading as="h2">{editing ? 'Edit country' : 'Add a country'}</ProximityHeading><p>ISO code and default reporting currency are required.</p></div></div>
        {formError && <div className="inline-error" role="alert">{formError}</div>}
        <form className="record-form" onSubmit={submit}>
          <label>Country name<input required maxLength={120} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Malaysia" /></label>
          <div className="form-row"><label>ISO 3166-1 alpha-2<input required minLength={2} maxLength={2} value={form.iso_code} onChange={e => setForm({ ...form, iso_code: e.target.value.toUpperCase() })} placeholder="MY" /></label><label>Reporting currency<input required minLength={3} maxLength={3} value={form.default_reporting_currency} onChange={e => setForm({ ...form, default_reporting_currency: e.target.value.toUpperCase() })} placeholder="MYR" /></label></div>
          <div className="form-actions">{editing && <button type="button" className="secondary-action" onClick={cancelEdit} disabled={saving}>Cancel</button>}<button className="primary-button" type="submit" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create country'}</button></div>
          <p className="form-footnote">Country changes affect reporting configuration. Existing expenses keep their stored country attribution.</p>
        </form>
      </section>
      <section className="panel table-panel"><div className="panel-heading"><div><ProximityHeading as="h2">Configured countries</ProximityHeading><p>{pagination.total} total</p></div><button className="secondary-action" onClick={refresh} disabled={loading}>Refresh</button></div>
        {error ? <ErrorState title={error.status === 403 ? 'Administrator access required' : 'Could not load countries'} message={error.message} onRetry={refresh} /> : loading ? <LoadingState label="Loading countries…" /> : data.length === 0 ? <div className="table-empty">No countries are configured yet.</div> : <div className="table-scroll"><table><thead><tr><th>Country</th><th>ISO code</th><th>Reporting currency</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{data.map(country => <tr key={country.id}><td className="primary-cell">{country.name}</td><td><span className="code-pill">{country.iso_code.trim()}</span></td><td className="currency-cell">{country.default_reporting_currency.trim()}</td><td><button className="row-action" onClick={() => beginEdit(country)}>Edit</button></td></tr>)}</tbody></table></div>}
        <Pagination pagination={pagination} offset={offset} setOffset={setOffset} loading={loading} />
      </section>
    </div>
    <p className="permission-note">The API permits country changes for administrators. If your role cannot manage countries, the server will return an access-denied response.</p>
  </section>
}

function Pagination({ pagination, offset, setOffset, loading }) {
  if (!pagination.total || pagination.total <= pagination.limit) return null
  const start = offset + 1
  const end = Math.min(offset + pagination.limit, pagination.total)
  return <div className="pagination"><span>{start}–{end} of {pagination.total}</span><div><button disabled={loading || offset === 0} onClick={() => setOffset(Math.max(0, offset - pagination.limit))}>Previous</button><button disabled={loading || offset + pagination.limit >= pagination.total} onClick={() => setOffset(offset + pagination.limit)}>Next</button></div></div>
}
