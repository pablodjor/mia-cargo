import { Navigate, Outlet } from 'react-router-dom'
import { PageLoader } from '@/components/ui/PageLoader'
import { useAuth } from '@/contexts/AuthContext'
import { getHomePath } from '@/constants/navigation'

export function PublicOnlyRoute() {
  const { session, loading } = useAuth()

  if (loading) {
    return <PageLoader fullScreen label="Cargando…" />
  }

  if (session) {
    return <Navigate to={getHomePath(session.role)} replace />
  }

  return <Outlet />
}
