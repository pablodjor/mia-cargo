import { MapPin, Package, Phone } from 'lucide-react'
import { type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PackageActivitySection } from '@/components/common/PackageActivitySection'
import { PackagePaymentInfo } from '@/components/common/PackagePaymentInfo'
import { PackageDeliveryAssignmentAlert } from '@/components/packages/PackageDeliveryAssignmentAlert'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { DESTINATION_LABELS, DELIVERY_STATUS_LABELS } from '@/constants/labels'
import { useAsyncData } from '@/hooks/useAsyncData'
import { deliveriesService } from '@/services/deliveries.service'
import { driversService } from '@/services/drivers.service'
import type { Package as PackageEntity } from '@/types'
import { formatDateTime } from '@/utils/date'
import { paymentChipClass } from '@/utils/payment-display'
import { formatArs, formatUsd } from '@/utils/money'
import { formatPackageAddress, formatPackageMapsAddress } from '@/utils/delivery-address'
import { getPackageDeliveryAssignment } from '@/utils/package-delivery-info'
import { buildGoogleMapsUrl } from '@/utils/maps'
import { cn } from '@/utils/cn'

interface PackageDetailModalProps {
  pkg: PackageEntity | null
  onClose: () => void
  onEdit?: (pkg: PackageEntity) => void
}

function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-text-muted uppercase">{label}</p>
      <div className="mt-1 text-sm text-text-primary">{children}</div>
    </div>
  )
}

export function PackageDetailModal({ pkg, onClose, onEdit }: PackageDetailModalProps) {
  const navigate = useNavigate()
  const { data: assignment } = useAsyncData(async () => {
    if (!pkg?.deliveryId) return null
    const [deliveries, drivers] = await Promise.all([
      deliveriesService.getAll(),
      driversService.getAll(),
    ])
    return getPackageDeliveryAssignment(pkg, deliveries, drivers) ?? null
  }, [pkg?.id, pkg?.deliveryId])

  const address = pkg ? formatPackageAddress(pkg) : ''
  const mapsAddress = pkg ? formatPackageMapsAddress(pkg) : ''

  return (
    <Modal
      open={Boolean(pkg)}
      onClose={onClose}
      title="Detalle del paquete"
      size="lg"
      footer={
        pkg ? (
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            <Button variant="outline" onClick={() => navigate(`/history?entityId=${pkg.id}`)}>
              Historial completo
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                window.open(buildGoogleMapsUrl(mapsAddress), '_blank', 'noopener,noreferrer')
              }
            >
              <MapPin className="h-4 w-4" />
              Abrir en Maps
            </Button>
            {onEdit ? (
              <Button
                onClick={() => {
                  onEdit(pkg)
                  onClose()
                }}
              >
                Editar
              </Button>
            ) : null}
          </div>
        ) : null
      }
    >
      {pkg ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-2xl font-bold tracking-wide text-text-primary">
                {pkg.shCode}
              </p>
              <p className="mt-1 text-lg font-semibold text-text-primary">{pkg.ownerName}</p>
            </div>
            <StatusBadge status={pkg.status} />
          </div>

          {assignment ? <PackageDeliveryAssignmentAlert assignment={assignment} /> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <DetailField label="Teléfono">
              <a
                className="inline-flex items-center gap-2 text-primary hover:underline"
                href={`tel:${pkg.ownerPhone}`}
              >
                <Phone className="h-4 w-4" />
                {pkg.ownerPhone}
              </a>
            </DetailField>
            <DetailField label="Dirección">
              <span className="inline-flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {address}
              </span>
            </DetailField>
            <DetailField label="Destino">
              {DESTINATION_LABELS[pkg.destinationType]} · {pkg.city}, {pkg.province}
            </DetailField>
            <DetailField label="Peso">
              <span className="inline-flex items-center gap-2">
                <Package className="h-4 w-4 text-text-muted" />
                {pkg.weight} kg
              </span>
            </DetailField>
            {pkg.contents ? (
              <DetailField label="Contenido">{pkg.contents}</DetailField>
            ) : null}
            {pkg.notes ? <DetailField label="Observaciones">{pkg.notes}</DetailField> : null}
            {assignment ? (
              <DetailField label="Reparto">
                <Link
                  to={`/deliveries/${assignment.deliveryId}`}
                  className="font-mono font-semibold text-primary hover:underline"
                >
                  {assignment.deliveryCode}
                </Link>
                <p className="mt-0.5 text-xs text-text-muted">
                  {assignment.driverName ? `${assignment.driverName} · ` : ''}
                  {DELIVERY_STATUS_LABELS[assignment.deliveryStatus]}
                </p>
              </DetailField>
            ) : null}
          </div>

          <div className={cn('rounded-[12px] border px-4 py-3', paymentChipClass(pkg.paymentStatus))}>
            <p className="mb-2 text-xs font-semibold tracking-wide text-text-muted uppercase">
              Importe y pago
            </p>
            <PackagePaymentInfo pkg={pkg} className="bg-surface/80" />
            <div className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
              <p>
                Precio/kg: <strong>{formatUsd(pkg.pricePerKgUsd)}</strong>
              </p>
              <p>
                Dólar usado: <strong>{formatArs(pkg.usdRate)}</strong>
              </p>
              <p>
                Total USD: <strong>{formatUsd(pkg.totalUsd)}</strong>
              </p>
              <p>
                Total ARS: <strong>{formatArs(pkg.totalArs)}</strong>
              </p>
            </div>
          </div>

          <PackageActivitySection pkg={pkg} />

          <p className="text-xs text-text-muted">
            Alta {formatDateTime(pkg.createdAt)} · Última actualización {formatDateTime(pkg.updatedAt)}
          </p>
        </div>
      ) : null}
    </Modal>
  )
}
