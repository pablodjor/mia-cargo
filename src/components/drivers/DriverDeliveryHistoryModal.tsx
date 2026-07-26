import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Eye } from 'lucide-react'
import { TableRowMenu } from '@/components/common/TableActions'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Table, type TableColumn, type TableSortState } from '@/components/ui/Table'
import {
  DELIVERY_CHANNEL_LABELS,
  DELIVERY_STATUS_LABELS,
  DELIVERY_ZONE_LABELS,
} from '@/constants/labels'
import { deliveriesService } from '@/services/deliveries.service'
import type { Courier, Delivery, Driver, FailureReason, Package, Vehicle } from '@/types'
import { formatDeliveryDateDisplay, formatDateTime } from '@/utils/date'
import {
  buildDeliveryReportContext,
  canDownloadDeliveryReport,
  downloadDeliveryReportExcel,
} from '@/utils/delivery-report-export'
import { toast } from 'sonner'

interface DriverDeliveryHistoryModalProps {
  driver: Driver | null
  deliveries: Delivery[]
  packages: Package[]
  couriers: Courier[]
  vehicles: Vehicle[]
  failureReasons: FailureReason[]
  onClose: () => void
}

const deliveryStatuses = Object.entries(DELIVERY_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}))

const DEFAULT_SORT: TableSortState = { key: 'date', direction: 'desc' }

function compareValues(a: string | number, b: string | number) {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), 'es')
}

function getDeliverySortValue(
  delivery: Delivery,
  key: string,
  courierById: Map<string, Courier>,
): string | number {
  switch (key) {
    case 'code':
      return delivery.code
    case 'date':
      return delivery.date
    case 'zone':
      return DELIVERY_ZONE_LABELS[delivery.zone]
    case 'channel':
      return delivery.channel === 'courier'
        ? courierById.get(delivery.courierId ?? '')?.name ?? 'Correo'
        : DELIVERY_CHANNEL_LABELS.last_mile
    case 'progress':
      return deliveriesService.getProgress(delivery).delivered
    case 'status':
      return DELIVERY_STATUS_LABELS[delivery.status]
    case 'updated':
      return delivery.updatedAt
    default:
      return delivery.date
  }
}

export function DriverDeliveryHistoryModal({
  driver,
  deliveries,
  packages,
  couriers,
  vehicles,
  failureReasons,
  onClose,
}: DriverDeliveryHistoryModalProps) {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sort, setSort] = useState<TableSortState>(DEFAULT_SORT)

  const packageById = useMemo(() => new Map(packages.map((pkg) => [pkg.id, pkg])), [packages])
  const courierById = useMemo(() => new Map(couriers.map((item) => [item.id, item])), [couriers])
  const vehicleById = useMemo(() => new Map(vehicles.map((item) => [item.id, item])), [vehicles])
  const failureReasonLabels = useMemo(
    () => new Map(failureReasons.map((item) => [item.id, item.label])),
    [failureReasons],
  )

  useEffect(() => {
    if (!driver) {
      setDateFrom('')
      setDateTo('')
      setStatusFilter('')
      setSort(DEFAULT_SORT)
    }
  }, [driver])

  const allRows = useMemo(() => {
    if (!driver) return []
    return deliveries.filter((delivery) => delivery.driverId === driver.id)
  }, [deliveries, driver])

  const filteredRows = useMemo(
    () =>
      allRows.filter((delivery) => {
        if (dateFrom && delivery.date < dateFrom) return false
        if (dateTo && delivery.date > dateTo) return false
        if (statusFilter && delivery.status !== statusFilter) return false
        return true
      }),
    [allRows, dateFrom, dateTo, statusFilter],
  )

  const rows = useMemo(() => {
    return filteredRows.slice().sort((a, b) => {
      const left = getDeliverySortValue(a, sort.key, courierById)
      const right = getDeliverySortValue(b, sort.key, courierById)
      const result = compareValues(left, right)
      return sort.direction === 'asc' ? result : -result
    })
  }, [filteredRows, sort, courierById])

  const hasFilters = Boolean(dateFrom || dateTo || statusFilter)

  const summary = useMemo(() => {
    const completed = filteredRows.filter((item) => item.status === 'completed').length
    const inProgress = filteredRows.filter((item) => item.status === 'in_progress').length
    const prepared = filteredRows.filter((item) => ['draft', 'prepared'].includes(item.status)).length
    const cancelled = filteredRows.filter((item) => item.status === 'cancelled').length
    return { total: filteredRows.length, completed, inProgress, prepared, cancelled }
  }, [filteredRows])

  const handleSort = (key: string) => {
    setSort((current) => {
      if (current.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
      }
      const defaultDesc = ['date', 'updated', 'progress'].includes(key)
      return { key, direction: defaultDesc ? 'desc' : 'asc' }
    })
  }

  const clearFilters = () => {
    setDateFrom('')
    setDateTo('')
    setStatusFilter('')
  }

  const downloadReport = (delivery: Delivery) => {
    if (!driver) return
    try {
      downloadDeliveryReportExcel(
        buildDeliveryReportContext({
          delivery,
          packagesById: packageById,
          driver,
          courier: delivery.courierId ? courierById.get(delivery.courierId) : undefined,
          vehicle: vehicleById.get(delivery.vehicleId),
          failureReasons: failureReasonLabels,
        }),
      )
      toast.success('Reporte Excel descargado')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo generar el Excel')
    }
  }

  const columns: TableColumn<Delivery>[] = [
    {
      key: 'code',
      header: 'Reparto',
      sortable: true,
      render: (delivery) => (
        <Link
          className="font-mono font-semibold text-primary hover:underline"
          to={`/deliveries/${delivery.id}`}
        >
          {delivery.code}
        </Link>
      ),
    },
    {
      key: 'date',
      header: 'Fecha',
      sortable: true,
      render: (delivery) => formatDeliveryDateDisplay(delivery.date),
    },
    {
      key: 'zone',
      header: 'Zona',
      sortable: true,
      render: (delivery) => DELIVERY_ZONE_LABELS[delivery.zone],
    },
    {
      key: 'channel',
      header: 'Canal',
      sortable: true,
      render: (delivery) =>
        delivery.channel === 'courier'
          ? courierById.get(delivery.courierId ?? '')?.name ?? 'Correo'
          : DELIVERY_CHANNEL_LABELS.last_mile,
    },
    {
      key: 'progress',
      header: 'Resultado',
      sortable: true,
      render: (delivery) => {
        const progress = deliveriesService.getProgress(delivery)
        return (
          <span className="text-sm text-text-primary">
            {progress.delivered}/{progress.total} entregados
            {progress.notDelivered > 0 ? ` · ${progress.notDelivered} no entregados` : ''}
          </span>
        )
      },
    },
    {
      key: 'status',
      header: 'Estado',
      sortable: true,
      render: (delivery) => <StatusBadge status={delivery.status} type="delivery" />,
    },
    {
      key: 'updated',
      header: 'Última actividad',
      sortable: true,
      render: (delivery) => (
        <time className="text-xs text-text-muted" dateTime={delivery.updatedAt}>
          {formatDateTime(delivery.updatedAt)}
        </time>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-[1%] whitespace-nowrap',
      render: (delivery) => (
        <TableRowMenu
          items={[
            { label: 'Ver reparto', icon: Eye, to: `/deliveries/${delivery.id}` },
            ...(canDownloadDeliveryReport(delivery)
              ? [{ label: 'Descargar Excel', icon: Download, onClick: () => downloadReport(delivery) }]
              : []),
          ]}
        />
      ),
    },
  ]

  return (
    <Modal
      open={Boolean(driver)}
      onClose={onClose}
      title={driver ? `Historial de repartos · ${driver.name}` : 'Historial de repartos'}
      description={
        driver
          ? hasFilters
            ? `${summary.total} de ${allRows.length} reparto${allRows.length === 1 ? '' : 's'} con los filtros aplicados.`
            : `${summary.total} reparto${summary.total === 1 ? '' : 's'} registrados para este chofer.`
          : undefined
      }
      size="xl"
      footer={
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      }
    >
      {driver ? (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
            <Input
              label="Desde"
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
            <Input
              label="Hasta"
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(event) => setDateTo(event.target.value)}
            />
            <Select
              label="Estado"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              options={deliveryStatuses}
              placeholder="Todos"
            />
            <Button
              type="button"
              variant="outline"
              className="md:mb-0.5"
              disabled={!hasFilters}
              onClick={clearFilters}
            >
              Limpiar
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-text-primary ring-1 ring-border">
              Total {summary.total}
            </span>
            {summary.completed > 0 ? (
              <span className="rounded-full bg-success-light px-3 py-1 text-xs font-semibold text-success">
                {summary.completed} finalizado{summary.completed === 1 ? '' : 's'}
              </span>
            ) : null}
            {summary.inProgress > 0 ? (
              <span className="rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary">
                {summary.inProgress} en curso
              </span>
            ) : null}
            {summary.prepared > 0 ? (
              <span className="rounded-full bg-warning-light px-3 py-1 text-xs font-semibold text-warning">
                {summary.prepared} preparado{summary.prepared === 1 ? '' : 's'}
              </span>
            ) : null}
            {summary.cancelled > 0 ? (
              <span className="rounded-full bg-danger-light px-3 py-1 text-xs font-semibold text-danger">
                {summary.cancelled} cancelado{summary.cancelled === 1 ? '' : 's'}
              </span>
            ) : null}
          </div>

          <Table
            columns={columns}
            data={rows}
            rowKey={(delivery) => delivery.id}
            sort={sort}
            onSort={handleSort}
            empty={
              <p className="py-8 text-center text-sm text-text-secondary">
                {allRows.length === 0
                  ? 'Este chofer aún no tiene repartos registrados en la demo.'
                  : 'No hay repartos que coincidan con la fecha o el estado seleccionados.'}
              </p>
            }
          />
        </div>
      ) : null}
    </Modal>
  )
}
