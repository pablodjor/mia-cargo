import { Bike, Mail, Phone, Truck, User } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/PageLoader'
import { ROLE_LABELS } from '@/constants/labels'
import { useAuth } from '@/contexts/AuthContext'
import { useAsyncData } from '@/hooks/useAsyncData'
import { driversService } from '@/services/drivers.service'
import { vehiclesService } from '@/services/vehicles.service'

export default function DriverProfilePage() {
  const { session } = useAuth()

  const { data, loading } = useAsyncData(async () => {
    if (!session?.driverId) return { driver: null, vehicle: null }
    const driver = await driversService.getById(session.driverId)
    const vehicle = driver?.habitualVehicleId
      ? await vehiclesService.getById(driver.habitualVehicleId)
      : null
    return { driver, vehicle }
  }, [session?.driverId])

  if (loading) return <PageLoader label="Cargando perfil…" />

  const driver = data?.driver
  const vehicle = data?.vehicle

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Mi perfil</h1>
        <p className="mt-1 text-sm text-text-secondary">Datos de tu cuenta y unidad habitual.</p>
      </div>

      <Card>
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
            <Bike className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-text-primary">{session?.name ?? 'Sin sesión'}</p>
            <p className="text-sm text-text-secondary">{session ? ROLE_LABELS[session.role] : '—'}</p>
            {driver ? (
              <div className="mt-2">
                <Badge tone={driver.status === 'active' ? 'success' : 'neutral'}>
                  {driver.status === 'active' ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
            ) : null}
          </div>
        </div>
      </Card>

      <Card title="Acceso y contacto">
        <dl className="space-y-4">
          <div>
            <dt className="flex items-center gap-2 text-sm text-text-secondary">
              <User className="h-4 w-4" />
              Usuario
            </dt>
            <dd className="mt-1 font-medium text-text-primary">@{session?.username ?? '—'}</dd>
          </div>
          {(session?.email ?? driver?.email) ? (
            <div>
              <dt className="flex items-center gap-2 text-sm text-text-secondary">
                <Mail className="h-4 w-4" />
                Email
              </dt>
              <dd className="mt-1 font-medium text-text-primary">{session?.email ?? driver?.email}</dd>
            </div>
          ) : null}
          <div>
            <dt className="flex items-center gap-2 text-sm text-text-secondary">
              <Phone className="h-4 w-4" />
              Teléfono
            </dt>
            <dd className="mt-1 font-medium text-text-primary">{driver?.phone ?? '—'}</dd>
          </div>
          {driver?.dni ? (
            <div>
              <dt className="text-sm text-text-secondary">DNI</dt>
              <dd className="mt-1 font-medium text-text-primary">{driver.dni}</dd>
            </div>
          ) : null}
        </dl>
      </Card>

      <Card title="Operación">
        <dl className="space-y-4">
          <div>
            <dt className="text-sm text-text-secondary">Repartos realizados</dt>
            <dd className="mt-1 text-2xl font-bold text-text-primary">{driver?.deliveryCount ?? 0}</dd>
          </div>
          {vehicle ? (
            <div>
              <dt className="flex items-center gap-2 text-sm text-text-secondary">
                <Truck className="h-4 w-4" />
                Vehículo habitual
              </dt>
              <dd className="mt-1 font-medium text-text-primary">
                {vehicle.name} · <span className="font-mono">{vehicle.plate}</span>
              </dd>
              <dd className="text-sm text-text-muted">
                {vehicle.type} · {vehicle.capacityKg} kg
              </dd>
            </div>
          ) : (
            <p className="text-sm text-text-muted">Sin vehículo habitual asignado.</p>
          )}
        </dl>
      </Card>

      {!driver && session?.driverId ? (
        <p className="text-sm text-text-muted">
          No encontramos el perfil operativo del chofer ({session.driverId}).
        </p>
      ) : null}
    </div>
  )
}
