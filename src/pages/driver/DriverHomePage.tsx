import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/PageLoader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { sumCashToCollect } from '@/components/common/PackagePaymentInfo'
import { DELIVERY_CHANNEL_LABELS } from '@/constants/labels'
import { useAuth } from '@/contexts/AuthContext'
import { useAsyncData } from '@/hooks/useAsyncData'
import { couriersService } from '@/services/couriers.service'
import { deliveriesService } from '@/services/deliveries.service'
import { packagesService } from '@/services/packages.service'
import type { Package } from '@/types'
import { formatDeliveryDateDisplay } from '@/utils/date'
import { formatArs } from '@/utils/money'

export default function DriverHomePage() {
  const { session } = useAuth()
  const driverId = session?.driverId ?? ''
  const { data, loading } = useAsyncData(async () => {
    if (!driverId) return { deliveries: [], couriers: [], packages: [] }
    const [deliveries, couriers, packages] = await Promise.all([
      deliveriesService.getByDriver(driverId),
      couriersService.getAll(),
      packagesService.getAll(),
    ])
    return { deliveries, couriers, packages }
  }, [driverId])

  const deliveries = data?.deliveries ?? []
  const packageById = new Map((data?.packages ?? []).map((pkg) => [pkg.id, pkg]))
  const courierById = new Map((data?.couriers ?? []).map((courier) => [courier.id, courier]))
  const active = deliveries.filter((item) => item.status === 'in_progress' || item.status === 'prepared')

  if (loading) return <PageLoader label="Cargando repartos…" />

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Mis repartos</h1>
        <p className="text-sm text-text-secondary">Seleccioná un reparto para continuar con las entregas.</p>
      </div>

      {active.length === 0 && deliveries.length === 0 ? (
        <Card>
          <p className="text-sm text-text-secondary">No tenés repartos asignados en la demo.</p>
        </Card>
      ) : null}

      <div className="space-y-3">
        {deliveries.map((delivery) => {
          const progress = deliveriesService.getProgress(delivery)
          const courier =
            delivery.channel === 'courier' && delivery.courierId
              ? courierById.get(delivery.courierId)
              : undefined
          const pkgs = delivery.stops
            .map((stop) => packageById.get(stop.packageId))
            .filter((pkg): pkg is Package => Boolean(pkg))
          const toCollect = sumCashToCollect(pkgs)
          return (
            <Link key={delivery.id} to={`/driver/deliveries/${delivery.id}`}>
              <Card className="mb-3 transition hover:border-primary/40">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-text-primary">{delivery.code}</p>
                    <p className="text-sm text-text-secondary">{formatDeliveryDateDisplay(delivery.date)}</p>
                    <p className="text-sm text-text-muted">
                      {courier
                        ? `Correo · ${courier.name}`
                        : DELIVERY_CHANNEL_LABELS[delivery.channel]}
                    </p>
                    <p className="mt-1 text-sm text-text-muted">
                      {progress.pending} pendientes · {progress.delivered} entregados
                    </p>
                    <p
                      className={`mt-1 text-sm font-semibold ${toCollect > 0 ? 'text-warning' : 'text-success'}`}
                    >
                      {toCollect > 0 ? `Cobrar ${formatArs(toCollect)}` : 'Sin cobro'}
                    </p>
                  </div>
                  <StatusBadge status={delivery.status} type="delivery" />
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary-light">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
              </Card>
            </Link>
          )
        })}
      </div>

      <Link className="block text-center text-sm text-primary" to="/driver/profile">
        Ver perfil
      </Link>
    </div>
  )
}
