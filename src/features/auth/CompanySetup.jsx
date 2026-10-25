import { useState } from 'react'
import { useAuth } from './AuthProvider.jsx'

export default function CompanySetup() {
  const { saveCompany, signOut } = useAuth()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event) {
    event.preventDefault()
    if (!name.trim()) { setError('Enter your company name.'); return }
    setBusy(true); setError('')
    try { await saveCompany(name) } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <main className="auth-page"><div className="auth-panel">
    <p className="eyebrow">YOUR WORKSPACE</p><h1>Which company do you manage?</h1>
    <p className="auth-intro">Add your company name to complete your account.</p>
    {error && <div className="auth-alert" role="alert">{error}</div>}
    <form className="auth-form" onSubmit={submit}>
      <label>Company name<input autoComplete="organization" required maxLength={200} value={name} onChange={e => setName(e.target.value)} /></label>
      <button className="primary-button" disabled={busy}>{busy ? 'Saving…' : 'Continue to workspace'}</button>
    </form>
    <button className="text-button" onClick={signOut} disabled={busy}>Sign out</button>
  </div></main>
}
