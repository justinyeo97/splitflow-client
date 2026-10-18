import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthProvider.jsx'

export default function SignInPage() {
  const { signIn, signUp, signInWithGoogle, authError } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault(); setError(''); setNotice(''); setBusy(true)
    try {
      if (mode === 'login') { await signIn(email, password); navigate('/', { replace: true }) }
      else {
        const result = await signUp(email, password)
        if (result.confirmationRequired) setNotice('Account created. Confirm your email, then return here to sign in.')
        else navigate('/', { replace: true })
      }
    } catch (err) { setError(err.message || 'Unable to complete sign-in. Please try again.') }
    finally { setBusy(false) }
  }

  async function google() {
    setError(''); setBusy(true)
    try { await signInWithGoogle() } catch (err) { setError(err.message || 'Google sign-in is unavailable.') ; setBusy(false) }
  }

  return <main className="auth-page"><div className="auth-panel"><a className="brand auth-brand" href="/"><span className="brand-mark">S</span><span className="brand-name">splitflow<span>.</span><small>FINANCE OPERATIONS</small></span></a><p className="eyebrow">REGIONAL COST ALLOCATION</p><h1>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1><p className="auth-intro">Sign in to your Splitflow finance workspace.</p>
    {authError && <div className="auth-alert" role="alert">{authError}</div>}{error && <div className="auth-alert" role="alert">{error}</div>}{notice && <div className="auth-notice" role="status">{notice}</div>}
    <form onSubmit={submit} className="auth-form"><label>Email address<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} /></label><label>Password<input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={8} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} /></label><button className="primary-button" type="submit" disabled={busy || Boolean(authError)}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button></form>
    <div className="auth-divider"><span>or</span></div><button className="secondary-button" onClick={google} disabled={busy || Boolean(authError)}><span className="google-mark">G</span>Continue with Google</button><p className="auth-switch">{mode === 'login' ? 'New to Splitflow?' : 'Already have an account?'} <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setNotice('') }}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button></p><Link className="auth-back" to="/">Back to workspace</Link>
    </div><p className="auth-tagline">Centralized costs. Transparent allocations. Consolidated reporting.</p></main>
}
