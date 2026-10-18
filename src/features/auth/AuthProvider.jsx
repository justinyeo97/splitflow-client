import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { apiRequest, setUnauthorizedHandler } from '../../api/client.js'
import { supabase } from '../../api/supabase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    if (!supabase) {
      setAuthError('Sign-in is not configured. Set the public Supabase URL and anon key in the frontend environment.')
      setLoading(false)
      return undefined
    }
    let active = true
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) { setSession(nextSession); setLoading(false) }
    })
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) setAuthError(error.message)
      setSession(data.session)
      setLoading(false)
    })
    setUnauthorizedHandler(() => { supabase.auth.signOut(); setSession(null) })
    return () => { active = false; listener.subscription.unsubscribe(); setUnauthorizedHandler(undefined) }
  }, [])

  async function signIn(email, password) {
    const result = await apiRequest('auth/login', { method: 'POST', body: { email, password } })
    if (!result?.data?.session) throw new Error('The API did not return a sign-in session.')
    const { error } = await supabase.auth.setSession({ access_token: result.data.session.access_token, refresh_token: result.data.session.refresh_token })
    if (error) throw error
  }

  async function signUp(email, password) {
    const result = await apiRequest('auth/signup', { method: 'POST', body: { email, password } })
    if (result?.data?.session) {
      const { error } = await supabase.auth.setSession({ access_token: result.data.session.access_token, refresh_token: result.data.session.refresh_token })
      if (error) throw error
      return { confirmationRequired: false }
    }
    return { confirmationRequired: true }
  }

  async function signInWithGoogle() {
    const redirectTo = `${window.location.origin}/auth/callback`
    const result = await apiRequest(`auth/google?redirect_to=${encodeURIComponent(redirectTo)}`)
    if (!result?.data?.url) throw new Error('The API did not return a Google sign-in URL.')
    window.location.assign(result.data.url)
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut()
    setSession(null)
  }

  const value = useMemo(() => ({ session, user: session?.user || null, loading, authError, signIn, signUp, signInWithGoogle, signOut }), [session, loading, authError])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
