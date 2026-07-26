import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { PageLoader } from '@/components/ui/PageLoader'
import { useAuth } from '@/contexts/AuthContext'
import { canAccess, getHomePath } from '@/constants/navigation'
import type { UserRole } from '@/types'

export function ProtectedRoute({ roles }: { roles?: UserRole[] }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <PageLoader fullScreen label="Iniciando sesión…" />
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (roles && !roles.includes(session.role)) {
    return <Navigate to={getHomePath(session.role)} replace />
  }

  if (!canAccess(location.pathname, session.role) && session.role !== 'admin') {
    return <Navigate to={getHomePath(session.role)} replace />
  }

  return <Outlet />
}
