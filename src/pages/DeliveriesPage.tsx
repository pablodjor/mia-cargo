import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Route, Eye, Download, Pencil, Copy, Ban } from 'lucide-react'
import { toast } from 'sonner'
import { DatePeriodFilter, datePeriodFilterLabel } from '@/components/common/DatePeriodFilter'
import { DeliveriesListEmpty } from '@/components/common/list-empty-states'
import { TableRowMenu } from '@/components/common/TableActions'
import { LiveIndicator } from '@/components/ui/LiveIndicator'
import { DeliveryZoneBadge } from '@/components/common/DeliveryZoneBadge'
import { DriverBadge } from '@/components/common/DriverBadge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Table, type TableColumn, type TableSortState } from '@/components/ui/Table'
import { PageLoader } from '@/components/ui/PageLoader'
import { DELIVERY_CHANNEL_LABELS, DELIVERY_STATUS_LABELS, DELIVERY_ZONE_LABELS } from '@/constants/labels'
import { deliveryZoneSelectOptions } from '@/utils/delivery-zone'
import { formatDateShort, formatDeliveryDateDisplay } from '@/utils/date'
import { formatArs } from '@/utils/money'
import { useAsyncData } from '@/hooks/useAsyncData'
import { countPaid, sumCashToCollect } from '@/components/common/PackagePaymentInfo'
import { couriersService } from '@/services/couriers.service'
import { deliveriesService } from '@/services/deliveries.service'
import { driversService } from '@/services/drivers.service'
import { packagesService } from '@/services/packages.service'
import { settingsService } from '@/services/settings.service'
import { vehiclesService } from '@/services/vehicles.service'
import type { Courier, Delivery, Driver, Package } from '@/types'
import { buildGoogleMapsRouteUrl, buildGoogleMapsUrl, formatMapsAddress } from '@/utils/maps'
import { formatStopMapsAddress } from '@/utils/delivery-address'
import {
  buildDeliveryReportContext,
  canDownloadDeliveryReport,
  downloadDeliveryReportExcel,
  canEditDelivery,
} from '@/utils/delivery-report-export'

const statusFilterOptions = [
  { value: '', label: 'Todos los estados' },
  ...Object.entries(DELIVERY_STATUS_LABELS).map(([value, label]) => ({ value, label })),
]

const zoneFilterOptions = [
  { value: '', label: 'Todas las zonas' },
  ...deliveryZoneSelectOptions(),
]

const DEFAULT_SORT: TableSortState = { key: 'date', direction: 'desc' }

function compareValues(a: string | number, b: string | number) {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), 'es')
}

function getDeliverySortValue(
  delivery: Delivery,
  key: string,
  context: {
    courierById: Map<string, Courier>
    driverById: Map<string, Driver>
    packageById: Map<string, Package>
  },
): string | number {
  switch (key) {
    case 'code':
      return delivery.code
    case 'date':
      return delivery.date
    case 'driver':
      return context.driverById.get(delivery.driverId)?.name ?? ''
    case 'zone':
      return DELIVERY_ZONE_LABELS[delivery.zone]
    case 'channel':
      return delivery.channel === 'courier'
        ? context.courierById.get(delivery.courierId ?? '')?.name ?? 'Correo'
        : DELIVERY_CHANNEL_LABELS.last_mile
    case 'stops':
      return delivery.stops.length
    case 'payment': {
      const pkgs = delivery.stops
        .map((stop) => context.packageById.get(stop.packageId))
        .filter((pkg): pkg is Package => Boolean(pkg))
      return sumCashToCollect(pkgs)
    }
    case 'status':
      return DELIVERY_STATUS_LABELS[delivery.status]
    default:
      return delivery.date
  }
}

function openDeliveryRoute(delivery: Delivery, packages: Package[], courier?: Courier) {
  if (delivery.channel === 'courier') {
    if (!courier) {
      toast.error('Este reparto no tiene correo configurado')
      return
    }
    window.open(buildGoogleMapsUrl(formatMapsAddress(courier)), '_blank', 'noopener,noreferrer')
    return
  }

  const byId = new Map(packages.map((pkg) => [pkg.id, pkg]))
  const pending = delivery.stops
    .slice()
    .sort((a, b) => a.order - b.order)
    .filter((stop) => stop.status === 'pending')
  const source = pending.length > 0 ? pending : delivery.stops
  const addresses = source
    .map((stop) => {
      const pkg = byId.get(stop.packageId)
      return pkg ? formatStopMapsAddress(pkg, stop) : null
    })
    .filter((address): address is string => Boolean(address))

  if (addresses.length === 0) {
    toast.error('Este reparto no tiene direcciones para mapear')
    return
  }

  window.open(buildGoogleMapsRouteUrl(addresses), '_blank', 'noopener,noreferrer')
}

export default function DeliveriesPage() {
  const { data, reload, loading } = useAsyncData(async () => {
    const [deliveries, packages, couriers, drivers, vehicles, reasons] = await Promise.all([
      deliveriesService.getAll(),
      packagesService.getAll(),
      couriersService.getAll(),
      driversService.getAll(),
      vehiclesService.getAll(),
      settingsService.getFailureReasons(),
    ])
    return { deliveries, packages, couriers, drivers, vehicles, reasons }
  })
  const deliveries = data?.deliveries ?? []
  const packages = data?.packages ?? []
  const courierById = useMemo(
    () => new Map((data?.couriers ?? []).map((courier) => [courier.id, courier])),
    [data?.couriers],
  )
  const driverById = useMemo(
    () => new Map((data?.drivers ?? []).map((driver) => [driver.id, driver])),
    [data?.drivers],
  )
  const vehicleById = useMemo(
    () => new Map((data?.vehicles ?? []).map((vehicle) => [vehicle.id, vehicle])),
    [data?.vehicles],
  )
  const failureReasonLabels = useMemo(
    () => new Map((data?.reasons ?? []).map((reason) => [reason.id, reason.label])),
    [data?.reasons],
  )
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [status, setStatus] = useState('')
  const [zone, setZone] = useState('')
  const [driverFilter, setDriverFilter] = useState('')
  const [sort, setSort] = useState<TableSortState>(DEFAULT_SORT)
  const [cancel, setCancel] = useState<Delivery | null>(null)

  const driverFilterOptions = useMemo(() => {
    const driverIds = new Set(deliveries.map((delivery) => delivery.driverId))
    return [
      { value: '', label: 'Todos los choferes' },
      ...(data?.drivers ?? [])
        .filter((driver) => driverIds.has(driver.id))
        .map((driver) => ({ value: driver.id, label: driver.name }))
        .sort((a, b) => a.label.localeCompare(b.label, 'es')),
    ]
  }, [data?.drivers, deliveries])

  const dateFilterLabel = datePeriodFilterLabel(dateFilter, formatDeliveryDateDisplay)

  const packageById = useMemo(
    () => new Map(packages.map((pkg) => [pkg.id, pkg])),
    [packages],
  )

  const inProgressCount = useMemo(
    () => deliveries.filter((item) => item.status === 'in_progress').length,
    [deliveries],
  )

  const filtered = useMemo(
    () =>
      deliveries.filter(
        (item) =>
          (!dateFilter || item.date === dateFilter) &&
          item.code.includes(search.toUpperCase()) &&
          (!status || item.status === status) &&
          (!zone || item.zone === zone) &&
          (!driverFilter || item.driverId === driverFilter),
      ),
    [deliveries, dateFilter, search, status, zone, driverFilter],
  )

  const rows = useMemo(
    () =>
      filtered.slice().sort((a, b) => {
        const left = getDeliverySortValue(a, sort.key, {
          courierById,
          driverById,
          packageById,
        })
        const right = getDeliverySortValue(b, sort.key, {
          courierById,
          driverById,
          packageById,
        })
        const result = compareValues(left, right)
        return sort.direction === 'asc' ? result : -result
      }),
    [filtered, sort, courierById, driverById, packageById],
  )

  const handleSort = (key: string) => {
    setSort((current) => {
      if (current.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
      }
      const defaultDesc = ['date', 'stops', 'payment'].includes(key)
      return { key, direction: defaultDesc ? 'desc' : 'asc' }
    })
  }

  const deliveryPackages = (delivery: Delivery) =>
    delivery.stops
      .map((stop) => packageById.get(stop.packageId))
      .filter((pkg): pkg is Package => Boolean(pkg))

  const downloadReport = (delivery: Delivery) => {
    try {
      downloadDeliveryReportExcel(
        buildDeliveryReportContext({
          delivery,
          packagesById: packageById,
          driver: driverById.get(delivery.driverId),
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
      render: (d) => (
        <div className="flex items-center gap-2">
          {d.status === 'in_progress' ? (
            <LiveIndicator title="En curso" />
          ) : null}
          <Link className="font-mono font-semibold text-primary hover:underline" to={`/deliveries/${d.id}`}>
            {d.code}
          </Link>
        </div>
      ),
    },
    { key: 'date', header: 'Fecha', sortable: true, render: (d) => formatDateShort(d.date) },
    {
      key: 'driver',
      header: 'Chofer',
      sortable: true,
      render: (d) => {
        const driver = driverById.get(d.driverId)
        return (
          <DriverBadge
            name={driver?.name}
            active={d.status === 'in_progress'}
          />
        )
      },
    },
    { key: 'zone', header: 'Zona', sortable: true, render: (d) => <DeliveryZoneBadge zone={d.zone} /> },
    {
      key: 'channel',
      header: 'Entrega',
      sortable: true,
      render: (d) => {
        if (d.channel === 'courier') {
          const courier = d.courierId ? courierById.get(d.courierId) : undefined
          return (
            <span className="block max-w-[140px] truncate" title={courier?.name}>
              {courier ? courier.name : 'Correo'}
            </span>
          )
        }
        return DELIVERY_CHANNEL_LABELS.last_mile
      },
    },
    { key: 'stops', header: 'SH', className: 'w-16', sortable: true, render: (d) => d.stops.length },
    {
      key: 'payment',
      header: 'Cobro',
      sortable: true,
      render: (d) => {
        const pkgs = deliveryPackages(d)
        const toCollect = sumCashToCollect(pkgs)
        const paid = countPaid(pkgs)
        return (
          <div className="text-xs leading-snug">
            {toCollect > 0 ? (
              <p className="font-semibold text-warning">Cobrar {formatArs(toCollect)}</p>
            ) : (
              <p className="font-semibold text-success">Sin cobro</p>
            )}
            <p className="text-text-muted">
              {paid}/{pkgs.length} pagados
            </p>
          </div>
        )
      },
    },
    {
      key: 'status',
      header: 'Estado',
      sortable: true,
      render: (d) => <StatusBadge status={d.status} type="delivery" />,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-[1%] whitespace-nowrap',
      render: (d) => (
        <TableRowMenu
          items={[
            { label: 'Ver', icon: Eye, to: `/deliveries/${d.id}` },
            ...(canDownloadDeliveryReport(d)
              ? [{ label: 'Descargar Excel', icon: Download, onClick: () => downloadReport(d) }]
              : []),
            ...(canEditDelivery(d)
              ? [{ label: 'Editar', icon: Pencil, to: `/deliveries/${d.id}/edit` }]
              : []),
            {
              label: 'Ver ruta',
              icon: Route,
              onClick: () =>
                openDeliveryRoute(
                  d,
                  packages,
                  d.courierId ? courierById.get(d.courierId) : undefined,
                ),
            },
            {
              label: 'Duplicar',
              icon: Copy,
              onClick: () => {
                void (async () => {
                  try {
                    await deliveriesService.duplicate(d.id)
                    toast.success('Reparto duplicado')
                    reload()
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : 'No se pudo duplicar')
                  }
                })()
              },
            },
            ...(d.status !== 'completed' && d.status !== 'cancelled'
              ? [
                  { separator: true as const },
                  { label: 'Cancelar', icon: Ban, onClick: () => setCancel(d), tone: 'danger' as const },
                ]
              : []),
          ]}
        />
      ),
    },
  ]

  if (loading) return <PageLoader label="Cargando repartos…" />

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Repartos</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            className="inline-flex h-10 items-center rounded-[10px] border border-border bg-surface px-4 text-sm font-semibold text-text-primary hover:bg-background"
            to="/deliveries/calendar"
          >
            Calendario
          </Link>
          <Link
            className="inline-flex h-10 items-center rounded-[10px] bg-primary px-4 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover"
            to="/deliveries/new"
          >
            Crear reparto
          </Link>
        </div>
      </div>
      <div className="space-y-3">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <Input
            placeholder="Buscar código"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            options={statusFilterOptions}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />
          <Select
            options={zoneFilterOptions}
            value={zone}
            onChange={(e) => setZone(e.target.value)}
          />
          <Select
            options={driverFilterOptions}
            value={driverFilter}
            onChange={(e) => setDriverFilter(e.target.value)}
          />
        </div>
        <DatePeriodFilter
          value={dateFilter}
          onChange={setDateFilter}
          allowFutureDates
        />
        <p className="text-sm text-text-secondary">
          {rows.length} reparto{rows.length === 1 ? '' : 's'}
          {dateFilterLabel ? ` · ${dateFilterLabel}` : ''}
          {status ? ` · ${DELIVERY_STATUS_LABELS[status as keyof typeof DELIVERY_STATUS_LABELS]}` : ''}
          {driverFilter ? ` · ${driverById.get(driverFilter)?.name ?? 'Chofer'}` : ''}
        </p>
      </div>

      {inProgressCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-primary/25 bg-primary-light/70 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white">
              <Route className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-text-primary">
                {inProgressCount} reparto{inProgressCount === 1 ? '' : 's'} en curso
              </p>
              <p className="text-xs text-text-secondary">
                El chofer está repartiendo ahora · filtrá por estado para verlos
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant={status === 'in_progress' ? 'primary' : 'outline'}
            onClick={() => setStatus(status === 'in_progress' ? '' : 'in_progress')}
          >
            {status === 'in_progress' ? 'Ver todos' : 'Ver solo en curso'}
          </Button>
        </div>
      ) : null}

      <Table
        columns={columns}
        data={rows}
        rowKey={(d) => d.id}
        sort={sort}
        onSort={handleSort}
        rowClassName={(d) =>
          d.status === 'in_progress' ? 'bg-primary-light/35 hover:bg-primary-light/55' : undefined
        }
        empty={
          <DeliveriesListEmpty
            dateLabel={dateFilter ? formatDeliveryDateDisplay(dateFilter) : undefined}
          />
        }
      />
      <ConfirmDialog
        open={Boolean(cancel)}
        title="Cancelar reparto"
        description="Los paquetes volverán a pendientes."
        tone="danger"
        onCancel={() => setCancel(null)}
        onConfirm={async () => {
          if (!cancel) return
          try {
            await deliveriesService.cancel(cancel.id)
            toast.success('Reparto cancelado')
            setCancel(null)
            reload()
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo cancelar')
          }
        }}
      />
    </div>
  )
}
