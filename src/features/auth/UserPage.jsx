import ProximityHeading from '../../components/ProximityHeading.jsx'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from './AuthProvider.jsx'
import { expenseCurrencies } from '../operations/operationsUi.jsx'

function dateLabel(value) {
  if (!value || Number.isNaN(Date.parse(value))) return 'Not available'
  return new Intl.DateTimeFormat('en-MY', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kuala_Lumpur' }).format(new Date(value))
}

export default function UserPage() {
  const { user, profile } = useAuth()
  const name = user?.user_metadata?.full_name || user?.user_metadata?.name
  const role = { administrator: 'Administrator', finance: 'Finance', viewer: 'Viewer', consultant:'Consultant' }[profile?.role] || profile?.role || 'Not available'
  return <section className="page-content">
    <div className="page-heading"><div><p className="eyebrow">ACCOUNT</p><ProximityHeading as="h1">My account</ProximityHeading></div></div>
    <p className="page-lede">Your user profile and the company you manage.</p>
    {profile?.invitations_enabled&&<p><Link to="/companies">Choose an invited company</Link></p>}<div className="account-details-grid">
      <section className="panel" aria-labelledby="user-details-title">
        <div className="panel-heading"><div><ProximityHeading as="h2" id="user-details-title">User details</ProximityHeading><p>Your signed-in account.</p></div></div>
        <dl className="account-details">
          <div><dt>Name</dt><dd>{name || 'Not provided'}</dd></div>
          <div><dt>Email address</dt><dd>{profile?.email || user?.email || 'Not provided'}</dd></div>
          <div><dt>Role</dt><dd>{role}</dd></div>
          <div><dt>Email verification</dt><dd>{user?.email_confirmed_at ? 'Verified' : 'Not verified'}</dd></div>
          <div><dt>Account created</dt><dd>{dateLabel(user?.created_at)}</dd></div>
          <div><dt>Last sign-in</dt><dd>{dateLabel(user?.last_sign_in_at)}</dd></div>
        </dl>
      </section>
      <section className="panel" aria-labelledby="company-details-title">
        <div className="panel-heading"><div><ProximityHeading as="h2" id="company-details-title">Company details</ProximityHeading><p>The company associated with your account.</p></div></div>
        {profile?.company ? <CompanySettings /> : <dl className="account-details"><div><dt>Company name</dt><dd>{profile?.company_name || 'Not provided'}</dd></div></dl>}
      </section>
    </div>
  </section>
}

function CompanySettings() {
  const { profile, saveCompanySettings } = useAuth()
  const [name, setName] = useState(profile.company.name)
  const [currency, setCurrency] = useState(profile.company.home_currency)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  useEffect(() => { setName(profile.company.name); setCurrency(profile.company.home_currency) }, [profile.company])
  const admin = profile.role === 'administrator'
  async function submit(event) {
    event.preventDefault(); setError(''); setNotice(''); setBusy(true)
    try { await saveCompanySettings({name:name.trim(),home_currency:currency}); setNotice('Company settings saved. Reports will use this currency.') }
    catch(err) { setError(err.message) } finally { setBusy(false) }
  }
  return <form className="record-form company-settings" onSubmit={submit}>
    {error&&<div className="inline-error" role="alert">{error}</div>}
    {notice&&<div className="inline-notice" role="status">{notice}</div>}
    <label>Company name<input required maxLength={200} value={name} disabled={!admin||busy} onChange={e=>setName(e.target.value)} /></label>
    <label>Headquarters reporting currency<select value={currency} disabled={!admin||busy} onChange={e=>setCurrency(e.target.value)}>{[...new Set([...expenseCurrencies,currency])].sort().map(code=><option key={code} value={code}>{code}</option>)}</select></label>
    <p className="form-footnote">Country expense conversions retain each country's reporting currency. Consolidated reports use this home currency.</p>
    <p className="form-footnote">Reporting timezone: {profile.company.reporting_timezone}. Periods follow calendar months, quarters and years.</p>
    {admin&&<div className="form-actions"><button className="primary-button" disabled={busy||!name.trim()}>{busy?'Saving...':'Save company settings'}</button></div>}
  </form>
}
