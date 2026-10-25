import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { ErrorState, LoadingState } from '../../components/States.jsx'
import { useAuth } from './AuthProvider.jsx'
import CompanySetup from './CompanySetup.jsx'

export default function ProtectedRoute() {
  const { pathname } = useLocation()
  const { user, loading, profile, profileError, refreshProfile, signOut } = useAuth()
  if (loading) return <div className="auth-loading"><LoadingState label="Restoring your session…" /></div>
  if (!user) return <Navigate to="/sign-in" replace />
  if (profileError) return <div className="auth-loading"><ErrorState title="Could not load your company" message={profileError} onRetry={refreshProfile} /><button className="secondary-button" onClick={signOut}>Sign out</button></div>
  if (!profile || profile.id !== user.id) return <div className="auth-loading"><LoadingState label="Loading your workspace…" /></div>
  if (profile.role==='unassigned' || !profile.company_name) return <CompanySetup />
  if(profile.role==='consultant'&&!['/expenses','/account','/companies'].includes(pathname)) return <Navigate to="/expenses" replace />
  return <Outlet />
}
