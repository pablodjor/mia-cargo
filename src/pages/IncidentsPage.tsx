import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarPlus,
  MapPin,
  Clock,
  History,
  Ban,
} from 'lucide-react'
import { toast } from 'sonner'
import { IncidentsListEmpty } from '@/components/common/list-empty-states'
import { PackageShCodeButton } from '@/components/common/PackageShCodeButton'
import { TableRowMenu } from '@/components/common/TableActions'
import { PackageDeliveryAttemptsList } from '@/components/packages/PackageDeliveryAttemptsList'
import { FailureObservationFields } from '@/components/deliveries/FailureObservationFields'
import { PackageDeliveryPicker } from '@/components/packages/PackageDeliveryPicker'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { DateField } from '@/components/ui/DateField'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { PageLoadError } from '@/components/common/PageLoadError'
import { PageLoader } from '@/components/ui/PageLoader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Table, type TableColumn, type TableSortState } from '@/components/ui/Table'
import { INCIDENT_PACKAGE_STATUSES, PACKAGE_STATUS_LABELS } from '@/constants/labels'
import { useAsyncData } from '@/hooks/useAsyncData'
import { deliveriesService } from '@/services/deliveries.service'
import { driversService } from '@/services/drivers.service'
import { packagesService } from '@/services/packages.service'
import { settingsService } from '@/services/settings.service'
import type { Package } from '@/types'
import { addDaysISODate, formatDeliveryDateDisplay } from '@/utils/date'
import { resolvePackageIncidentObservation } from '@/utils/package-attempts'
import {
  deliveryAssignmentOptionsForIncidentReschedule,
  pickDefaultDeliveryId,
} from '@/utils/package-delivery-assignment'
import { sortRows, toggleTableSort } from '@/utils/table-sort'

const DEFAULT_SORT: TableSortState = { key: 'code', direction: 'asc' }

function getIncidentSortValue(pkg: Package, key: string): string | number {
  switch (key) {
    case 'code':
      return pkg.shCode
    case 'address':
      return `${pkg.address}, ${pkg.city}`
    case 'status':
      return PACKAGE_STATUS_LABELS[pkg.status]
    default:
      return pkg.shCode
  }
}

export default function IncidentsPage() {
  const { data, reload, loading, error } = useAsyncData(async () => {
    const [packages, deliveries, drivers, failureReasons] = await Promise.all([
      packagesService.getAll(),
      deliveriesService.getAll(),
      driversService.getAll(),
      settingsService.getFailureReasons(),
    ])
    return { packages, deliveries, drivers, failureReasons }
  })

  const packages = data?.packages ?? []
  const deliveries = data?.deliveries ?? []
  const drivers = data?.drivers ?? []
  const reasonById = useMemo(
    () => new Map((data?.failureReasons ?? []).map((reason) => [reason.id, reason.label])),
    [data?.failureReasons],
  )

  const [reschedule, setReschedule] = useState<Package | null>(null)
  const [address, setAddress] = useState<Package | null>(null)
  const [date, setDate] = useState(addDaysISODate(1))
  const [manualNotes, setManualNotes] = useState('')
  const [selectedDeliveryId, setSelectedDeliveryId] = useState('')
  const [saving, setSaving] = useState(false)
  const [newAddress, setNewAddress] = useState('')
  const [sort, setSort] = useState<TableSortState>(DEFAULT_SORT)

  const deliveryOptions = useMemo(() => {
    if (!reschedule) return []
    return deliveryAssignmentOptionsForIncidentReschedule(reschedule, deliveries, drivers, date)
  }, [reschedule, deliveries, drivers, date])

  useEffect(() => {
    if (!reschedule) return
    setSelectedDeliveryId(pickDefaultDeliveryId(reschedule, deliveryOptions))
  }, [reschedule, deliveryOptions])

  const incidentObservation = useMemo(() => {
    if (!reschedule) return null
    return resolvePackageIncidentObservation(reschedule, reasonById)
  }, [reschedule, reasonById])

  const openReschedule = (pkg: Package, presetDate?: string) => {
    setReschedule(pkg)
    setDate(presetDate ?? addDaysISODate(1))
    setManualNotes('')
    setSelectedDeliveryId('')
  }

  const action = async (callback: () => Promise<unknown>) => {
    try {
      await callback()
      toast.success('Incidencia actualizada')
      reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar')
    }
  }

  const confirmReschedule = async () => {
    if (!reschedule) return
    const failureNotes = incidentObservation?.notes.trim() || manualNotes.trim()
    if (!failureNotes) {
      toast.error('El paquete no tiene observación registrada')
      return
    }
    if (deliveryOptions.length === 0) {
      toast.error('Creá un reparto para la fecha elegida')
      return
    }
    if (!selectedDeliveryId) {
      toast.error('Elegí el reparto')
      return
    }

    setSaving(true)
    try {
      await deliveriesService.rescheduleFromIncident({
        packageId: reschedule.id,
        deliveryId: selectedDeliveryId,
        dateISO: date,
        failureNotes,
        failureReasonId: incidentObservation?.failureReasonId ?? reschedule.failureReasonId,
      })
      toast.success(`Reprogramado para ${formatDeliveryDateDisplay(date)}`)
      setReschedule(null)
      reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo reprogramar')
    } finally {
      setSaving(false)
    }
  }

  const filtered = useMemo(
    () => packages.filter((item) => INCIDENT_PACKAGE_STATUSES.includes(item.status)),
    [packages],
  )

  const rows = useMemo(
    () => sortRows(filtered, sort, getIncidentSortValue),
    [filtered, sort],
  )

  const handleSort = (key: string) => {
    setSort((current) => toggleTableSort(current, key))
  }

  const columns: TableColumn<Package>[] = [
    {
      key: 'code',
      header: 'Paquete',
      sortable: true,
      render: (p) => <PackageShCodeButton pkg={p} />,
    },
    {
      key: 'address',
      header: 'Dirección',
      sortable: true,
      render: (p) => `${p.address}, ${p.city}`,
    },
    {
      key: 'status',
      header: 'Estado',
      sortable: true,
      render: (p) => <StatusBadge status={p.status} />,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-[1%] whitespace-nowrap',
      render: (p) => (
        <TableRowMenu
          items={[
            {
              label: 'Reprogramar entrega',
              icon: CalendarPlus,
              onClick: () => openReschedule(p),
            },
            {
              label: 'Editar dirección',
              icon: MapPin,
              onClick: () => {
                setAddress(p)
                setNewAddress(p.address)
              },
            },
            {
              label: 'Marcar pendiente',
              icon: Clock,
              onClick: () => void action(() => packagesService.updateStatus(p.id, 'pending')),
            },
            { label: 'Historial', icon: History, to: `/history?entityId=${p.id}` },
            { separator: true },
            {
              label: 'Cancelar paquete',
              icon: Ban,
              onClick: () => void action(() => packagesService.cancel(p.id)),
              tone: 'danger',
            },
          ]}
        />
      ),
    },
  ]

  if (loading) return <PageLoader label="Cargando incidencias…" />
  if (error && !data) return <PageLoadError message={error} onRetry={reload} />

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Incidencias</h1>
      <Table
        columns={columns}
        data={rows}
        rowKey={(p) => p.id}
        sort={sort}
        onSort={handleSort}
        empty={<IncidentsListEmpty />}
      />

      <Modal
        open={Boolean(reschedule)}
        onClose={() => {
          if (saving) return
          setReschedule(null)
        }}
        title="Reprogramar entrega"
        description={
          reschedule
            ? `${reschedule.shCode} · ${reschedule.ownerName}`
            : undefined
        }
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" disabled={saving} onClick={() => setReschedule(null)}>
              Cancelar
            </Button>
            <Button
              loading={saving}
              disabled={deliveryOptions.length === 0}
              onClick={() => void confirmReschedule()}
            >
              Confirmar
            </Button>
          </div>
        }
      >
        {reschedule ? (
          <div className="space-y-4">
            <DateField label="Nueva fecha de entrega" value={date} onChange={setDate} />

            {deliveryOptions.length > 0 ? (
              <PackageDeliveryPicker
                options={deliveryOptions}
                selectedDeliveryId={selectedDeliveryId}
                onSelectedDeliveryIdChange={setSelectedDeliveryId}
                emptyTitle="Sin repartos para esta fecha"
                emptyMessage="No hay repartos activos donde se pueda asignar este paquete."
                infoMessage={(option) =>
                  option?.alreadyAssigned
                    ? 'Se registra la reprogramación en el reparto en curso donde está el paquete.'
                    : 'El paquete queda reprogramado y se suma al reparto elegido.'
                }
              />
            ) : (
              <Alert tone="warning" title="Sin repartos disponibles">
                <p className="text-sm">
                  Para reprogramar necesitás un reparto en borrador o preparado para el{' '}
                  {formatDeliveryDateDisplay(date)}, o uno en curso donde esté este paquete.
                </p>
                <Link
                  to={`/deliveries/new?date=${date}&package=${reschedule.id}`}
                  className="mt-3 inline-flex h-10 items-center justify-center rounded-[10px] border border-border bg-surface px-4 text-sm font-semibold text-text-primary shadow-sm hover:border-primary hover:bg-primary-light hover:text-primary-hover"
                  onClick={() => setReschedule(null)}
                >
                  Crear reparto para esta fecha
                </Link>
              </Alert>
            )}

            <PackageDeliveryAttemptsList pkg={reschedule} reasonById={reasonById} />

            {!incidentObservation?.notes ? (
              <FailureObservationFields
                value={manualNotes}
                onChange={setManualNotes}
                placeholder="Este paquete no tiene observación registrada. Escribí por qué no se entregó."
              />
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(address)}
        onClose={() => setAddress(null)}
        title="Editar dirección"
        footer={
          <Button
            onClick={() => {
              if (address) {
                void action(() => packagesService.update(address.id, { address: newAddress }))
              }
              setAddress(null)
            }}
          >
            Guardar
          </Button>
        }
      >
        <Input label="Dirección" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} />
      </Modal>
    </div>
  )
}
