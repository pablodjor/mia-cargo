import { zodResolver } from '@hookform/resolvers/zod'
import { PackagePlus, Route } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DateField } from '@/components/ui/DateField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { BackLink } from '@/components/common/BackLink'
import { DestinationBadge } from '@/components/common/DestinationBadge'
import { RoutePlannerModal } from '@/components/common/RoutePlannerModal'
import { DeliveryFormSelectedPackages } from '@/components/deliveries/DeliveryFormSelectedPackages'
import { FailureObservationFields } from '@/components/deliveries/FailureObservationFields'
import { DriverPaymentConfirmModal } from '@/components/driver/DriverPaymentConfirmModal'
import { Alert } from '@/components/ui/Alert'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Modal } from '@/components/ui/Modal'
import { PageLoadError } from '@/components/common/PageLoadError'
import { PageLoader } from '@/components/ui/PageLoader'
import { DELIVERY_CHANNEL_LABELS, PACKAGE_STATUS_LABELS } from '@/constants/labels'
import { DRIVER_DEFAULT_FAILURE_REASON_ID } from '@/constants/driver-observations'
import { deliveryZoneLabel, deliveryZoneSelectOptions, packageMatchesDeliveryZone } from '@/utils/delivery-zone'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useDeliveryDayGuard } from '@/hooks/useDeliveryDayGuard'
import { deliverySchema, type DeliveryFormValues } from '@/schemas'
import { couriersService } from '@/services/couriers.service'
import { deliveriesService } from '@/services/deliveries.service'
import { driversService } from '@/services/drivers.service'
import { packagesService } from '@/services/packages.service'
import { vehiclesService } from '@/services/vehicles.service'
import type { DeliveryAddressOverride, DeliveryStop, PaymentStatus } from '@/types'
import { addDaysISODate, formatDateTime, formatDeliveryDateDisplay, parseISODateParam, todayISODate } from '@/utils/date'
import { isCompleteDeliveryAddress } from '@/utils/delivery-address'
import { canEditDelivery } from '@/utils/delivery-report-export'
import { formatFullAddress } from '@/utils/maps'
import {
  driverDeliveryPaymentOptions,
  needsPaymentConfirmOnDelivery,
} from '@/utils/payment-rules'

function defaultDeliveryPayment(status: PaymentStatus): PaymentStatus {
  if (status === 'cash' || status === 'pending') return 'paid'
  return status
}

export default function DeliveryFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const presetDate = parseISODateParam(searchParams.get('date')) ?? todayISODate()
  const [search, setSearch] = useState('')
  const [routePlannerOpen, setRoutePlannerOpen] = useState(false)
  const [addressOverrides, setAddressOverrides] = useState<Record<string, DeliveryAddressOverride>>({})
  const [openAddressEditors, setOpenAddressEditors] = useState<Record<string, boolean>>({})
  const [lockedAddressOverrides, setLockedAddressOverrides] = useState<Record<string, boolean>>({})
  const [confirmDuplicateOpen, setConfirmDuplicateOpen] = useState(false)
  const [conflictNoticeOpen, setConflictNoticeOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<'draft' | 'prepared' | null>(null)
  const [stops, setStops] = useState<DeliveryStop[]>([])
  const [rescheduleStop, setRescheduleStop] = useState<DeliveryStop | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState(addDaysISODate(1))
  const [rescheduleNotes, setRescheduleNotes] = useState('')
  const [markDeliveredStop, setMarkDeliveredStop] = useState<DeliveryStop | null>(null)
  const [markFailedStop, setMarkFailedStop] = useState<DeliveryStop | null>(null)
  const [resetStopTarget, setResetStopTarget] = useState<DeliveryStop | null>(null)
  const [deliveredConfirmOpen, setDeliveredConfirmOpen] = useState(false)
  const [paymentConfirmOpen, setPaymentConfirmOpen] = useState(false)
  const [confirmPayment, setConfirmPayment] = useState<PaymentStatus>('paid')
  const [failureNotes, setFailureNotes] = useState('')
  const selectedSectionRef = useRef<HTMLDivElement>(null)
  const dismissedConflictKeyRef = useRef<string | null>(null)
  const deliveryIdRef = useRef<string | undefined>(undefined)
  const { guardDeliveryDayAction, deliveryDayGuardDialog, isGuardOpen } = useDeliveryDayGuard()

  const { data, loading, reload, error } = useAsyncData(async () => {
    const [delivery, drivers, vehicles, packages, couriers] = await Promise.all([
      id ? deliveriesService.getById(id) : Promise.resolve(null),
      driversService.getAll(),
      vehiclesService.getAll(),
      packagesService.getAll(),
      couriersService.getAll(),
    ])
    return { delivery, drivers, vehicles, packages, couriers }
  }, [id])

  const form = useForm<DeliveryFormValues>({
    resolver: zodResolver(deliverySchema),
    defaultValues: {
      date: presetDate,
      zone: 'caba',
      channel: 'last_mile',
      courierId: '',
      driverId: '',
      vehicleId: '',
      notes: '',
      packageIds: [],
    },
  })

  useEffect(() => {
    if (id || !data?.packages) return
    const presetPackageId = searchParams.get('package')
    if (!presetPackageId) return
    const check = packagesService.canAddToDelivery(presetPackageId)
    if (!check.ok) return
    const current = form.getValues('packageIds')
    if (current.includes(presetPackageId)) return
    form.setValue('packageIds', [...current, presetPackageId], { shouldDirty: true })
  }, [id, data?.packages, searchParams, form])

  useEffect(() => {
    if (!data?.delivery) return
    setStops(data.delivery.stops)
    const isNewDelivery = deliveryIdRef.current !== data.delivery.id
    if (isNewDelivery || !form.formState.isDirty) {
      form.reset({
        date: data.delivery.date,
        zone: data.delivery.zone,
        channel: data.delivery.channel,
        courierId: data.delivery.courierId ?? '',
        driverId: data.delivery.driverId,
        vehicleId: data.delivery.vehicleId,
        notes: data.delivery.notes ?? '',
        packageIds: data.delivery.stops.map((stop) => stop.packageId),
      })

      const overrides: Record<string, DeliveryAddressOverride> = {}
      const openEditors: Record<string, boolean> = {}
      const lockedOverrides: Record<string, boolean> = {}
      for (const stop of data.delivery.stops) {
        if (stop.deliveryAddress) {
          overrides[stop.packageId] = stop.deliveryAddress
          openEditors[stop.packageId] = false
          lockedOverrides[stop.packageId] = true
        }
      }
      setAddressOverrides(overrides)
      setOpenAddressEditors(openEditors)
      setLockedAddressOverrides(lockedOverrides)
      deliveryIdRef.current = data.delivery.id
    }
  }, [data, form])

  useEffect(() => {
    if (!id || loading) return
    if (!data?.delivery) return
    if (!canEditDelivery(data.delivery)) {
      toast.error('Este reparto ya está finalizado y no se puede editar')
      navigate(`/deliveries/${id}`, { replace: true })
    }
  }, [id, loading, data?.delivery, navigate])

  const ids = form.watch('packageIds') ?? []
  const selectedDate = form.watch('date')
  const driverId = form.watch('driverId')
  const channel = form.watch('channel')
  const zone = form.watch('zone')
  const courierId = form.watch('courierId')
  const selected = useMemo(() => {
    if (!data?.packages) return []
    const byId = new Map(data.packages.map((item) => [item.id, item]))
    return ids.map((itemId) => byId.get(itemId)).filter(Boolean) as typeof data.packages
  }, [data?.packages, ids])
  const total = selected.reduce((sum, item) => sum + item.weight, 0)
  const stopByPackageId = useMemo(() => new Map(stops.map((stop) => [stop.packageId, stop])), [stops])
  const deliveredCount = selected.filter((item) => stopByPackageId.get(item.id)?.status === 'delivered').length
  const pendingInRouteCount = selected.length - deliveredCount
  const canManageStops = Boolean(id && data?.delivery && canEditDelivery(data.delivery))
  const markDeliveredPkg = markDeliveredStop
    ? data?.packages.find((item) => item.id === markDeliveredStop.packageId)
    : undefined
  const paymentOptions = driverDeliveryPaymentOptions(channel)

  const allAvailable = useMemo(
    () =>
      packagesService.listAvailableForDelivery(id, ids).filter((item) => {
        if (
          channel === 'courier' &&
          (item.paymentStatus === 'cash' ||
            item.paymentStatus === 'usd_cash' ||
            item.paymentStatus === 'pending')
        ) {
          return false
        }
        if (channel !== 'courier' && zone && !packageMatchesDeliveryZone(item.destinationType, zone)) {
          return false
        }
        return true
      }),
    [ids, id, channel, zone],
  )

  const available = useMemo(() => {
    const query = search.trim().toLowerCase()
    return allAvailable.filter((item) => {
      if (!query) return true
      return (
        item.shCode.toLowerCase().includes(query) ||
        item.ownerName.toLowerCase().includes(query) ||
        formatFullAddress(item).toLowerCase().includes(query)
      )
    })
  }, [search, allAvailable])

  const selectedCourier =
    channel === 'courier' && courierId
      ? data?.couriers.find((item) => item.id === courierId)
      : undefined

  const selectedDriver = data?.drivers.find((driver) => driver.id === driverId)

  const conflictingDeliveries = useMemo(() => {
    if (!driverId || !selectedDate) return []
    return deliveriesService.findByDriverAndDate(driverId, selectedDate, id)
  }, [driverId, selectedDate, id])

  const conflictKey = useMemo(() => {
    if (!driverId || !selectedDate || conflictingDeliveries.length === 0) return null
    return `${driverId}:${selectedDate}:${conflictingDeliveries.map((delivery) => delivery.id).join(',')}`
  }, [driverId, selectedDate, conflictingDeliveries])

  useEffect(() => {
    if (!conflictKey) {
      dismissedConflictKeyRef.current = null
      setConflictNoticeOpen(false)
      return
    }
    if (dismissedConflictKeyRef.current === conflictKey) return
    setConflictNoticeOpen(true)
  }, [conflictKey])

  const dismissConflictNotice = () => {
    dismissedConflictKeyRef.current = conflictKey
    setConflictNoticeOpen(false)
  }

  const performSave = async (values: DeliveryFormValues, status?: 'draft' | 'prepared') => {
    const payload = {
      date: values.date,
      zone: values.zone,
      channel: values.channel,
      courierId: values.channel === 'courier' ? values.courierId : undefined,
      driverId: values.driverId,
      vehicleId: values.vehicleId,
      notes: values.notes,
      packageIds: values.packageIds,
      stopAddressOverrides: addressOverrides,
      ...(status !== undefined ? { status } : {}),
    }
    if (id) await deliveriesService.update(id, payload)
    else await deliveriesService.create({ ...payload, status: status ?? 'draft' })
    toast.success(`Reparto guardado para ${formatDeliveryDateDisplay(values.date)}`)
    navigate(id ? `/deliveries/${id}` : '/deliveries')
  }

  const submitDelivery = (status?: 'draft' | 'prepared') => {
    void form.handleSubmit(async (values) => {
      try {
        for (const packageId of values.packageIds) {
          const override = addressOverrides[packageId]
          if (override && !lockedAddressOverrides[packageId]) {
            const pkg = data?.packages.find((item) => item.id === packageId)
            toast.error(
              `Confirmá la dirección alternativa de ${pkg?.shCode ?? 'un paquete seleccionado'}`,
            )
            return
          }
          if (override && !isCompleteDeliveryAddress(override)) {
            const pkg = data?.packages.find((item) => item.id === packageId)
            toast.error(
              `Completá la dirección alternativa de ${pkg?.shCode ?? 'un paquete seleccionado'}`,
            )
            return
          }
        }

        const conflicts = deliveriesService.findByDriverAndDate(values.driverId, values.date, id)
        if (conflicts.length > 0) {
          setPendingStatus(status ?? null)
          setConfirmDuplicateOpen(true)
          return
        }

        await performSave(values, status)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo guardar')
      }
    })()
  }

  const save = (status: 'draft' | 'prepared') => submitDelivery(status)

  const saveChanges = () => submitDelivery()

  const add = (packageId: string) => {
    const check = packagesService.canAddToDelivery(packageId, id, channel)
    if (!check.ok) {
      toast.error(check.message)
      return
    }
    form.setValue('packageIds', [...ids, packageId])
    window.requestAnimationFrame(() => {
      selectedSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }

  const remove = (packageId: string) => {
    form.setValue(
      'packageIds',
      ids.filter((itemId) => itemId !== packageId),
    )
    setAddressOverrides((current) => {
      const next = { ...current }
      delete next[packageId]
      return next
    })
    setOpenAddressEditors((current) => {
      const next = { ...current }
      delete next[packageId]
      return next
    })
    setLockedAddressOverrides((current) => {
      const next = { ...current }
      delete next[packageId]
      return next
    })
  }

  const setOverride = (packageId: string, value: DeliveryAddressOverride | undefined) => {
    setAddressOverrides((current) => {
      const next = { ...current }
      if (value) next[packageId] = value
      else delete next[packageId]
      return next
    })
    if (!value) {
      setLockedAddressOverrides((current) => {
        const next = { ...current }
        delete next[packageId]
        return next
      })
    }
  }

  const openAddressEditor = (packageId: string) => {
    setOpenAddressEditors((current) => ({ ...current, [packageId]: true }))
    setLockedAddressOverrides((current) => ({ ...current, [packageId]: false }))
    setAddressOverrides((current) => {
      if (current[packageId]) return current
      const pkg = data?.packages.find((item) => item.id === packageId)
      return {
        ...current,
        [packageId]: {
          address: '',
          city: pkg?.city ?? '',
          province: pkg?.province ?? '',
          postalCode: pkg?.postalCode ?? '',
        },
      }
    })
  }

  const reorder = (fromIndex: number, toIndex: number) => {
    const next = [...ids]
    const [removed] = next.splice(fromIndex, 1)
    if (!removed) return
    next.splice(toIndex, 0, removed)
    form.setValue('packageIds', next, { shouldDirty: true })
  }

  const refreshAfterStopAction = async () => {
    if (!id) return
    const delivery = await deliveriesService.getById(id)
    if (!delivery) return
    setStops(delivery.stops)
    const serverIds = new Set(delivery.stops.map((stop) => stop.packageId))
    const currentIds = form.getValues('packageIds')
    form.setValue(
      'packageIds',
      currentIds.filter((packageId) => serverIds.has(packageId)),
      { shouldDirty: true },
    )
    reload()
  }

  const openMarkDelivered = (stop: DeliveryStop) => {
    const pkg = data?.packages.find((item) => item.id === stop.packageId)
    setMarkDeliveredStop(stop)
    if (pkg && needsPaymentConfirmOnDelivery(pkg.paymentStatus)) {
      setConfirmPayment(defaultDeliveryPayment(pkg.paymentStatus))
      setPaymentConfirmOpen(true)
      return
    }
    setDeliveredConfirmOpen(true)
  }

  const confirmMarkDelivered = async (paymentStatus?: PaymentStatus) => {
    if (!id || !markDeliveredStop || !data?.delivery) return

    const restoreDeliveredModal = {
      payment: paymentConfirmOpen,
      delivered: deliveredConfirmOpen,
    }

    try {
      const confirmed = await guardDeliveryDayAction(
        data.delivery.date,
        async () => {
          try {
            await deliveriesService.markStop(id, markDeliveredStop.packageId, 'delivered', {
              paymentStatus,
            })
            toast.success(`Paquete marcado como entregado · ${formatDateTime(new Date().toISOString())}`)
            await refreshAfterStopAction()
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo marcar como entregado')
            throw error
          }
        },
        {
          whileGuard: {
            suspend: () => {
              setPaymentConfirmOpen(false)
              setDeliveredConfirmOpen(false)
            },
            restore: () => {
              if (restoreDeliveredModal.payment) setPaymentConfirmOpen(true)
              if (restoreDeliveredModal.delivered) setDeliveredConfirmOpen(true)
            },
          },
        },
      )
      if (!confirmed) return
      setMarkDeliveredStop(null)
    } catch (error) {
      if (restoreDeliveredModal.payment) setPaymentConfirmOpen(true)
      if (restoreDeliveredModal.delivered) setDeliveredConfirmOpen(true)
      toast.error(error instanceof Error ? error.message : 'No se pudo marcar como entregado')
    }
  }

  const openMarkFailed = (stop: DeliveryStop) => {
    const pkg = data?.packages.find((item) => item.id === stop.packageId)
    setMarkFailedStop(stop)
    setFailureNotes(stop.status === 'not_delivered' ? pkg?.failureNotes ?? '' : '')
  }

  const confirmMarkFailed = async () => {
    if (!id || !markFailedStop || !data?.delivery) return
    if (!failureNotes.trim()) {
      toast.error('Seleccioná o escribí una observación')
      return
    }
    try {
      const confirmed = await guardDeliveryDayAction(data.delivery.date, async () => {
        try {
          await deliveriesService.markStop(id, markFailedStop.packageId, 'not_delivered', {
            failureReasonId: DRIVER_DEFAULT_FAILURE_REASON_ID,
            failureNotes: failureNotes.trim(),
          })
          toast.success(`Paquete marcado como no entregado · ${formatDateTime(new Date().toISOString())}`)
          await refreshAfterStopAction()
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'No se pudo registrar')
          throw error
        }
      })
      if (!confirmed) return
      setMarkFailedStop(null)
      setFailureNotes('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo registrar')
    }
  }

  const openReschedule = (stop: DeliveryStop) => {
    setRescheduleStop(stop)
    setRescheduleDate(addDaysISODate(1))
    setRescheduleNotes('')
  }

  const confirmReschedule = async () => {
    if (!id || !rescheduleStop || !data?.delivery) return
    if (!rescheduleNotes.trim()) {
      toast.error('Seleccioná o escribí una observación')
      return
    }
    guardDeliveryDayAction(data.delivery.date, async () => {
      try {
        await deliveriesService.rescheduleStop(id, rescheduleStop.packageId, {
          failureReasonId: DRIVER_DEFAULT_FAILURE_REASON_ID,
          failureNotes: rescheduleNotes.trim(),
          dateISO: rescheduleDate,
        })
        toast.success(`Reprogramado para ${formatDeliveryDateDisplay(rescheduleDate)}`)
        setRescheduleStop(null)
        await refreshAfterStopAction()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo reprogramar')
      }
    })
  }

  const rescheduleTomorrow = async (stop: DeliveryStop) => {
    if (!id || !data?.delivery) return
    guardDeliveryDayAction(data.delivery.date, async () => {
      try {
        await deliveriesService.rescheduleStop(id, stop.packageId, {
          failureReasonId: DRIVER_DEFAULT_FAILURE_REASON_ID,
          failureNotes: 'Cliente pide entrega mañana',
          dateISO: addDaysISODate(1),
        })
        toast.success(`Reprogramado para ${formatDeliveryDateDisplay(addDaysISODate(1))}`)
        await refreshAfterStopAction()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo reprogramar')
      }
    })
  }

  const confirmResetStop = async () => {
    if (!id || !resetStopTarget || !data?.delivery) return
    guardDeliveryDayAction(data.delivery.date, async () => {
      try {
        await deliveriesService.resetStopToPending(id, resetStopTarget.packageId)
        toast.success('Parada revertida a pendiente')
        setResetStopTarget(null)
        await refreshAfterStopAction()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo revertir')
      }
    })
  }

  if (loading) return <PageLoader label="Cargando reparto…" />
  if (error && !data) return <PageLoadError message={error} onRetry={reload} />
  if (!data) return <PageLoader label="Cargando reparto…" />

  const currentStatus = data.delivery?.status
  const canSaveDraft = !id || currentStatus === 'draft'
  const canMarkPrepared = !id || currentStatus === 'draft'
  const canSaveChanges =
    Boolean(id) && (currentStatus === 'prepared' || currentStatus === 'in_progress')

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <BackLink
          to={id ? `/deliveries/${id}` : '/deliveries'}
          label={id ? 'Volver al detalle del reparto' : 'Volver a la tabla de repartos'}
        />
        <h1 className="mt-2 text-2xl font-bold">{id ? 'Editar reparto' : 'Nuevo reparto'}</h1>
        {canManageStops ? (
          <p className="mt-2 text-sm text-text-secondary">
            Podés marcar entregas o incidencias en cada paquete sin salir del formulario.
          </p>
        ) : null}
      </div>

      <Card>
        <div className="grid gap-4 md:grid-cols-2">
          <DateField
            label="Fecha del reparto"
            value={selectedDate}
            onChange={(value) => form.setValue('date', value, { shouldValidate: true })}
            error={form.formState.errors.date?.message}
          />
          <Select
            label="Zona"
            options={deliveryZoneSelectOptions()}
            {...form.register('zone')}
          />
          <Select
            label="Tipo de entrega"
            options={Object.entries(DELIVERY_CHANNEL_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
            error={form.formState.errors.channel?.message}
            {...form.register('channel', {
              onChange: (event) => {
                if (event.target.value !== 'courier') {
                  form.setValue('courierId', '')
                }
              },
            })}
          />
          {channel === 'courier' ? (
            <Select
              label="Correo de destino"
              options={data.couriers
                .filter((courier) => courier.status === 'active')
                .map((courier) => ({
                  value: courier.id,
                  label: `${courier.name} · ${courier.branchName}`,
                }))}
              placeholder="Seleccionar correo"
              error={form.formState.errors.courierId?.message}
              {...form.register('courierId')}
            />
          ) : (
            <div className="hidden md:block" />
          )}
          <Select
            label="Chofer"
            options={data.drivers
              .filter((driver) => driver.status === 'active')
              .map((driver) => ({ value: driver.id, label: driver.name }))}
            placeholder="Seleccionar"
            error={form.formState.errors.driverId?.message}
            {...form.register('driverId')}
          />
          <Select
            label="Vehículo"
            options={data.vehicles
              .filter((vehicle) => vehicle.status === 'active')
              .map((vehicle) => ({
                value: vehicle.id,
                label: `${vehicle.name} (${vehicle.plate})`,
              }))}
            placeholder="Seleccionar"
            error={form.formState.errors.vehicleId?.message}
            {...form.register('vehicleId')}
          />
          <Input className="md:col-span-2" label="Notas" {...form.register('notes')} />
        </div>
        {conflictingDeliveries.length > 0 ? (
          <div className="mt-4">
            <Alert tone="warning" title="Ya existe un reparto para este chofer en esta fecha">
            <p>
              {selectedDriver?.name ?? 'El chofer'} ya tiene{' '}
              {conflictingDeliveries.length === 1 ? 'un reparto' : `${conflictingDeliveries.length} repartos`}{' '}
              el {formatDeliveryDateDisplay(selectedDate)}:{' '}
              {conflictingDeliveries.map((delivery, index) => (
                <span key={delivery.id}>
                  {index > 0 ? ', ' : null}
                  <Link
                    to={`/deliveries/${delivery.id}`}
                    className="font-mono font-semibold text-primary hover:underline"
                  >
                    {delivery.code}
                  </Link>
                </span>
              ))}
              . Podés continuar igual, pero conviene revisar si no es un duplicado.
            </p>
            </Alert>
          </div>
        ) : null}
        {channel === 'courier' ? (
          <p className="mt-3 text-sm text-text-secondary">
            Los SH de este reparto se entregan en la sucursal del correo elegido (Andreani, Correo
            Argentino, etc.), no en el domicilio del destinatario. Solo se pueden incluir paquetes
            con pago por transferencia (acreditada o pendiente).
          </p>
        ) : (
          <p className="mt-3 text-sm text-text-secondary">
            Zona <strong>{deliveryZoneLabel(zone)}</strong>: solo podés sumar paquetes de esa zona.
            Elegí <strong>CABA + GBA</strong> si el chofer reparte en capital y conurbano el mismo día.
          </p>
        )}
      </Card>

      <Card
        title={`Paquetes para ${formatDeliveryDateDisplay(selectedDate)} · ${selected.length} · ${total.toFixed(1)} kg`}
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="rounded-[10px] border border-primary/20 bg-primary-light px-3 py-2 text-sm text-primary-hover">
            Solo se listan SH disponibles (pendientes, reprogramados o no entregados). Los que ya
            salieron a reparto no aparecen.
          </div>
          <Button variant="outline" onClick={() => setRoutePlannerOpen(true)}>
            <Route className="h-4 w-4" />
            {channel === 'courier' ? 'Ver ruta al correo' : 'Planificador de ruta'}
          </Button>
        </div>

        <div className="space-y-5">
          <section
            ref={selectedSectionRef}
            className="rounded-[12px] border-2 border-primary/25 bg-primary-light/40 p-4"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">
                  En este reparto
                  {selected.length > 0 ? (
                    <span className="ml-2 font-normal text-text-secondary">
                      {selected.length} SH · {total.toFixed(1)} kg
                    </span>
                  ) : null}
                </h3>
                <p className="mt-0.5 text-xs text-text-secondary">
                  {channel === 'courier'
                    ? 'Paquetes que irán al correo en este lote.'
                    : 'Orden de visita del chofer. Arrastrá con el ícono ⋮⋮ o usá las flechas.'}
                  {deliveredCount > 0 ? (
                    <>
                      {' '}
                      Los entregados siguen listados como historial del reparto; podés guardar cambios
                      igual.
                    </>
                  ) : null}
                </p>
              </div>
              {pendingInRouteCount > 0 ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const deliveredIds = ids.filter(
                      (packageId) => stopByPackageId.get(packageId)?.status === 'delivered',
                    )
                    const removedIds = ids.filter((packageId) => !deliveredIds.includes(packageId))
                    form.setValue('packageIds', deliveredIds, { shouldDirty: true })
                    setAddressOverrides((current) => {
                      const next = { ...current }
                      for (const packageId of removedIds) delete next[packageId]
                      return next
                    })
                    setOpenAddressEditors((current) => {
                      const next = { ...current }
                      for (const packageId of removedIds) delete next[packageId]
                      return next
                    })
                    setLockedAddressOverrides((current) => {
                      const next = { ...current }
                      for (const packageId of removedIds) delete next[packageId]
                      return next
                    })
                  }}
                >
                  Quitar pendientes
                </Button>
              ) : null}
            </div>

            <DeliveryFormSelectedPackages
              selected={selected}
              channel={channel}
              stopByPackageId={stopByPackageId}
              canManageStops={canManageStops}
              addressOverrides={addressOverrides}
              openAddressEditors={openAddressEditors}
              lockedAddressOverrides={lockedAddressOverrides}
              onReorder={reorder}
              onRemove={remove}
              onOpenAddressEditor={openAddressEditor}
              onAddressEditorOpenChange={(packageId, open) =>
                setOpenAddressEditors((current) => ({ ...current, [packageId]: open }))
              }
              onLockedAddressChange={(packageId, locked) =>
                setLockedAddressOverrides((current) => ({ ...current, [packageId]: locked }))
              }
              onAddressOverrideChange={setOverride}
              onMarkDelivered={openMarkDelivered}
              onMarkFailed={openMarkFailed}
              onRescheduleTomorrow={(stop) => void rescheduleTomorrow(stop)}
              onReschedule={openReschedule}
              onResetPending={setResetStopTarget}
            />
          </section>

          <section>
            <h3 className="mb-1 text-sm font-semibold text-text-primary">Agregar paquetes</h3>
            <p className="mb-3 text-xs text-text-secondary">
              Solo SH disponibles. Al hacer clic se suman al reparto de arriba.
            </p>

            <Input
              placeholder="Buscar SH, titular o dirección"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <div className="mt-3 max-h-52 overflow-auto rounded-[10px] border border-border bg-background">
              {available.slice(0, 20).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="flex w-full items-start gap-3 border-b border-border p-3 text-left last:border-b-0 hover:bg-primary-light/50"
                  onClick={() => add(item.id)}
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-surface text-primary">
                    <PackagePlus className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="font-mono font-semibold">{item.shCode}</span> — {item.ownerName}{' '}
                    <span className="text-text-muted">({item.weight} kg)</span>
                    <span className="mt-0.5 block text-xs text-text-secondary">
                      {formatFullAddress(item)}
                    </span>
                    <span className="mt-0.5 block text-xs text-text-muted">
                      <DestinationBadge destination={item.destinationType} /> · {item.city} ·{' '}
                      {PACKAGE_STATUS_LABELS[item.status]}
                    </span>
                  </span>
                </button>
              ))}
              {available.length === 0 ? (
                <p className="p-4 text-center text-sm text-text-secondary">
                  No hay más paquetes disponibles para agregar.
                </p>
              ) : null}
              {available.length > 20 ? (
                <p className="border-t border-border p-2 text-center text-xs text-text-muted">
                  Mostrando 20 de {available.length}. Refiná la búsqueda.
                </p>
              ) : null}
            </div>
          </section>
        </div>
      </Card>

      <RoutePlannerModal
        open={routePlannerOpen}
        onClose={() => setRoutePlannerOpen(false)}
        zone={zone}
        packages={data.packages}
        available={allAvailable}
        selectedIds={ids}
        courier={selectedCourier}
        onApply={(packageIds) => {
          form.setValue('packageIds', packageIds, { shouldValidate: true })
          toast.success('Ruta aplicada al reparto')
        }}
      />

      <Modal
        open={Boolean(rescheduleStop) && !isGuardOpen}
        onClose={() => setRescheduleStop(null)}
        title="Reprogramar paquete"
        description="El SH sale de este reparto y queda pendiente para la fecha elegida."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRescheduleStop(null)}>
              Cancelar
            </Button>
            <Button onClick={() => void confirmReschedule()}>Confirmar</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <DateField label="Nueva fecha" value={rescheduleDate} onChange={setRescheduleDate} />
          <FailureObservationFields
            value={rescheduleNotes}
            onChange={setRescheduleNotes}
            placeholder="Ej: cliente pide entrega mañana a la mañana"
          />
        </div>
      </Modal>

      <DriverPaymentConfirmModal
        open={paymentConfirmOpen && !isGuardOpen}
        onClose={() => {
          setPaymentConfirmOpen(false)
          setMarkDeliveredStop(null)
        }}
        pkg={markDeliveredPkg ?? null}
        isCourier={channel === 'courier'}
        options={paymentOptions}
        selectedPayment={confirmPayment}
        onSelectPayment={setConfirmPayment}
        onConfirm={() => void confirmMarkDelivered(confirmPayment)}
      />

      <ConfirmDialog
        open={deliveredConfirmOpen && !isGuardOpen}
        title="Marcar como entregado"
        description={
          markDeliveredPkg
            ? `¿Confirmás la entrega de ${markDeliveredPkg.shCode}? Se registrará con la fecha y hora actual.`
            : '¿Confirmás la entrega de este paquete?'
        }
        tone="primary"
        onCancel={() => {
          setDeliveredConfirmOpen(false)
          setMarkDeliveredStop(null)
        }}
        onConfirm={() => void confirmMarkDelivered(markDeliveredPkg?.paymentStatus)}
      />

      <Modal
        open={Boolean(markFailedStop) && !isGuardOpen}
        onClose={() => {
          setMarkFailedStop(null)
          setFailureNotes('')
        }}
        title="Marcar como no entregado"
        description={
          markFailedStop
            ? `${data.packages.find((item) => item.id === markFailedStop.packageId)?.shCode ?? 'Paquete'} · elegí una observación rápida o escribí qué pasó.`
            : undefined
        }
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setMarkFailedStop(null)
                setFailureNotes('')
              }}
            >
              Cancelar
            </Button>
            <Button variant="danger" onClick={() => void confirmMarkFailed()}>
              Confirmar
            </Button>
          </div>
        }
      >
        <FailureObservationFields value={failureNotes} onChange={setFailureNotes} />
      </Modal>

      <ConfirmDialog
        open={Boolean(resetStopTarget) && !isGuardOpen}
        title="Revertir a pendiente"
        description="La parada vuelve a quedar pendiente en este reparto."
        tone="primary"
        onCancel={() => setResetStopTarget(null)}
        onConfirm={() => void confirmResetStop()}
      />

      <div className="flex justify-between gap-2">
        <Button variant="outline" onClick={() => navigate(id ? `/deliveries/${id}` : '/deliveries')}>
          Cancelar y volver
        </Button>
        <div className="flex gap-2">
          {canSaveDraft ? (
            <Button variant="outline" onClick={() => void save('draft')}>
              Guardar borrador
            </Button>
          ) : null}
          {canMarkPrepared ? (
            <Button onClick={() => void save('prepared')}>Marcar preparado</Button>
          ) : null}
          {canSaveChanges ? (
            <Button onClick={() => void saveChanges()}>Guardar cambios</Button>
          ) : null}
        </div>
      </div>

      <Modal
        open={conflictNoticeOpen}
        onClose={dismissConflictNotice}
        title="Ya existe un reparto para este chofer"
        description={`${selectedDriver?.name ?? 'El chofer'} ya tiene ${conflictingDeliveries.length === 1 ? 'un reparto' : `${conflictingDeliveries.length} repartos`} el ${formatDeliveryDateDisplay(selectedDate)}.`}
        footer={
          <div className="flex justify-end">
            <Button onClick={dismissConflictNotice}>Entendido</Button>
          </div>
        }
      >
        <div className="space-y-3 text-sm text-text-secondary">
          <p>Reparto{conflictingDeliveries.length === 1 ? '' : 's'} existente{conflictingDeliveries.length === 1 ? '' : 's'}:</p>
          <ul className="space-y-2">
            {conflictingDeliveries.map((delivery) => (
              <li key={delivery.id}>
                <Link
                  to={`/deliveries/${delivery.id}`}
                  className="font-mono font-semibold text-primary hover:underline"
                  onClick={dismissConflictNotice}
                >
                  {delivery.code}
                </Link>
              </li>
            ))}
          </ul>
          <p>Podés continuar armando este reparto, pero conviene revisar si no es un duplicado.</p>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDuplicateOpen}
        title="Reparto duplicado"
        description={`${selectedDriver?.name ?? 'Este chofer'} ya tiene ${conflictingDeliveries.length === 1 ? 'un reparto' : `${conflictingDeliveries.length} repartos`} el ${formatDeliveryDateDisplay(selectedDate)} (${conflictingDeliveries.map((delivery) => delivery.code).join(', ')}). ¿Querés crear otro reparto igual?`}
        tone="primary"
        confirmLabel="Sí, guardar igual"
        onCancel={() => {
          setConfirmDuplicateOpen(false)
          setPendingStatus(null)
        }}
        onConfirm={() => {
          void form.handleSubmit(async (values) => {
            try {
              await performSave(values, pendingStatus ?? undefined)
            } catch (error) {
              toast.error(error instanceof Error ? error.message : 'No se pudo guardar')
            } finally {
              setConfirmDuplicateOpen(false)
              setPendingStatus(null)
            }
          })()
        }}
      />

      {deliveryDayGuardDialog}
    </div>
  )
}
