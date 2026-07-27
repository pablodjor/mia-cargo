import { zodResolver } from '@hookform/resolvers/zod'
import { RefreshCw, Eye, Pencil, RefreshCcw, History, Ban } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { TableRowMenu } from '@/components/common/TableActions'
import { PackageDetailModal } from '@/components/common/PackageDetailModal'
import { PaymentBadge } from '@/components/common/PaymentBadge'
import { PackageDeliveredConfirmFields } from '@/components/packages/PackageDeliveredConfirmFields'
import { PackageDeliveryAssignmentAlert } from '@/components/packages/PackageDeliveryAssignmentAlert'
import { PackageDeliveryPicker } from '@/components/packages/PackageDeliveryPicker'
import {
  defaultRescheduleDate,
  PackageStatusOutcomeFields,
  statusOutcomeRequiresDelivery,
} from '@/components/packages/PackageStatusOutcomeFields'
import {
  PackagePersonAddressSection,
} from '@/components/packages/PackagePersonAddressSection'
import { PackageAddressExtrasFields } from '@/components/packages/PackageAddressExtrasFields'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PackagesListEmpty } from '@/components/common/list-empty-states'
import { PackageShCodeButton } from '@/components/common/PackageShCodeButton'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { PageLoader } from '@/components/ui/PageLoader'
import { Pagination } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Select'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Table, type TableColumn, type TableSortState } from '@/components/ui/Table'
import { Textarea } from '@/components/ui/Textarea'
import {
  DESTINATION_LABELS,
  PACKAGE_STATUS_LABELS,
  PAYMENT_STATUS_DESCRIPTIONS,
  PAYMENT_STATUS_LABELS,
} from '@/constants/labels'
import { DRIVER_DEFAULT_FAILURE_REASON_ID } from '@/constants/driver-observations'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useDeliveryDayGuard, deliveryDateById } from '@/hooks/useDeliveryDayGuard'
import { usePagination } from '@/hooks/usePagination'
import { packageSchema, type PackageFormValues } from '@/schemas'
import { exchangeService } from '@/services/exchange.service'
import { deliveriesService } from '@/services/deliveries.service'
import { driversService } from '@/services/drivers.service'
import { packagesService } from '@/services/packages.service'
import { personsService } from '@/services/persons.service'
import type { OfficialUsdRate } from '@/types/exchange'
import type { Package, PackageStatus, PaymentStatus } from '@/types'
import { formatDateTime, formatDeliveryDateDisplay } from '@/utils/date'
import { calculatePackageTotals, formatArs, formatUsd } from '@/utils/money'
import { applyPersonToPackageFields } from '@/utils/person-stats'
import {
  applyPersonAddressOption,
  CUSTOM_ADDRESS_KEY,
  findPersonAddressOption,
  getPersonAddressOptions,
  PERSON_DEFAULT_ADDRESS_KEY,
  resolvePersonAddressKey,
} from '@/utils/person-addresses'
import {
  canRegisterWarehousePickup,
  collectionDeskPaymentOptions,
  deliveryRoutePaymentOptions,
  isCourierPackage,
  isOnActiveDeliveryRoute,
  paymentOptionsForPackage,
  type PackageDeskDeliveryMethod,
} from '@/utils/payment-rules'
import {
  deliveryAssignmentOptionsForPackage,
  deliveryOptionsForPackageStatus,
  pickDefaultDeliveryId,
} from '@/utils/package-delivery-assignment'
import { buildPackageDeliveryAssignmentMap } from '@/utils/package-delivery-info'
import { sortRows, toggleTableSort } from '@/utils/table-sort'
import {
  packageStatusFlowKind,
  packageStatusModalConfirmLabel,
  packageStatusModalSize,
  packageStatusModalTitle,
  packageStatusSimpleHint,
  packageCanBeAssignedToDelivery,
} from '@/utils/package-status-flow'
import { paymentSelectOptions } from '@/utils/payment-display'

const statuses = Object.entries(PACKAGE_STATUS_LABELS).map(([value, label]) => ({ value, label }))

const DEFAULT_SORT: TableSortState = { key: 'code', direction: 'desc' }

function getPackageSortValue(
  pkg: Package,
  key: string,
  assignmentByPackageId: ReturnType<typeof buildPackageDeliveryAssignmentMap>,
): string | number {
  switch (key) {
    case 'code':
      return pkg.shCode
    case 'owner':
      return pkg.ownerName
    case 'destination':
      return `${pkg.city}, ${pkg.province}`
    case 'price':
      return pkg.totalArs
    case 'payment':
      return PAYMENT_STATUS_LABELS[pkg.paymentStatus]
    case 'status':
      return PACKAGE_STATUS_LABELS[pkg.status]
    case 'delivery':
      return assignmentByPackageId.get(pkg.id)?.deliveryCode ?? ''
    default:
      return pkg.updatedAt
  }
}
const destinations = Object.entries(DESTINATION_LABELS).map(([value, label]) => ({ value, label }))

function createBlank(rate: number): PackageFormValues {
  return {
    personId: '',
    shCode: '',
    ownerName: '',
    ownerPhone: '',
    weight: 1,
    address: '',
    city: '',
    province: '',
    postalCode: '',
    destinationType: 'caba',
    status: 'pending',
    notes: '',
    addressUnit: '',
    addressBell: '',
    addressPlaceType: undefined,
    pricePerKgUsd: 8,
    usdRate: rate,
    paymentStatus: 'pending',
  }
}

export default function PackagesPage() {
  const { guardDeliveryDayAction, deliveryDayGuardDialog, isGuardOpen } = useDeliveryDayGuard()
  const { data, reload, loading } = useAsyncData(async () => ({
    packages: await packagesService.getAll(),
    deliveries: await deliveriesService.getAll(),
    drivers: await driversService.getAll(),
    persons: await personsService.getAll(),
  }))
  const packages = data?.packages ?? []
  const deliveries = data?.deliveries ?? []
  const drivers = data?.drivers ?? []
  const persons = data?.persons ?? []
  const [query, setQuery] = useState({
    sh: '',
    name: '',
    status: '',
    destination: '',
    province: '',
  })
  const [sort, setSort] = useState<TableSortState>(DEFAULT_SORT)
  const [editing, setEditing] = useState<Package | null | undefined>(undefined)
  const [detail, setDetail] = useState<Package | null>(null)
  const [statusTarget, setStatusTarget] = useState<Package | null>(null)
  const [statusDraft, setStatusDraft] = useState<PackageStatus>('pending')
  const [statusDeliveryMethod, setStatusDeliveryMethod] =
    useState<PackageDeskDeliveryMethod>('warehouse_pickup')
  const [statusDeliveryPayment, setStatusDeliveryPayment] = useState<PaymentStatus>('paid')
  const [statusDeliveryNotes, setStatusDeliveryNotes] = useState('')
  const [statusSelectedDeliveryId, setStatusSelectedDeliveryId] = useState('')
  const [statusFailureNotes, setStatusFailureNotes] = useState('')
  const [statusRescheduleDate, setStatusRescheduleDate] = useState(defaultRescheduleDate)
  const [cancelTarget, setCancelTarget] = useState<Package | null>(null)
  const [registerPickupAtDesk, setRegisterPickupAtDesk] = useState(false)
  const [rateInfo, setRateInfo] = useState<OfficialUsdRate | null>(null)
  const [loadingRate, setLoadingRate] = useState(false)
  const [selectedAddressKey, setSelectedAddressKey] = useState(PERSON_DEFAULT_ADDRESS_KEY)
  const [addressEditorOpen, setAddressEditorOpen] = useState(false)

  const form = useForm<PackageFormValues>({
    resolver: zodResolver(packageSchema),
    defaultValues: createBlank(1501),
  })

  const weight = form.watch('weight') || 0
  const pricePerKgUsd = form.watch('pricePerKgUsd') || 0
  const usdRate = form.watch('usdRate') || 0
  const totals = useMemo(
    () => calculatePackageTotals(weight, pricePerKgUsd, usdRate),
    [weight, pricePerKgUsd, usdRate],
  )

  const loadRate = async (applyToForm = false) => {
    setLoadingRate(true)
    try {
      const rate = await exchangeService.getOfficialUsd()
      setRateInfo(rate)
      if (applyToForm || editing === null) {
        form.setValue('usdRate', rate.sell, { shouldValidate: true })
      }
      if (rate.isFallback) {
        toast.message('Usando cotización de respaldo', {
          description: 'No se pudo consultar Bluelytics en este momento.',
        })
      }
    } finally {
      setLoadingRate(false)
    }
  }

  useEffect(() => {
    void loadRate(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(
    () =>
      packages.filter(
        (item) =>
          (!query.sh || item.shCode.includes(query.sh)) &&
          (!query.name || item.ownerName.toLowerCase().includes(query.name.toLowerCase())) &&
          (!query.status || item.status === query.status) &&
          (!query.destination || item.destinationType === query.destination) &&
          (!query.province || item.province.toLowerCase().includes(query.province.toLowerCase())),
      ),
    [packages, query],
  )

  const assignmentByPackageId = useMemo(
    () => buildPackageDeliveryAssignmentMap(packages, deliveries, drivers),
    [packages, deliveries, drivers],
  )

  const sorted = useMemo(
    () => sortRows(filtered, sort, (row, key) => getPackageSortValue(row, key, assignmentByPackageId)),
    [filtered, sort, assignmentByPackageId],
  )

  const pager = usePagination(sorted)

  const handleSort = (key: string) => {
    setSort((current) =>
      toggleTableSort(current, key, ['code', 'price', 'delivery', 'updated']),
    )
  }

  const openForm = async (item?: Package) => {
    const rate = rateInfo ?? (await exchangeService.getOfficialUsd())
    setRateInfo(rate)
    setEditing(item ?? null)
    setRegisterPickupAtDesk(false)
    setAddressEditorOpen(false)
    if (item) {
      form.reset({
        personId: item.personId ?? '',
        shCode: item.shCode,
        ownerName: item.ownerName,
        ownerPhone: item.ownerPhone,
        weight: item.weight,
        address: item.address,
        city: item.city,
        province: item.province,
        postalCode: item.postalCode,
        destinationType: item.destinationType,
        addressUnit: item.addressUnit ?? '',
        addressBell: item.addressBell ?? '',
        addressPlaceType: item.addressPlaceType,
        status: item.status,
        notes: item.notes ?? '',
        pricePerKgUsd: item.pricePerKgUsd,
        usdRate: item.usdRate,
        paymentStatus: item.paymentStatus,
      })
      const linkedPerson = item.personId ? persons.find((person) => person.id === item.personId) : undefined
      if (linkedPerson) {
        const options = getPersonAddressOptions(linkedPerson, packages, item.id)
        setSelectedAddressKey(
          resolvePersonAddressKey(linkedPerson, item, options),
        )
      } else {
        setSelectedAddressKey(PERSON_DEFAULT_ADDRESS_KEY)
      }
    } else {
      form.reset(createBlank(rate.sell))
      setSelectedAddressKey(PERSON_DEFAULT_ADDRESS_KEY)
    }
  }

  const save = form.handleSubmit(async (values) => {
    try {
      const payload = {
        ...values,
        personId: values.personId || undefined,
        addressUnit: values.addressUnit?.trim() || undefined,
        addressBell: values.addressBell?.trim() || undefined,
        addressPlaceType: values.addressPlaceType || undefined,
        ...calculatePackageTotals(values.weight, values.pricePerKgUsd, values.usdRate),
      }
      if (editing) {
        const canPickup = canRegisterWarehousePickup(editing)
        if (registerPickupAtDesk && canPickup) {
          const { status: _status, paymentStatus, ...rest } = payload
          await packagesService.update(editing.id, rest)
          await packagesService.registerWarehousePickup(editing.id, paymentStatus, {
            method: 'warehouse_pickup',
          })
          toast.success('Paquete actualizado · retiro en depósito registrado')
        } else {
          await packagesService.update(editing.id, payload)
          toast.success('Paquete guardado')
        }
      } else {
        await packagesService.create(payload)
        toast.success('Paquete guardado')
      }
      setEditing(undefined)
      reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar')
    }
  })

  const paymentOptions = useMemo(() => {
    const allowed = new Set(paymentOptionsForPackage(editing ?? null, deliveries))
    if (editing?.paymentStatus) allowed.add(editing.paymentStatus)
    return paymentSelectOptions([...allowed])
  }, [editing, deliveries])

  const editingCourierDelivery = editing ? isCourierPackage(editing, deliveries) : false
  const editingCanPickup = editing ? canRegisterWarehousePickup(editing) : false
  const editingOnActiveRoute = editing ? isOnActiveDeliveryRoute(editing, deliveries) : false
  const paymentStatus = form.watch('paymentStatus')
  const selectedPersonId = form.watch('personId')
  const addressValues = form.watch(['address', 'city', 'province', 'postalCode', 'destinationType'])
  const selectedPerson = useMemo(
    () => persons.find((person) => person.id === selectedPersonId),
    [persons, selectedPersonId],
  )
  const usingLinkedPerson = Boolean(selectedPerson)

  const personSavedAddresses = useMemo(() => {
    if (!selectedPerson) return []
    return getPersonAddressOptions(selectedPerson, packages, editing?.id)
  }, [selectedPerson, packages, editing?.id])

  const applySavedAddressOption = (key: string, person = selectedPerson) => {
    if (!person) return
    const options = getPersonAddressOptions(person, packages, editing?.id)
    const option = findPersonAddressOption(options, key)
    if (!option) return
    const fields = applyPersonAddressOption(option)
    form.setValue('address', fields.address, { shouldValidate: true, shouldDirty: true })
    form.setValue('city', fields.city, { shouldValidate: true, shouldDirty: true })
    form.setValue('province', fields.province, { shouldValidate: true, shouldDirty: true })
    form.setValue('postalCode', fields.postalCode, { shouldValidate: true, shouldDirty: true })
    form.setValue('destinationType', fields.destinationType, { shouldValidate: true, shouldDirty: true })
    form.setValue('addressUnit', fields.addressUnit, { shouldDirty: true })
    form.setValue('addressBell', fields.addressBell, { shouldDirty: true })
    form.setValue('addressPlaceType', fields.addressPlaceType, { shouldDirty: true })
  }

  const applyPersonFields = (person: (typeof persons)[number], keepCustomAddress = false) => {
    const fields = applyPersonToPackageFields(person)
    form.setValue('personId', person.id, { shouldDirty: true })
    form.setValue('ownerName', fields.ownerName, { shouldValidate: true })
    form.setValue('ownerPhone', fields.ownerPhone, { shouldValidate: true })
    if (!keepCustomAddress) {
      form.setValue('address', fields.address, { shouldValidate: true })
      form.setValue('city', fields.city, { shouldValidate: true })
      form.setValue('province', fields.province, { shouldValidate: true })
      form.setValue('postalCode', fields.postalCode, { shouldValidate: true })
      form.setValue('destinationType', fields.destinationType, { shouldValidate: true })
      form.setValue('addressUnit', fields.addressUnit ?? '', { shouldDirty: true })
      form.setValue('addressBell', fields.addressBell ?? '', { shouldDirty: true })
      form.setValue('addressPlaceType', fields.addressPlaceType, { shouldDirty: true })
    }
  }

  const applyPerson = (personId: string) => {
    form.setValue('personId', personId, { shouldDirty: true })
    if (!personId) {
      setSelectedAddressKey(PERSON_DEFAULT_ADDRESS_KEY)
      setAddressEditorOpen(false)
      return
    }
    const person = persons.find((item) => item.id === personId)
    if (!person) return
    applyPersonFields(person)
    setSelectedAddressKey(PERSON_DEFAULT_ADDRESS_KEY)
    applySavedAddressOption(PERSON_DEFAULT_ADDRESS_KEY, person)
    setAddressEditorOpen(false)
  }

  const selectPersonAddress = (key: string) => {
    setSelectedAddressKey(key)
    applySavedAddressOption(key)
    setAddressEditorOpen(false)
  }

  const useCustomPersonAddress = () => {
    if (!selectedPerson) return
    const fields = applyPersonToPackageFields(selectedPerson)
    form.setValue('address', '', { shouldValidate: true, shouldDirty: true })
    form.setValue('city', fields.city, { shouldValidate: true, shouldDirty: true })
    form.setValue('province', fields.province, { shouldValidate: true, shouldDirty: true })
    form.setValue('postalCode', fields.postalCode, { shouldValidate: true, shouldDirty: true })
    form.setValue('destinationType', fields.destinationType, { shouldValidate: true, shouldDirty: true })
    form.setValue('addressUnit', '', { shouldDirty: true })
    form.setValue('addressBell', '', { shouldDirty: true })
    form.setValue('addressPlaceType', undefined, { shouldDirty: true })
    setSelectedAddressKey(CUSTOM_ADDRESS_KEY)
    setAddressEditorOpen(true)
  }

  const updateAddressFields = (values: Partial<PackageFormValues>) => {
    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined) {
        form.setValue(key as keyof PackageFormValues, value, { shouldValidate: true, shouldDirty: true })
      }
    })
    if (selectedPerson) {
      setSelectedAddressKey(CUSTOM_ADDRESS_KEY)
    }
  }

  const activePersons = useMemo(
    () => persons.filter((person) => person.status === 'active'),
    [persons],
  )

  const editingAssignment = editing ? assignmentByPackageId.get(editing.id) : undefined
  const statusTargetAssignment = statusTarget
    ? assignmentByPackageId.get(statusTarget.id)
    : undefined

  const statusTargetOnActiveRoute = statusTarget
    ? isOnActiveDeliveryRoute(statusTarget, deliveries)
    : false

  const statusFlowKind = packageStatusFlowKind(statusDraft)
  const statusDeliveryOptions = useMemo(() => {
    if (!statusTarget) return []
    return deliveryOptionsForPackageStatus(
      statusTarget,
      deliveries,
      drivers,
      statusDraft,
      statusDeliveryMethod === 'delivery_route' ? 'delivery_route' : undefined,
    )
  }, [statusTarget, statusDraft, statusDeliveryMethod, deliveries, drivers])

  const resetStatusOutcomeFields = (pkg: Package) => {
    setStatusFailureNotes(pkg.failureNotes ?? '')
    setStatusRescheduleDate(defaultRescheduleDate())
  }

  const openStatusModal = (pkg: Package) => {
    const routeOptions = deliveryOptionsForPackageStatus(pkg, deliveries, drivers, pkg.status)
    const defaultDeliveryId = pickDefaultDeliveryId(pkg, routeOptions)
    const deliverOptions = deliveryOptionsForPackageStatus(
      pkg,
      deliveries,
      drivers,
      'delivered',
      'delivery_route',
    )
    const defaultMethod = deliverOptions.length > 0 ? 'delivery_route' : 'warehouse_pickup'

    setStatusDraft(pkg.status)
    setStatusDeliveryMethod(defaultMethod)
    setStatusSelectedDeliveryId(defaultDeliveryId)
    const defaultPayment =
      defaultMethod === 'delivery_route' && defaultDeliveryId
        ? deliveryRoutePaymentOptions(pkg, deliveries, defaultDeliveryId)[0]?.value ?? 'paid'
        : pkg.paymentStatus === 'pending'
          ? 'paid'
          : pkg.paymentStatus
    setStatusDeliveryPayment(defaultPayment)
    setStatusDeliveryNotes('')
    resetStatusOutcomeFields(pkg)
    setStatusTarget(pkg)
  }

  const handleStatusDraftChange = (status: PackageStatus) => {
    setStatusDraft(status)
    if (!statusTarget) return

    const options = deliveryOptionsForPackageStatus(statusTarget, deliveries, drivers, status)
    setStatusSelectedDeliveryId(pickDefaultDeliveryId(statusTarget, options))

    if (status === 'not_delivered' || status === 'rescheduled') {
      resetStatusOutcomeFields(statusTarget)
      return
    }

    if (status === 'delivered') {
      const assignmentOptions = deliveryOptionsForPackageStatus(
        statusTarget,
        deliveries,
        drivers,
        'delivered',
        'delivery_route',
      )
      const defaultDeliveryId = pickDefaultDeliveryId(statusTarget, assignmentOptions)
      const defaultMethod = assignmentOptions.length > 0 ? 'delivery_route' : 'warehouse_pickup'
      setStatusDeliveryMethod(defaultMethod)
      setStatusSelectedDeliveryId(defaultDeliveryId)
      const defaultPayment =
        defaultMethod === 'delivery_route' && defaultDeliveryId
          ? deliveryRoutePaymentOptions(statusTarget, deliveries, defaultDeliveryId)[0]?.value ??
            'paid'
          : statusTarget.paymentStatus === 'pending'
            ? 'paid'
            : statusTarget.paymentStatus
      setStatusDeliveryPayment(defaultPayment)
    }
  }

  const handleStatusDeliveryMethodChange = (method: PackageDeskDeliveryMethod) => {
    setStatusDeliveryMethod(method)
    if (!statusTarget) return
    if (method === 'delivery_route') {
      const options = deliveryAssignmentOptionsForPackage(statusTarget, deliveries, drivers)
      const deliveryId =
        statusSelectedDeliveryId && options.some((item) => item.deliveryId === statusSelectedDeliveryId)
          ? statusSelectedDeliveryId
          : options[0]?.deliveryId ?? ''
      setStatusSelectedDeliveryId(deliveryId)
      const paymentOptions = deliveryRoutePaymentOptions(statusTarget, deliveries, deliveryId)
      if (paymentOptions[0]) setStatusDeliveryPayment(paymentOptions[0].value)
      return
    }
    const deskOptions = collectionDeskPaymentOptions(statusTarget, deliveries)
    const paid = deskOptions.find((item) => item.value === 'paid')
    setStatusDeliveryPayment(paid?.value ?? deskOptions[0]?.value ?? 'paid')
  }

  const handleStatusDeliveryIdChange = (deliveryId: string) => {
    setStatusSelectedDeliveryId(deliveryId)
    if (!statusTarget) return
    const paymentOptions = deliveryRoutePaymentOptions(statusTarget, deliveries, deliveryId)
    if (paymentOptions[0]) setStatusDeliveryPayment(paymentOptions[0].value)
  }

  const saveStatusChange = async () => {
    if (!statusTarget) return

    const runWithDeliveryGuard = async (
      deliveryId: string | null | undefined,
      action: () => Promise<void>,
    ) => {
      const deliveryDate = deliveryDateById(deliveries, deliveryId)
      if (!deliveryDate) {
        await action()
        return true
      }
      return guardDeliveryDayAction(deliveryDate, action)
    }

    try {
      if (statusDraft === 'delivered') {
        if (statusDeliveryMethod === 'delivery_route') {
          if (!statusSelectedDeliveryId) {
            toast.error('Elegí un reparto')
            return
          }
          const assignment = deliveryAssignmentOptionsForPackage(
            statusTarget,
            deliveries,
            drivers,
          ).find((item) => item.deliveryId === statusSelectedDeliveryId)
          if (!assignment) {
            toast.error('El reparto elegido no está disponible para este paquete')
            return
          }
          const confirmed = await runWithDeliveryGuard(statusSelectedDeliveryId, async () => {
            if (!assignment.alreadyAssigned) {
              await deliveriesService.addPackage(statusSelectedDeliveryId, statusTarget.id)
            }
            await deliveriesService.markStop(
              statusSelectedDeliveryId,
              statusTarget.id,
              'delivered',
              { paymentStatus: statusDeliveryPayment },
            )
          })
          if (!confirmed) return
        } else if (statusTargetOnActiveRoute) {
          toast.error('El paquete está en ruta. Elegí Reparto para registrar la entrega.')
          return
        } else if (statusDeliveryMethod === 'other') {
          await packagesService.registerOtherDelivery(
            statusTarget.id,
            statusDeliveryPayment,
            statusDeliveryNotes,
          )
        } else if (canRegisterWarehousePickup(statusTarget)) {
          await packagesService.registerWarehousePickup(
            statusTarget.id,
            statusDeliveryPayment,
            {
              method:
                statusDeliveryMethod === 'counter' ? 'counter' : 'warehouse_pickup',
            },
          )
        } else {
          await packagesService.update(statusTarget.id, {
            status: 'delivered',
            paymentStatus: statusDeliveryPayment,
          })
        }
        toast.success('Entrega registrada')
      } else if (statusDraft === 'not_delivered') {
        if (!statusFailureNotes.trim()) {
          toast.error('Seleccioná o escribí una observación')
          return
        }
        if (statusOutcomeRequiresDelivery(statusDraft, statusDeliveryOptions)) {
          if (!statusSelectedDeliveryId) {
            toast.error('Elegí el reparto donde falló la entrega')
            return
          }
          const confirmed = await runWithDeliveryGuard(statusSelectedDeliveryId, async () => {
            await deliveriesService.markStop(
              statusSelectedDeliveryId,
              statusTarget.id,
              'not_delivered',
              {
                failureReasonId: DRIVER_DEFAULT_FAILURE_REASON_ID,
                failureNotes: statusFailureNotes.trim(),
              },
            )
          })
          if (!confirmed) return
        } else if (statusTarget.deliveryId) {
          const delivery = deliveries.find((item) => item.id === statusTarget.deliveryId)
          if (delivery?.status === 'in_progress') {
            const confirmed = await runWithDeliveryGuard(statusTarget.deliveryId, async () => {
              await deliveriesService.markStop(
                statusTarget.deliveryId!,
                statusTarget.id,
                'not_delivered',
                {
                  failureReasonId: DRIVER_DEFAULT_FAILURE_REASON_ID,
                  failureNotes: statusFailureNotes.trim(),
                },
              )
            })
            if (!confirmed) return
          } else {
            await packagesService.updateStatus(statusTarget.id, 'not_delivered', {
              failureReasonId: DRIVER_DEFAULT_FAILURE_REASON_ID,
              failureNotes: statusFailureNotes.trim(),
              lastAttemptAt: new Date().toISOString(),
            })
          }
        } else {
          await packagesService.updateStatus(statusTarget.id, 'not_delivered', {
            failureReasonId: DRIVER_DEFAULT_FAILURE_REASON_ID,
            failureNotes: statusFailureNotes.trim(),
            lastAttemptAt: new Date().toISOString(),
          })
        }
        toast.success('No entrega registrada')
      } else if (statusDraft === 'rescheduled') {
        if (!statusFailureNotes.trim()) {
          toast.error('Seleccioná o escribí una observación')
          return
        }
        if (!statusRescheduleDate) {
          toast.error('Elegí la nueva fecha')
          return
        }
        if (statusOutcomeRequiresDelivery(statusDraft, statusDeliveryOptions)) {
          if (!statusSelectedDeliveryId) {
            toast.error('Elegí el reparto donde se intentó entregar')
            return
          }
          const confirmed = await runWithDeliveryGuard(statusSelectedDeliveryId, async () => {
            await deliveriesService.rescheduleStop(
              statusSelectedDeliveryId,
              statusTarget.id,
              {
                failureReasonId: DRIVER_DEFAULT_FAILURE_REASON_ID,
                failureNotes: statusFailureNotes.trim(),
                dateISO: statusRescheduleDate,
              },
            )
          })
          if (!confirmed) return
        } else {
          await packagesService.reschedule(
            statusTarget.id,
            formatDeliveryDateDisplay(statusRescheduleDate),
            {
              failureReasonId: DRIVER_DEFAULT_FAILURE_REASON_ID,
              failureNotes: statusFailureNotes.trim(),
            },
          )
        }
        toast.success(`Reprogramado para ${formatDeliveryDateDisplay(statusRescheduleDate)}`)
      } else if (statusDraft === 'pending') {
        if (statusTarget.deliveryId) {
          await deliveriesService.removePackage(statusTarget.deliveryId, statusTarget.id)
        } else if (statusTarget.status !== 'pending') {
          await packagesService.updateStatus(statusTarget.id, 'pending')
        }
        toast.success('Estado actualizado')
      } else if (statusDraft === 'cancelled') {
        if (statusTarget.deliveryId) {
          await deliveriesService.removePackage(statusTarget.deliveryId, statusTarget.id)
        }
        await packagesService.cancel(statusTarget.id)
        toast.success('Paquete cancelado')
      } else if (statusFlowKind === 'delivery_assign') {
        if (!packageCanBeAssignedToDelivery(statusTarget.status)) {
          toast.error('Un paquete entregado o cancelado no se puede asignar a un reparto')
          return
        }
        if (!statusSelectedDeliveryId) {
          toast.error('Elegí un reparto')
          return
        }
        const options = deliveryOptionsForPackageStatus(
          statusTarget,
          deliveries,
          drivers,
          statusDraft,
        )
        const assignment = options.find((item) => item.deliveryId === statusSelectedDeliveryId)
        if (!assignment) {
          toast.error(
            statusDraft === 'in_route'
              ? 'Elegí un reparto en curso para marcar En reparto'
              : 'Elegí un reparto en borrador o preparado para marcar Asignado',
          )
          return
        }
        if (statusTarget.deliveryId && statusTarget.deliveryId !== statusSelectedDeliveryId) {
          await deliveriesService.removePackage(statusTarget.deliveryId, statusTarget.id)
        }
        if (
          assignment.alreadyAssigned &&
          statusTarget.deliveryId === statusSelectedDeliveryId
        ) {
          if (statusTarget.status !== statusDraft) {
            await packagesService.updateStatus(statusTarget.id, statusDraft)
          }
        } else {
          await deliveriesService.addPackage(statusSelectedDeliveryId, statusTarget.id)
        }
        toast.success('Estado actualizado')
      } else {
        await packagesService.updateStatus(statusTarget.id, statusDraft)
        toast.success('Estado actualizado')
      }
      setStatusTarget(null)
      reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar')
    }
  }

  const columns: TableColumn<Package>[] = [
    {
      key: 'code',
      header: 'Código',
      sortable: true,
      render: (p) => <PackageShCodeButton pkg={p} />,
    },
    { key: 'owner', header: 'Destinatario', sortable: true, render: (p) => p.ownerName },
    {
      key: 'destination',
      header: 'Destino',
      sortable: true,
      render: (p) => `${p.city}, ${p.province}`,
    },
    {
      key: 'price',
      header: 'Importe',
      sortable: true,
      render: (p) => (
        <div className="text-xs">
          <p className="font-semibold text-text-primary">{formatArs(p.totalArs)}</p>
          <p className="text-text-muted">{formatUsd(p.totalUsd)}</p>
        </div>
      ),
    },
    {
      key: 'payment',
      header: 'Pago',
      sortable: true,
      render: (p) => <PaymentBadge status={p.paymentStatus} />,
    },
    {
      key: 'status',
      header: 'Estado',
      sortable: true,
      render: (p) => <StatusBadge status={p.status} />,
    },
    {
      key: 'delivery',
      header: 'Reparto',
      sortable: true,
      render: (p) => {
        const assignment = assignmentByPackageId.get(p.id)
        if (!assignment) return <span className="text-sm text-text-muted">—</span>
        return (
          <div className="text-xs leading-snug">
            <Link
              to={`/deliveries/${assignment.deliveryId}`}
              className="font-mono font-semibold text-primary hover:underline"
              title={`Ver reparto ${assignment.deliveryCode}`}
            >
              {assignment.deliveryCode}
            </Link>
            {assignment.driverName ? (
              <p className="text-text-muted">{assignment.driverName}</p>
            ) : null}
          </div>
        )
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'w-[1%] whitespace-nowrap',
      render: (p) => (
        <TableRowMenu
          items={[
            { label: 'Ver', icon: Eye, onClick: () => setDetail(p) },
            { label: 'Editar', icon: Pencil, onClick: () => void openForm(p) },
            { label: 'Estado', icon: RefreshCcw, onClick: () => openStatusModal(p) },
            { label: 'Historial', icon: History, to: `/history?entityId=${p.id}` },
            { separator: true },
            { label: 'Cancelar', icon: Ban, onClick: () => setCancelTarget(p), tone: 'danger' },
          ]}
        />
      ),
    },
  ]

  if (loading) return <PageLoader label="Cargando paquetes…" />

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Paquetes</h1>
          <p className="text-sm text-text-secondary">
            Dólar oficial (venta):{' '}
            <strong className="text-primary">
              {rateInfo ? formatArs(rateInfo.sell) : 'Cargando…'}
            </strong>
            {rateInfo ? (
              <span className="text-text-muted">
                {' '}
                · actualizado {formatDateTime(rateInfo.updatedAt)}
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" loading={loadingRate} onClick={() => void loadRate(true)}>
            <RefreshCw className="h-4 w-4" />
            Actualizar dólar
          </Button>
          <Button onClick={() => void openForm()}>Nuevo paquete</Button>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <Input
          placeholder="Código SH"
          value={query.sh}
          onChange={(e) => setQuery({ ...query, sh: e.target.value })}
        />
        <Input
          placeholder="Nombre"
          value={query.name}
          onChange={(e) => setQuery({ ...query, name: e.target.value })}
        />
        <Select
          options={statuses}
          placeholder="Estado"
          value={query.status}
          onChange={(e) => setQuery({ ...query, status: e.target.value })}
        />
        <Select
          options={destinations}
          placeholder="Destino"
          value={query.destination}
          onChange={(e) => setQuery({ ...query, destination: e.target.value })}
        />
        <Input
          placeholder="Provincia"
          value={query.province}
          onChange={(e) => setQuery({ ...query, province: e.target.value })}
        />
      </div>

      <Table
        columns={columns}
        data={pager.pageItems}
        rowKey={(p) => p.id}
        sort={sort}
        onSort={handleSort}
        empty={<PackagesListEmpty />}
      />
      <Pagination {...pager} onPageChange={pager.setPage} />

      <Modal
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        title={editing ? 'Editar paquete' : 'Nuevo paquete'}
        size="xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(undefined)}>
              Cancelar
            </Button>
            <Button onClick={save}>Guardar</Button>
          </div>
        }
      >
        <form className="space-y-5" onSubmit={save}>
          {editing && editingAssignment ? (
            <PackageDeliveryAssignmentAlert assignment={editingAssignment} />
          ) : null}

          {!editing ? (
            <div className="space-y-1.5">
              <Select
                label="Cliente registrado"
                options={activePersons.map((person) => ({
                  value: person.id,
                  label: `${person.name} · ${person.phone}`,
                }))}
                placeholder="Completar manualmente"
                value={selectedPersonId ?? ''}
                onChange={(event) => applyPerson(event.target.value)}
              />
              <p className="text-xs text-text-muted">
                Elegí un cliente existente o completá manualmente: si no elegís uno, se crea
                automáticamente en Clientes con los datos del destinatario.
              </p>
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="Código SH"
              error={form.formState.errors.shCode?.message}
              {...form.register('shCode')}
            />
            {!usingLinkedPerson ? (
              <>
                <Input
                  label="Nombre del propietario"
                  error={form.formState.errors.ownerName?.message}
                  {...form.register('ownerName')}
                />
                <Input
                  label="Teléfono"
                  error={form.formState.errors.ownerPhone?.message}
                  {...form.register('ownerPhone')}
                />
              </>
            ) : null}
            <Input
              label="Peso (kg)"
              type="number"
              step="0.01"
              error={form.formState.errors.weight?.message}
              {...form.register('weight', { valueAsNumber: true })}
            />
            {!usingLinkedPerson ? (
              <>
                <Input
                  label="Dirección"
                  error={form.formState.errors.address?.message}
                  {...form.register('address')}
                />
                <Input
                  label="Localidad"
                  error={form.formState.errors.city?.message}
                  {...form.register('city')}
                />
                <Input
                  label="Provincia"
                  error={form.formState.errors.province?.message}
                  {...form.register('province')}
                />
                <Input
                  label="Código postal"
                  error={form.formState.errors.postalCode?.message}
                  {...form.register('postalCode')}
                />
                <Select
                  label="Tipo de destino"
                  options={destinations}
                  error={form.formState.errors.destinationType?.message}
                  {...form.register('destinationType')}
                />
              </>
            ) : null}
            <Select label="Estado del paquete" options={statuses} {...form.register('status')} />
          </div>

          {editing && editingCanPickup ? (
            <div className="rounded-[12px] border border-border bg-background p-4">
              <Checkbox
                label="Registrar retiro en depósito"
                checked={registerPickupAtDesk}
                onChange={(event) => setRegisterPickupAtDesk(event.target.checked)}
              />
              <p className="mt-2 text-xs text-text-secondary">
                Marcá esto si el cliente retiró el paquete en el mostrador. Al guardar quedará como{' '}
                <strong className="text-text-primary">entregado</strong> con la forma de pago
                elegida abajo.
              </p>
              {editingOnActiveRoute && registerPickupAtDesk ? (
                <p className="mt-2 text-xs text-warning">
                  Este paquete está en ruta. Confirmá la entrega desde el reparto activo.
                </p>
              ) : null}
            </div>
          ) : null}

          {!usingLinkedPerson ? (
            <PackageAddressExtrasFields
              values={{
                addressUnit: form.watch('addressUnit'),
                addressBell: form.watch('addressBell'),
                addressPlaceType: form.watch('addressPlaceType'),
              }}
              onChange={(values) => {
                Object.entries(values).forEach(([key, value]) => {
                  form.setValue(key as keyof PackageFormValues, value as never, { shouldDirty: true })
                })
              }}
            />
          ) : null}

          {selectedPerson ? (
            <PackagePersonAddressSection
              person={selectedPerson}
              savedAddresses={personSavedAddresses}
              selectedAddressKey={selectedAddressKey}
              values={{
                address: addressValues[0] ?? '',
                city: addressValues[1] ?? '',
                province: addressValues[2] ?? '',
                postalCode: addressValues[3] ?? '',
                destinationType: addressValues[4] ?? 'caba',
              }}
              extras={{
                addressUnit: form.watch('addressUnit'),
                addressBell: form.watch('addressBell'),
                addressPlaceType: form.watch('addressPlaceType'),
              }}
              editorOpen={addressEditorOpen}
              destinationOptions={destinations}
              errors={{
                address: form.formState.errors.address?.message,
                city: form.formState.errors.city?.message,
                province: form.formState.errors.province?.message,
                postalCode: form.formState.errors.postalCode?.message,
                destinationType: form.formState.errors.destinationType?.message,
              }}
              onSelectAddress={selectPersonAddress}
              onUseCustomAddress={useCustomPersonAddress}
              onEditorOpenChange={setAddressEditorOpen}
              onChange={updateAddressFields}
              onExtrasChange={(values) => {
                Object.entries(values).forEach(([key, value]) => {
                  form.setValue(key as keyof PackageFormValues, value as never, { shouldDirty: true })
                })
              }}
            />
          ) : null}

          <div className="rounded-[12px] border border-primary/20 bg-primary-light/40 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold text-text-primary">Precio y forma de pago</h3>
                <p className="mt-0.5 text-xs text-text-secondary">
                  Acá definís cómo paga el cliente: efectivo, transferencia, ya pagó, etc.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                loading={loadingRate}
                onClick={() => void loadRate(true)}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Usar dólar de hoy
              </Button>
            </div>

            <Alert title="Dólar oficial (venta)" tone="info">
              {rateInfo
                ? `${formatArs(rateInfo.sell)} · fuente ${rateInfo.source === 'bluelytics' ? 'Bluelytics' : 'respaldo'}`
                : 'Consultando cotización…'}
            </Alert>

            {editingCourierDelivery ? (
              <div className="mt-3">
                <Alert title="Reparto a correo" tone="info">
                  Este paquete va a un correo: solo podés marcar transferencia acreditada o pendiente.
                </Alert>
              </div>
            ) : null}

            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <Input
                label="Precio por kg (USD)"
                type="number"
                step="0.01"
                error={form.formState.errors.pricePerKgUsd?.message}
                {...form.register('pricePerKgUsd', { valueAsNumber: true })}
              />
              <Input
                label="Cotización USD usada"
                type="number"
                step="0.01"
                error={form.formState.errors.usdRate?.message}
                {...form.register('usdRate', { valueAsNumber: true })}
              />
              <Controller
                name="paymentStatus"
                control={form.control}
                render={({ field }) => (
                  <Select
                    label="Forma de pago"
                    options={paymentOptions}
                    value={field.value}
                    name={field.name}
                    onBlur={field.onBlur}
                    onChange={(event) => field.onChange(event.target.value as PaymentStatus)}
                    error={form.formState.errors.paymentStatus?.message}
                  />
                )}
              />
            </div>

            {paymentStatus ? (
              <div className="mt-2 rounded-[10px] border border-border bg-background/60 px-3 py-2.5 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-text-secondary">Forma de pago:</span>
                  <PaymentBadge status={paymentStatus} size="md" />
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-text-muted">
                  {PAYMENT_STATUS_DESCRIPTIONS[paymentStatus]}
                </p>
              </div>
            ) : null}

            <div className="mt-3 grid gap-2 rounded-[10px] bg-surface p-3 text-sm sm:grid-cols-2">
              <p>
                Total USD: <strong>{formatUsd(totals.totalUsd)}</strong>
              </p>
              <p>
                Total ARS: <strong>{formatArs(totals.totalArs)}</strong>
              </p>
            </div>
          </div>

          <Textarea label="Observaciones" {...form.register('notes')} />
        </form>
      </Modal>

      <PackageDetailModal
        pkg={detail}
        onClose={() => setDetail(null)}
        onEdit={(item) => void openForm(item)}
      />

      <Modal
        open={Boolean(statusTarget) && !isGuardOpen}
        onClose={() => setStatusTarget(null)}
        title={packageStatusModalTitle(statusDraft)}
        size={packageStatusModalSize(statusDraft)}
        footer={
          <Button onClick={() => void saveStatusChange()}>
            {packageStatusModalConfirmLabel(statusDraft)}
          </Button>
        }
      >
        {statusTargetAssignment ? (
          <PackageDeliveryAssignmentAlert assignment={statusTargetAssignment} />
        ) : null}
        <Select
          label="Nuevo estado"
          options={statuses}
          value={statusDraft}
          onChange={(event) =>
            handleStatusDraftChange(event.target.value as PackageStatus)
          }
        />
        {statusDraft === 'delivered' && statusTarget ? (
          <PackageDeliveredConfirmFields
            pkg={statusTarget}
            deliveries={deliveries}
            drivers={drivers}
            deliveryMethod={statusDeliveryMethod}
            onDeliveryMethodChange={handleStatusDeliveryMethodChange}
            selectedDeliveryId={statusSelectedDeliveryId}
            onSelectedDeliveryIdChange={handleStatusDeliveryIdChange}
            deliveryMethodNotes={statusDeliveryNotes}
            onDeliveryMethodNotesChange={setStatusDeliveryNotes}
            paymentStatus={statusDeliveryPayment}
            onPaymentStatusChange={setStatusDeliveryPayment}
          />
        ) : statusFlowKind === 'delivery_assign' && statusTarget ? (
          <div className="mt-4 space-y-3 border-t border-border pt-4">
            {!packageCanBeAssignedToDelivery(statusTarget.status) ? (
              <Alert title="No se puede asignar" tone="warning">
                Este paquete ya fue entregado o está cancelado. Para volver a reparto, cambiá
                primero el estado a pendiente o reprogramado.
              </Alert>
            ) : (
              <>
            <p className="text-sm font-semibold text-text-primary">
              {statusDraft === 'in_route' ? '¿En qué reparto va?' : '¿A qué reparto lo asignás?'}
            </p>
            <p className="text-xs text-text-secondary">
              {statusDraft === 'in_route'
                ? 'Solo se listan repartos en curso.'
                : 'Solo se listan repartos en borrador o preparados.'}
            </p>
            <PackageDeliveryPicker
              options={statusDeliveryOptions}
              selectedDeliveryId={statusSelectedDeliveryId}
              onSelectedDeliveryIdChange={setStatusSelectedDeliveryId}
              emptyTitle={
                statusDraft === 'in_route'
                  ? 'Sin repartos en curso'
                  : 'Sin repartos para asignar'
              }
              emptyMessage={
                statusDraft === 'in_route'
                  ? 'No hay repartos en curso donde se pueda agregar este paquete. Iniciá un reparto o usá estado Asignado.'
                  : 'No hay repartos en borrador o preparados disponibles. Creá un reparto nuevo.'
              }
              infoMessage={(option) =>
                option?.alreadyAssigned
                  ? 'El paquete ya está en este reparto. Solo se actualizará el estado.'
                  : statusDraft === 'in_route'
                    ? 'Al confirmar, el paquete se suma al reparto en curso y queda en reparto.'
                    : 'Al confirmar, el paquete se suma al reparto elegido y queda asignado.'
              }
            />
              </>
            )}
          </div>
        ) : (statusDraft === 'not_delivered' || statusDraft === 'rescheduled') && statusTarget ? (
          <PackageStatusOutcomeFields
            status={statusDraft}
            deliveryOptions={statusDeliveryOptions}
            selectedDeliveryId={statusSelectedDeliveryId}
            onSelectedDeliveryIdChange={setStatusSelectedDeliveryId}
            failureNotes={statusFailureNotes}
            onFailureNotesChange={setStatusFailureNotes}
            rescheduleDate={statusRescheduleDate}
            onRescheduleDateChange={setStatusRescheduleDate}
          />
        ) : (
          <p className="mt-2 text-xs text-text-secondary">
            {packageStatusSimpleHint(statusDraft)}
          </p>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Cancelar paquete"
        description="El paquete quedará cancelado."
        tone="danger"
        onCancel={() => setCancelTarget(null)}
        onConfirm={async () => {
          if (!cancelTarget) return
          await packagesService.cancel(cancelTarget.id)
          toast.success('Paquete cancelado')
          setCancelTarget(null)
          reload()
        }}
      />

      {deliveryDayGuardDialog}
    </div>
  )
}
