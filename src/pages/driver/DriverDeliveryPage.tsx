import { zodResolver } from '@hookform/resolvers/zod'
import {
  Banknote,
  CalendarClock,
  CheckCircle2,
  MapPin,
  Navigation,
  Package,
  PackageX,
  Phone,
} from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/PageLoader'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Modal } from '@/components/ui/Modal'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Textarea } from '@/components/ui/Textarea'
import { DRIVER_DEFAULT_FAILURE_REASON_ID } from '@/constants/driver-observations'
import {
  PackagePaymentInfo,
  PaymentSummaryPanel,
  paymentActionLabel,
  sumCashToCollect,
} from '@/components/common/PackagePaymentInfo'
import { DownloadDeliveryReportButton } from '@/components/deliveries/DownloadDeliveryReportButton'
import { DriverPaymentConfirmModal } from '@/components/driver/DriverPaymentConfirmModal'
import { PredefinedObservationBadges } from '@/components/driver/PredefinedObservationBadges'
import { PackageDeliveryNote } from '@/components/driver/PackageDeliveryNote'
import { DELIVERY_CHANNEL_LABELS } from '@/constants/labels'
import { useAuth } from '@/contexts/AuthContext'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useDeliveryDayGuard } from '@/hooks/useDeliveryDayGuard'
import { driverFailureSchema, type DriverFailureFormValues } from '@/schemas'
import { couriersService } from '@/services/couriers.service'
import { deliveriesService } from '@/services/deliveries.service'
import { packagesService } from '@/services/packages.service'
import { settingsService } from '@/services/settings.service'
import { vehiclesService } from '@/services/vehicles.service'
import type { DeliveryStop, Package as CargoPackage, PaymentStatus } from '@/types'
import { addDaysISODate, formatDateTime, formatDeliveryDateDisplay } from '@/utils/date'
import { formatArs } from '@/utils/money'
import { buildGoogleMapsRouteUrl, buildGoogleMapsUrl, formatFullAddress } from '@/utils/maps'
import { formatStopAddress, formatPackageAddress, hasAlternateDeliveryAddress } from '@/utils/delivery-address'
import { driverDeliveryPaymentOptions, needsPaymentConfirmOnDelivery } from '@/utils/payment-rules'
import { canDownloadDeliveryReport } from '@/utils/delivery-report-export'
import { cn } from '@/utils/cn'

function defaultDeliveryPayment(status: PaymentStatus): PaymentStatus {
  if (status === 'cash' || status === 'pending') return 'paid'
  return status
}

interface StopView {
  stop: DeliveryStop
  pkg: CargoPackage
}

export default function DriverDeliveryPage() {
  const { id = '' } = useParams()
  const { session } = useAuth()
  const [failureOpen, setFailureOpen] = useState(false)
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [paymentConfirmOpen, setPaymentConfirmOpen] = useState(false)
  const [deliveryConfirmOpen, setDeliveryConfirmOpen] = useState(false)
  const [activePackageId, setActivePackageId] = useState<string | null>(null)
  const [confirmPayment, setConfirmPayment] = useState<PaymentStatus>('paid')
  const tomorrowISO = addDaysISODate(1)
  const tomorrowLabel = formatDeliveryDateDisplay(tomorrowISO)
  const { guardDeliveryDayAction, deliveryDayGuardDialog, isGuardOpen } = useDeliveryDayGuard()

  const { data, reload, loading } = useAsyncData(async () => {
    const [delivery, packages, couriers, vehicles, reasons] = await Promise.all([
      deliveriesService.getById(id),
      packagesService.getAll(),
      couriersService.getAll(),
      vehiclesService.getAll(),
      settingsService.getFailureReasons(),
    ])
    return { delivery, packages, couriers, vehicles, reasons }
  }, [id])

  const form = useForm<DriverFailureFormValues>({
    resolver: zodResolver(driverFailureSchema),
    defaultValues: { failureNotes: '' },
  })
  const failureNotesValue = form.watch('failureNotes') ?? ''

  if (loading || !data) return <PageLoader label="Cargando reparto…" />
  if (!data.delivery) {
    return (
      <div className="space-y-3 p-4">
        <p>Reparto no encontrado.</p>
        <Link className="text-primary" to="/driver">
          Volver
        </Link>
      </div>
    )
  }

  const delivery = data.delivery
  const progress = deliveriesService.getProgress(delivery)
  const packageById = new Map(data.packages.map((item) => [item.id, item]))
  const isCourier = delivery.channel === 'courier'
  const courier =
    isCourier && delivery.courierId
      ? data.couriers.find((item) => item.id === delivery.courierId)
      : undefined
  const courierAddress = courier ? formatFullAddress(courier) : ''

  const stops: StopView[] = delivery.stops
    .slice()
    .sort((a, b) => a.order - b.order)
    .flatMap((stop) => {
      const pkg = packageById.get(stop.packageId)
      return pkg ? [{ stop, pkg }] : []
    })

  const pendingStops = stops.filter((item) => item.stop.status === 'pending')
  const nextStop = pendingStops[0] ?? null
  const selectedId = activePackageId ?? nextStop?.pkg.id ?? null
  const selected = stops.find((item) => item.pkg.id === selectedId) ?? nextStop

  const allAddresses = stops.map((item) => formatStopAddress(item.pkg, item.stop))
  const pendingAddresses = pendingStops.map((item) => formatStopAddress(item.pkg, item.stop))
  const routeAddresses = pendingAddresses.length > 0 ? pendingAddresses : allAddresses
  const mapsTarget = isCourier ? courierAddress : null
  const cashToCollect = sumCashToCollect(pendingStops.map((item) => item.pkg))
  const paymentOptions = driverDeliveryPaymentOptions(delivery.channel)

  const openFullRoute = () => {
    if (isCourier) {
      if (!courierAddress) {
        toast.error('El correo no tiene dirección configurada')
        return
      }
      window.open(buildGoogleMapsUrl(courierAddress), '_blank', 'noopener,noreferrer')
      return
    }
    if (routeAddresses.length === 0) {
      toast.error('No hay direcciones para mostrar')
      return
    }
    window.open(buildGoogleMapsRouteUrl(routeAddresses), '_blank', 'noopener,noreferrer')
  }

  const openFailure = () => {
    form.reset({ failureNotes: '' })
    setFailureOpen(true)
  }

  const openReschedule = () => {
    form.reset({ failureNotes: 'Cliente pide entrega mañana' })
    setRescheduleOpen(true)
  }

  const mark = async (
    result: 'delivered' | 'not_delivered',
    values?: DriverFailureFormValues,
    paymentStatus?: PaymentStatus,
  ) => {
    if (!selected) return

    const restoreModals = {
      failure: failureOpen,
      payment: paymentConfirmOpen,
      delivery: deliveryConfirmOpen,
    }

    const confirmed = await guardDeliveryDayAction(
      delivery.date,
      async () => {
        try {
          await deliveriesService.markStop(id, selected.pkg.id, result, {
            failureReasonId: result === 'not_delivered' ? DRIVER_DEFAULT_FAILURE_REASON_ID : undefined,
            failureNotes: values?.failureNotes,
            paymentStatus: result === 'delivered' ? paymentStatus : undefined,
          })
          toast.success(
            result === 'delivered'
              ? `Entrega registrada · ${formatDateTime(new Date().toISOString())}`
              : `Incidencia registrada · ${formatDateTime(new Date().toISOString())}`,
          )
          setFailureOpen(false)
          setPaymentConfirmOpen(false)
          setDeliveryConfirmOpen(false)
          setActivePackageId(null)
          form.reset()
          reload()
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'No se pudo registrar')
          throw error
        }
      },
      {
        whileGuard: {
          suspend: () => {
            setFailureOpen(false)
            setPaymentConfirmOpen(false)
            setDeliveryConfirmOpen(false)
          },
          restore: () => {
            if (restoreModals.failure) setFailureOpen(true)
            if (restoreModals.payment) setPaymentConfirmOpen(true)
            if (restoreModals.delivery) setDeliveryConfirmOpen(true)
          },
        },
      },
    )

    if (!confirmed) return
  }

  const openPaymentConfirm = () => {
    if (!selected) return
    setConfirmPayment(defaultDeliveryPayment(selected.pkg.paymentStatus))
    setPaymentConfirmOpen(true)
  }

  const handleMarkDelivered = () => {
    if (!selected) return
    if (needsPaymentConfirmOnDelivery(selected.pkg.paymentStatus)) {
      openPaymentConfirm()
      return
    }
    setDeliveryConfirmOpen(true)
  }

  const rescheduleTomorrow = async (values: DriverFailureFormValues) => {
    if (!selected) return

    const wasRescheduleOpen = rescheduleOpen

    const confirmed = await guardDeliveryDayAction(
      delivery.date,
      async () => {
        try {
          await deliveriesService.rescheduleStop(id, selected.pkg.id, {
            failureReasonId: DRIVER_DEFAULT_FAILURE_REASON_ID,
            failureNotes: values.failureNotes,
            dateISO: tomorrowISO,
          })
          toast.success(`Reprogramado para ${tomorrowLabel}`)
          setRescheduleOpen(false)
          setActivePackageId(null)
          form.reset()
          reload()
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'No se pudo reprogramar')
          throw error
        }
      },
      {
        whileGuard: {
          suspend: () => setRescheduleOpen(false),
          restore: () => {
            if (wasRescheduleOpen) setRescheduleOpen(true)
          },
        },
      },
    )

    if (!confirmed) return
  }

  return (
    <div className="space-y-4">
      <div>
        <Link className="text-sm text-primary" to="/driver">
          ← Mis repartos
        </Link>
        <h1 className="mt-2 text-xl font-bold text-text-primary">{delivery.code}</h1>
        <p className="mt-1 text-sm font-semibold text-primary">
          Fecha del reparto: {formatDeliveryDateDisplay(delivery.date)}
        </p>
        <p className="text-sm text-text-secondary">
          {DELIVERY_CHANNEL_LABELS[delivery.channel]}
          {courier ? ` · ${courier.name}` : null}
        </p>
        <p className="text-sm text-text-secondary">
          {progress.delivered} entregados · {progress.notDelivered} no entregados · {progress.pending}{' '}
          pendientes
        </p>
      </div>

      <Card>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-text-secondary">Progreso</span>
          <strong>{progress.percent}%</strong>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-secondary-light">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        {cashToCollect > 0 ? (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-[10px] border border-border bg-background px-3 py-2.5 text-sm">
            <span className="flex items-center gap-2 text-text-secondary">
              <Banknote className="h-4 w-4 shrink-0" />
              Por cobrar en pendientes
            </span>
            <strong className="text-base text-text-primary">{formatArs(cashToCollect)}</strong>
          </div>
        ) : (
          <p className="mt-3 flex items-center gap-2 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" />
            Sin cobros pendientes en este reparto
          </p>
        )}
      </Card>

      {canDownloadDeliveryReport(delivery) ? (
        <DownloadDeliveryReportButton
          fullWidth
          context={{
            delivery,
            packagesById: packageById,
            driver: session ? { name: session.name, email: session.email } : undefined,
            courier,
            vehicle: data.vehicles.find((item) => item.id === delivery.vehicleId),
            failureReasons: new Map((data.reasons ?? []).map((item) => [item.id, item.label])),
          }}
        />
      ) : null}

      {isCourier && courier ? (
        <Card title="Sucursal de entrega">
          <p className="font-semibold text-text-primary">
            {courier.name} · {courier.branchName}
          </p>
          <p className="mt-1 text-sm text-text-secondary">{courierAddress}</p>
          {courier.notes ? <p className="mt-2 text-sm text-text-muted">{courier.notes}</p> : null}
        </Card>
      ) : null}

      <Button size="lg" className="w-full" onClick={openFullRoute}>
        <Navigation className="h-5 w-5" />
        {isCourier ? 'Ir a la sucursal en Maps' : 'Ruta ida y vuelta'}
      </Button>
      <p className="text-center text-xs text-text-muted">
        {isCourier
          ? 'Todos los SH se entregan en la misma sucursal del correo'
          : `Mercado Central → ${routeAddresses.length} parada${routeAddresses.length === 1 ? '' : 's'}${pendingAddresses.length > 0 ? ' pendientes' : ''} → Mercado Central`}
      </p>

      <div>
        <h2 className="mb-1 text-sm font-semibold text-text-primary">
          {isCourier ? `Paquetes (${stops.length})` : `Todas las paradas (${stops.length})`}
        </h2>
        {pendingStops.length > 0 ? (
          <p className="mb-2 text-xs text-text-muted">Tocá un paquete pendiente para ver las acciones.</p>
        ) : null}
        <div className="space-y-2">
          {stops.map(({ stop, pkg }) => {
            const isNext = nextStop?.pkg.id === pkg.id
            const isSelected = selected?.pkg.id === pkg.id
            const isPending = stop.status === 'pending'
            const address = mapsTarget ?? formatStopAddress(pkg, stop)
            const stopMapsUrl = mapsTarget ?? formatStopAddress(pkg, stop)
            const alternateAddress = hasAlternateDeliveryAddress(pkg, stop)

            return (
              <div
                key={stop.packageId}
                className={cn(
                  'overflow-hidden rounded-[12px] border bg-surface transition',
                  isSelected && isPending
                    ? 'border-primary shadow-sm ring-2 ring-primary/20'
                    : 'border-border',
                  !isPending && 'opacity-75',
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (isPending) setActivePackageId(pkg.id)
                  }}
                  className="w-full p-3 text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-secondary-light px-2 py-0.5 text-xs font-semibold text-secondary">
                          #{stop.order}
                        </span>
                        {isNext ? (
                          <span className="rounded-full bg-warning px-2 py-0.5 text-xs font-semibold text-white">
                            Siguiente
                          </span>
                        ) : null}
                        <StatusBadge status={stop.status} type="stop" />
                      </div>
                      <p className="mt-2 font-mono text-sm font-semibold tracking-wide">{pkg.shCode}</p>
                      <p className="font-semibold text-text-primary">{pkg.ownerName}</p>
                      <p className="mt-1 flex items-start gap-1.5 text-sm text-text-secondary">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>
                          {isCourier && courier
                            ? `${courier.name} · ${courier.branchName}`
                            : address}
                        </span>
                      </p>
                      {alternateAddress && !isCourier ? (
                        <p className="mt-1 text-xs text-text-muted line-through">
                          {formatPackageAddress(pkg)}
                        </p>
                      ) : null}
                      <PackagePaymentInfo pkg={pkg} compact className="mt-2" />
                      {pkg.notes && !(isSelected && isPending) ? (
                        <PackageDeliveryNote note={pkg.notes} compact className="mt-2" />
                      ) : null}
                      {stop.attemptedAt && stop.status !== 'pending' ? (
                        <p
                          className={cn(
                            'mt-2 text-xs font-medium',
                            stop.status === 'delivered' ? 'text-success' : 'text-text-muted',
                          )}
                        >
                          {stop.status === 'delivered' ? 'Entregado' : 'Registrado'}:{' '}
                          {formatDateTime(stop.attemptedAt)}
                        </p>
                      ) : null}
                    </div>
                    {stop.status === 'delivered' ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                    ) : null}
                    {stop.status === 'not_delivered' ? (
                      <PackageX className="h-5 w-5 shrink-0 text-danger" />
                    ) : null}
                  </div>
                </button>

                {isSelected && isPending ? (
                  <div className="space-y-4 border-t border-primary/15 bg-primary-light/25 p-3">
                    <div className="space-y-2 text-sm">
                      <p className="flex items-center gap-2 text-text-secondary">
                        <Phone className="h-4 w-4 shrink-0 text-primary" />
                        <a className="font-medium text-primary" href={`tel:${pkg.ownerPhone}`}>
                          {pkg.ownerPhone}
                        </a>
                      </p>
                      <p className="flex items-center gap-2 text-text-secondary">
                        <Package className="h-4 w-4 shrink-0 text-primary" />
                        {pkg.weight} kg
                      </p>
                      <PaymentSummaryPanel
                        status={pkg.paymentStatus}
                        amount={pkg.totalArs}
                        actionLabel={
                          pkg.paymentStatus === 'paid' ? undefined : paymentActionLabel(pkg)
                        }
                      />
                      {pkg.notes ? <PackageDeliveryNote note={pkg.notes} /> : null}
                    </div>

                    <div className="grid gap-2">
                      <Button size="lg" className="w-full" onClick={handleMarkDelivered}>
                        <CheckCircle2 className="h-5 w-5" />
                        {isCourier ? 'Marcar entregado en correo' : 'Marcar como entregado'}
                      </Button>
                      <Button
                        size="lg"
                        variant="secondary"
                        className="w-full"
                        onClick={() =>
                          window.open(stopMapsUrl, '_blank', 'noopener,noreferrer')
                        }
                      >
                        <Navigation className="h-5 w-5" />
                        {isCourier ? 'Ir a la sucursal' : 'Ir solo a esta parada'}
                      </Button>
                      {!isCourier ? (
                        <Button size="lg" variant="outline" className="w-full" onClick={openReschedule}>
                          <CalendarClock className="h-5 w-5" />
                          Reprogramar para mañana
                        </Button>
                      ) : null}
                      <Button size="lg" variant="danger" className="w-full" onClick={openFailure}>
                        <PackageX className="h-5 w-5" />
                        No se pudo entregar
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>

      {pendingStops.length === 0 ? (
        <Card title="Reparto completo">
          <p className="text-sm text-text-secondary">No quedan paradas pendientes en este reparto.</p>
          {(isCourier ? Boolean(courierAddress) : allAddresses.length > 0) ? (
            <Button className="mt-3 w-full" variant="outline" onClick={openFullRoute}>
              {isCourier ? 'Ver sucursal en Maps' : 'Ver ruta ida y vuelta'}
            </Button>
          ) : null}
        </Card>
      ) : null}

      <DriverPaymentConfirmModal
        open={paymentConfirmOpen && !isGuardOpen}
        onClose={() => setPaymentConfirmOpen(false)}
        pkg={selected?.pkg ?? null}
        isCourier={isCourier}
        options={paymentOptions}
        selectedPayment={confirmPayment}
        onSelectPayment={setConfirmPayment}
        onConfirm={() => void mark('delivered', undefined, confirmPayment)}
      />

      <ConfirmDialog
        open={deliveryConfirmOpen && !isGuardOpen}
        title="¿Confirmar entrega?"
        description={
          selected
            ? `${selected.pkg.shCode} · ${selected.pkg.ownerName}. Reparto del ${formatDeliveryDateDisplay(delivery.date)}. El paquete ya está pago — confirmá que lo entregaste correctamente. Se registrará con la fecha y hora actual.`
            : `Confirmá que entregaste el paquete. Reparto del ${formatDeliveryDateDisplay(delivery.date)}.`
        }
        confirmLabel="Sí, entregué el paquete"
        onCancel={() => setDeliveryConfirmOpen(false)}
        onConfirm={() => void mark('delivered', undefined, selected?.pkg.paymentStatus ?? 'paid')}
      />

      <Modal
        open={failureOpen && !isGuardOpen}
        onClose={() => setFailureOpen(false)}
        title="Registrar no entrega"
        description="Elegí una observación rápida o escribí qué pasó."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setFailureOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={form.handleSubmit((values) => void mark('not_delivered', values))}>
              Confirmar
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <PredefinedObservationBadges
            value={failureNotesValue}
            onSelect={(text) =>
              form.setValue('failureNotes', text, { shouldDirty: true, shouldValidate: true })
            }
          />
          <Textarea
            label="Observación"
            placeholder="Tocá una observación rápida o escribí acá"
            error={form.formState.errors.failureNotes?.message}
            {...form.register('failureNotes')}
          />
        </div>
      </Modal>

      <Modal
        open={rescheduleOpen && !isGuardOpen}
        onClose={() => setRescheduleOpen(false)}
        title="Reprogramar para mañana"
        description={`El SH sale del reparto actual y queda para ${tomorrowLabel}.`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRescheduleOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={form.handleSubmit((values) => void rescheduleTomorrow(values))}>
              Confirmar mañana
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="rounded-[10px] border border-primary/20 bg-primary-light px-3 py-2 text-sm text-primary-hover">
            Nueva fecha: <strong>{tomorrowLabel}</strong>
          </div>
          <PredefinedObservationBadges
            value={failureNotesValue}
            onSelect={(text) =>
              form.setValue('failureNotes', text, { shouldDirty: true, shouldValidate: true })
            }
          />
          <Textarea
            label="Observación"
            placeholder="Tocá una observación rápida o escribí acá"
            error={form.formState.errors.failureNotes?.message}
            {...form.register('failureNotes')}
          />
        </div>
      </Modal>

      {deliveryDayGuardDialog}
    </div>
  )
}
