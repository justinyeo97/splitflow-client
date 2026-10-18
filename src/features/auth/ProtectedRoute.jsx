import { Navigate, Outlet } from 'react-router-dom'
import { LoadingState } from '../../components/States.jsx'
import { useAuth } from './AuthProvider.jsx'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) return <div className="auth-loading"><LoadingState label="Restoring your session…" /></div>
  return user ? <Outlet /> : <Navigate to="/sign-in" replace />
}
