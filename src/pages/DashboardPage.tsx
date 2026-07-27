import { Link } from 'react-router-dom'
import {
  PackageCheck,
  PackageX,
  RefreshCw,
  CircleDollarSign,
  Banknote,
  CalendarDays,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { DeliveryZoneBadge } from '@/components/common/DeliveryZoneBadge'
import { ActiveDeliveriesEmpty } from '@/components/common/list-empty-states'
import { DatePeriodFilter } from '@/components/common/DatePeriodFilter'
import { DriverBadge } from '@/components/common/DriverBadge'
import { Card } from '@/components/ui/Card'
import { LiveIndicator } from '@/components/ui/LiveIndicator'
import { MetricCard } from '@/components/ui/MetricCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { PageLoadError } from '@/components/common/PageLoadError'
import { PageLoader } from '@/components/ui/PageLoader'
import { PAYMENT_STATUS_LABELS } from '@/constants/labels'
import { DESTINATION_LABELS } from '@/constants/labels'
import { useAsyncData } from '@/hooks/useAsyncData'
import { deliveriesService } from '@/services/deliveries.service'
import { driversService } from '@/services/drivers.service'
import { historyService } from '@/services/history.service'
import { packagesService } from '@/services/packages.service'
import type { Delivery, PackageStatus } from '@/types'
import { cn } from '@/utils/cn'
import { computeDashboardPeriodStats } from '@/utils/dashboard-stats'
import {
  formatDeliveryDateDisplay,
  formatRelative,
  todayISODate,
  addDaysISODate,
} from '@/utils/date'
import { formatArs, formatUsd, formatWeightKg } from '@/utils/money'
import { paymentSummaryAmountLabel } from '@/utils/payment-stats'
import { PAYMENT_ICONS } from '@/utils/payment-display'

function ActiveDeliveryItem({
  delivery,
  driverName,
}: {
  delivery: Delivery
  driverName?: string
}) {
  const progress = deliveriesService.getProgress(delivery)

  return (
    <li>
      <Link
        to={`/deliveries/${delivery.id}`}
        className={cn(
          'block rounded-[12px] border border-primary/20 bg-gradient-to-br from-primary-light/50 to-surface p-4 transition-all',
          'hover:border-primary/35 hover:shadow-sm',
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <LiveIndicator title="En curso" />
              <span className="font-mono text-base font-bold text-primary">{delivery.code}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <DriverBadge name={driverName} active />
              <DeliveryZoneBadge zone={delivery.zone} />
            </div>
          </div>
          <StatusBadge status={delivery.status} type="delivery" />
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-medium text-text-secondary">
              {progress.delivered} entregado{progress.delivered === 1 ? '' : 's'}
              {progress.notDelivered > 0
                ? ` · ${progress.notDelivered} no entregado${progress.notDelivered === 1 ? '' : 's'}`
                : ''}
              {progress.pending > 0 ? ` · ${progress.pending} pendiente${progress.pending === 1 ? '' : 's'}` : ''}
            </span>
            <span className="font-semibold text-text-primary">{progress.percent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary-light">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      </Link>
    </li>
  )
}

export default function DashboardPage() {
  const today = todayISODate()
  const yesterday = addDaysISODate(-1)
  const [dateFilter, setDateFilter] = useState('')

  const { data, loading, error, reload } = useAsyncData(async () => {
    const [metrics, deliveries, history, drivers, packages] = await Promise.all([
      deliveriesService.getDashboardMetrics(),
      deliveriesService.getAll(),
      historyService.getAll(),
      driversService.getAll(),
      packagesService.getAll(),
    ])

    return {
      metrics,
      packages,
      history,
      active: deliveries.filter((item) => item.status === 'in_progress'),
      recentHistory: history.slice(0, 8),
      statuses: packagesService.getMetricsByStatus(),
      destinations: packagesService.getMetricsByDestination(),
      drivers,
    }
  })

  const periodStats = useMemo(() => {
    if (!data) return null
    return computeDashboardPeriodStats(
      data.packages,
      data.history,
      dateFilter || null,
    )
  }, [data, dateFilter])

  const periodTitle = useMemo(() => {
    if (!dateFilter) return 'Resumen total'
    if (dateFilter === today) return 'Resumen de hoy'
    if (dateFilter === yesterday) return 'Resumen de ayer'
    return `Resumen del ${formatDeliveryDateDisplay(dateFilter)}`
  }, [dateFilter, today, yesterday])

  if (loading) return <PageLoader label="Cargando tablero…" />
  if (error && !data) return <PageLoadError message={error} onRetry={reload} />
  if (!data || !periodStats) return <PageLoader label="Cargando tablero…" />

  const { metrics } = data
  const driverById = new Map(data.drivers.map((driver) => [driver.id, driver]))
  const paymentBreakdownVisible = periodStats.paymentBreakdown.filter((item) => item.count > 0)

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tablero</h1>
          <p className="text-text-secondary">Resumen operativo de Miacargo</p>
        </div>

        <DatePeriodFilter value={dateFilter} onChange={setDateFilter} />
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-text-primary">{periodTitle}</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            label="Entregados"
            value={periodStats.delivered}
            tone="success"
            icon={PackageCheck}
          />
          <MetricCard
            label="No entregados"
            value={periodStats.notDelivered}
            tone="warning"
            icon={PackageX}
          />
          <MetricCard
            label="Reprogramados"
            value={periodStats.rescheduled}
            tone="info"
            icon={RefreshCw}
          />
          <MetricCard
            label="Recaudado (ARS)"
            value={formatArs(periodStats.collectedArs)}
            tone="success"
            icon={CircleDollarSign}
            hint="Pagado, efectivo y transferencia"
          />
          {periodStats.collectedUsd > 0 ? (
            <MetricCard
              label="Recaudado (USD)"
              value={formatUsd(periodStats.collectedUsd)}
              tone="secondary"
              icon={Banknote}
            />
          ) : null}
          {periodStats.pendingCollectionArs > 0 || periodStats.pendingCollectionUsd > 0 ? (
            <MetricCard
              label="Pendiente de cobro"
              value={
                periodStats.pendingCollectionUsd > 0
                  ? `${formatArs(periodStats.pendingCollectionArs)} · ${formatUsd(periodStats.pendingCollectionUsd)}`
                  : formatArs(periodStats.pendingCollectionArs)
              }
              tone="primary"
              icon={CircleDollarSign}
              hint="Entregas del período con pago pendiente"
            />
          ) : null}
        </div>
      </div>

      {paymentBreakdownVisible.length > 0 ? (
        <Card title="Recaudación por forma de pago">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {paymentBreakdownVisible.map((item) => {
              const Icon = PAYMENT_ICONS[item.status]
              return (
                <div
                  key={item.status}
                  className="rounded-[10px] border border-border/70 bg-background/60 px-3 py-3"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-text-primary">
                      {PAYMENT_STATUS_LABELS[item.status]}
                    </span>
                  </div>
                  <p className="mt-2 text-xl font-bold tabular-nums text-text-primary">
                    {paymentSummaryAmountLabel(item)}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    {item.count} paquete{item.count === 1 ? '' : 's'}
                  </p>
                </div>
              )
            })}
          </div>
        </Card>
      ) : null}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-text-primary">Estado actual</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Paquetes pendientes" value={metrics.pendingPackages} />
          <MetricCard label="Paquetes asignados" value={metrics.assignedPackages} />
          <MetricCard label="Repartos activos" value={metrics.activeDeliveries} tone="primary" />
          <MetricCard label="Peso en ruta" value={formatWeightKg(metrics.totalWeightInRoute)} tone="info" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Repartos activos">
          {data.active.length ? (
            <ul className="space-y-3">
              {data.active.map((delivery) => (
                <ActiveDeliveryItem
                  key={delivery.id}
                  delivery={delivery}
                  driverName={driverById.get(delivery.driverId)?.name}
                />
              ))}
            </ul>
          ) : (
            <ActiveDeliveriesEmpty />
          )}
        </Card>

        <Card title="Historial reciente">
          <div className="space-y-2">
            {data.recentHistory.map((item) => (
              <div
                key={item.id}
                className="rounded-[10px] border border-border/70 bg-background/60 px-3 py-2.5 text-sm"
              >
                <p className="text-text-primary">{item.description}</p>
                <p className="mt-1 text-xs text-text-muted">
                  {item.userName} · {formatRelative(item.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Estados de paquetes">
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(data.statuses).map(([status, value]) => (
              <div
                key={status}
                className="flex items-center justify-between gap-3 rounded-[10px] border border-border/70 bg-background/60 px-3 py-2"
              >
                <StatusBadge status={status as PackageStatus} />
                <span className="text-sm font-semibold tabular-nums text-text-primary">{value}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Destinos">
          <div className="space-y-2">
            {Object.entries(data.destinations).map(([destination, value]) => (
              <div
                key={destination}
                className="flex items-center justify-between rounded-[10px] border border-border/70 bg-background/60 px-3 py-2"
              >
                <span className="text-sm text-text-primary">
                  {DESTINATION_LABELS[destination as keyof typeof DESTINATION_LABELS]}
                </span>
                <strong className="tabular-nums">{value}</strong>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Acciones rápidas">
        <div className="flex flex-wrap gap-3">
          {(
            [
              { to: '/scanner', label: 'Buscar paquete' },
              { to: '/deliveries/new', label: 'Nuevo reparto' },
              { to: '/packages', label: 'Paquetes' },
              { to: '/payments', label: 'Cobranzas' },
              { to: '/incidents', label: 'Incidencias' },
            ] as const
          ).map((item) => (
            <Link
              key={item.to}
              className="rounded-lg bg-primary px-4 py-2 font-medium text-white hover:bg-primary-hover"
              to={item.to}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </Card>
    </div>
  )
}
