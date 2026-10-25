import { useAuth } from './AuthProvider.jsx'

function dateLabel(value) {
  if (!value || Number.isNaN(Date.parse(value))) return 'Not available'
  return new Intl.DateTimeFormat('en-MY', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kuala_Lumpur' }).format(new Date(value))
}

export default function UserPage() {
  const { user, profile } = useAuth()
  const name = user?.user_metadata?.full_name || user?.user_metadata?.name
  const role = { administrator: 'Administrator', finance: 'Finance', viewer: 'Viewer' }[profile?.role] || profile?.role || 'Not available'
  return <section className="page-content">
    <div className="page-heading"><div><p className="eyebrow">ACCOUNT</p><h1>My account</h1></div></div>
    <p className="page-lede">Your user profile and the company you manage.</p>
    <div className="account-details-grid">
      <section className="panel" aria-labelledby="user-details-title">
        <div className="panel-heading"><div><h2 id="user-details-title">User details</h2><p>Your signed-in account.</p></div></div>
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
        <div className="panel-heading"><div><h2 id="company-details-title">Company details</h2><p>The company associated with your account.</p></div></div>
        <dl className="account-details"><div><dt>Company name</dt><dd>{profile?.company_name || 'Not provided'}</dd></div></dl>
      </section>
    </div>
  </section>
}
