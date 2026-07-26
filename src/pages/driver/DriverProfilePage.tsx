import { Card } from '@/components/ui/Card'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_LABELS } from '@/constants/labels'

export default function DriverProfilePage() {
  const { session } = useAuth()
  return <div className="space-y-4 p-4"><h1 className="text-2xl font-bold">Mi perfil</h1><Card><dl className="space-y-3"><div><dt className="text-sm text-text-secondary">Nombre</dt><dd className="font-medium">{session?.name ?? 'Sin sesión'}</dd></div><div><dt className="text-sm text-text-secondary">Correo</dt><dd>{session?.email ?? '—'}</dd></div><div><dt className="text-sm text-text-secondary">Rol</dt><dd>{session ? ROLE_LABELS[session.role] : '—'}</dd></div><div><dt className="text-sm text-text-secondary">ID de chofer</dt><dd>{session?.driverId ?? 'No asociado'}</dd></div></dl></Card></div>
}
