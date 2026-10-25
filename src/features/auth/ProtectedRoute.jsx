import { Navigate, Outlet } from 'react-router-dom'
import { ErrorState, LoadingState } from '../../components/States.jsx'
import { useAuth } from './AuthProvider.jsx'
import CompanySetup from './CompanySetup.jsx'

export default function ProtectedRoute() {
  const { user, loading, profile, profileError, refreshProfile, signOut } = useAuth()
  if (loading) return <div className="auth-loading"><LoadingState label="Restoring your session…" /></div>
  if (!user) return <Navigate to="/sign-in" replace />
  if (profileError) return <div className="auth-loading"><ErrorState title="Could not load your company" message={profileError} onRetry={refreshProfile} /><button className="secondary-button" onClick={signOut}>Sign out</button></div>
  if (!profile || profile.id !== user.id) return <div className="auth-loading"><LoadingState label="Loading your workspace…" /></div>
  if (!profile.company_name) return <CompanySetup />
  return <Outlet />
}
