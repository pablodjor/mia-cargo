import { useRef, useState, useMemo, type ReactNode } from 'react'
import { MapPin, Package as PackageIcon, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { PackageActivitySection } from '@/components/common/PackageActivitySection'
import { PackagePaymentInfo } from '@/components/common/PackagePaymentInfo'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { PageLoadError } from '@/components/common/PageLoadError'
import { PageLoader } from '@/components/ui/PageLoader'
import { Select } from '@/components/ui/Select'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { DELIVERY_ZONE_LABELS, DESTINATION_LABELS, PAYMENT_STATUS_DESCRIPTIONS } from '@/constants/labels'
import { useAsyncData } from '@/hooks/useAsyncData'
import { deliveriesService } from '@/services/deliveries.service'
import { driversService } from '@/services/drivers.service'
import { packagesService } from '@/services/packages.service'
import type { Package } from '@/types'
import { getPackageDeliveryAssignment } from '@/utils/package-delivery-info'
import { formatArs, formatUsd } from '@/utils/money'
import { buildGoogleMapsUrl } from '@/utils/maps'
import { formatPackageMapsAddress } from '@/utils/delivery-address'
import { cn } from '@/utils/cn'
import { paymentChipClass } from '@/utils/payment-display'

function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-text-muted uppercase">{label}</p>
      <div className="mt-1 text-sm text-text-primary">{children}</div>
    </div>
  )
}

export default function ScannerPage() {
  const input = useRef<HTMLInputElement>(null)
  const [code, setCode] = useState('')
  const [result, setResult] = useState<Package | null>(null)
  const [deliveryId, setDeliveryId] = useState('')
  const { data, reload, loading, error } = useAsyncData(async () => {
    const [packages, deliveries, drivers] = await Promise.all([
      packagesService.getAll(),
      deliveriesService.getAll(),
      driversService.getAll(),
    ])
    return { packages, deliveries, drivers }
  })

  const assignment = useMemo(() => {
    if (!result || !data) return undefined
    return getPackageDeliveryAssignment(result, data.deliveries, data.drivers)
  }, [result, data])

  const search = async (value = code) => {
    const query = value.trim()
    if (!query) {
      toast.error('Ingresá un código SH')
      input.current?.focus()
      return
    }
    const found = await packagesService.findByCode(query)
    setResult(found)
    setDeliveryId('')
    if (!found) toast.error('No se encontró el paquete')
    input.current?.focus()
  }

  const active =
    data?.deliveries.filter((item) => ['draft', 'prepared', 'in_progress'].includes(item.status)) ??
    []

  if (loading) return <PageLoader label="Cargando búsqueda…" />
  if (error && !data) return <PageLoadError message={error} onRetry={reload} />

  const address = result ? formatPackageMapsAddress(result) : ''
  const canAddToDelivery = result && result.status !== 'delivered' && result.status !== 'cancelled'

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Buscar paquete</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Ingresá el código SH para ver los datos del destinatario.
        </p>
      </div>

      <Card>
        <div className="space-y-4">
          <Input
            ref={input}
            autoFocus
            label="Código SH"
            placeholder="Ej: SH10001"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void search()
            }}
          />
          <Button className="w-full" onClick={() => void search()}>
            Buscar paquete
          </Button>
          {data?.packages.length ? (
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="w-full text-xs text-text-muted">Códigos de ejemplo:</span>
              {data.packages.slice(0, 5).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="rounded-md border border-transparent bg-secondary-light px-2.5 py-1 font-mono text-sm text-text-primary transition-colors hover:border-primary/25 hover:bg-primary-light hover:text-primary-hover"
                  onClick={() => {
                    setCode(item.shCode)
                    void search(item.shCode)
                  }}
                >
                  {item.shCode}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </Card>

      {result ? (
        <Card title="Resultado">
          <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-2xl font-bold tracking-wide text-text-primary">
                  {result.shCode}
                </p>
                <p className="mt-1 text-lg font-semibold text-text-primary">{result.ownerName}</p>
              </div>
              <StatusBadge status={result.status} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <DetailField label="Teléfono">
                <a
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                  href={`tel:${result.ownerPhone}`}
                >
                  <Phone className="h-4 w-4" />
                  {result.ownerPhone}
                </a>
              </DetailField>
              <DetailField label="Dirección">
                <span className="inline-flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {address}
                </span>
              </DetailField>
              <DetailField label="Localidad">
                {result.city}, {result.province} · CP {result.postalCode}
              </DetailField>
              <DetailField label="Destino">
                {DESTINATION_LABELS[result.destinationType]}
              </DetailField>
              {assignment && result.status !== 'delivered' ? (
                <DetailField label="Reparto">
                  <Link
                    to={`/deliveries/${assignment.deliveryId}`}
                    className="font-mono font-semibold text-primary hover:underline"
                  >
                    {assignment.deliveryCode}
                  </Link>
                  {assignment.driverName ? (
                    <p className="mt-0.5 text-xs text-text-muted">Chofer {assignment.driverName}</p>
                  ) : null}
                </DetailField>
              ) : null}
              <DetailField label="Peso">
                <span className="inline-flex items-center gap-2">
                  <PackageIcon className="h-4 w-4 text-text-muted" />
                  {result.weight} kg
                </span>
              </DetailField>
            </div>

            <div className={cn('rounded-[12px] border px-4 py-3', paymentChipClass(result.paymentStatus))}>
              <p className="mb-2 text-xs font-semibold tracking-wide text-text-muted uppercase">
                Importe y pago
              </p>
              <PackagePaymentInfo pkg={result} />
              <p className="mt-2 text-xs leading-relaxed text-text-muted">
                {PAYMENT_STATUS_DESCRIPTIONS[result.paymentStatus]}
              </p>
              <div className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
                <p>
                  Precio/kg: <strong>{formatUsd(result.pricePerKgUsd)}</strong>
                </p>
                <p>
                  Dólar usado: <strong>{formatArs(result.usdRate)}</strong>
                </p>
                <p>
                  Total USD: <strong>{formatUsd(result.totalUsd)}</strong>
                </p>
                <p>
                  Total ARS: <strong>{formatArs(result.totalArs)}</strong>
                </p>
              </div>
            </div>

            <PackageActivitySection pkg={result} />

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  window.open(buildGoogleMapsUrl(address), '_blank', 'noopener,noreferrer')
                }
              >
                <MapPin className="h-4 w-4" />
                Abrir en Maps
              </Button>
            </div>

            {canAddToDelivery ? (
              <div className="border-t border-border pt-4">
                <p className="mb-3 text-sm font-medium text-text-primary">Agregar a reparto</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Select
                    className="flex-1"
                    options={active.map((item) => ({
                      value: item.id,
                      label: `${item.code} · ${DELIVERY_ZONE_LABELS[item.zone]}`,
                    }))}
                    placeholder="Elegí un reparto activo"
                    value={deliveryId}
                    onChange={(e) => setDeliveryId(e.target.value)}
                  />
                  <Button
                    onClick={async () => {
                      if (!deliveryId) return toast.error('Elegí un reparto')
                      try {
                        await deliveriesService.addPackage(deliveryId, result.id)
                        toast.success('Paquete agregado')
                        reload()
                        const updated = await packagesService.getById(result.id)
                        if (updated) setResult(updated)
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : 'No se pudo agregar')
                      }
                    }}
                  >
                    Agregar
                  </Button>
                </div>
              </div>
            ) : null}

            {!canAddToDelivery && result.status === 'delivered' ? (
              <p className="border-t border-border pt-4 text-sm text-text-secondary">
                Este paquete ya fue entregado y no se puede agregar a un reparto.
              </p>
            ) : null}
          </div>
        </Card>
      ) : null}
    </div>
  )
}
