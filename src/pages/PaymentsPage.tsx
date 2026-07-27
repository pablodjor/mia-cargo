import { Download, CircleDollarSign, PackageCheck, ArrowLeftRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { PaymentBadge } from '@/components/common/PaymentBadge'
import { PackageShCodeButton } from '@/components/common/PackageShCodeButton'
import { DestinationBadge } from '@/components/common/DestinationBadge'
import { DatePeriodFilter, datePeriodFilterLabel } from '@/components/common/DatePeriodFilter'
import { TableRowMenu } from '@/components/common/TableActions'
import {
  PaymentCollectionModal,
  type PaymentCollectionMode,
} from '@/components/payments/PaymentCollectionModal'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { MetricCard } from '@/components/ui/MetricCard'
import { PageLoadError } from '@/components/common/PageLoadError'
import { PageLoader } from '@/components/ui/PageLoader'
import { Pagination } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Select'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Table, type TableColumn, type TableSortState } from '@/components/ui/Table'
import {
  ALL_PAYMENT_STATUSES,
  DESTINATION_LABELS,
  PACKAGE_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from '@/constants/labels'
import { useAuth } from '@/contexts/AuthContext'
import { useAsyncData } from '@/hooks/useAsyncData'
import { usePagination } from '@/hooks/usePagination'
import { deliveriesService } from '@/services/deliveries.service'
import { packagesService } from '@/services/packages.service'
import type { Package, PaymentStatus } from '@/types'
import {
  formatDate,
  formatDeliveryDateDisplay,
  formatTime,
  isSameDayISO,
} from '@/utils/date'
import { formatArs, formatUsd } from '@/utils/money'
import { downloadPaymentsReportExcel } from '@/utils/payment-report-export'
import {
  computePaymentReportStats,
  paymentSummaryAmountLabel,
} from '@/utils/payment-stats'
import { PAYMENT_ICONS } from '@/utils/payment-display'
import { canRegisterWarehousePickup } from '@/utils/payment-rules'
import { sortRows, toggleTableSort } from '@/utils/table-sort'

const DEFAULT_SORT: TableSortState = { key: 'date', direction: 'desc' }

function getPaymentPackageSortValue(pkg: Package, key: string): string | number {
  switch (key) {
    case 'code':
      return pkg.shCode
    case 'owner':
      return pkg.ownerName
    case 'date':
      return pkg.updatedAt
    case 'status':
      return PACKAGE_STATUS_LABELS[pkg.status]
    case 'payment':
      return PAYMENT_STATUS_LABELS[pkg.paymentStatus]
    case 'amount':
      return pkg.paymentStatus === 'usd_cash' ? pkg.totalUsd : pkg.totalArs
    case 'zone':
      return DESTINATION_LABELS[pkg.destinationType]
    default:
      return pkg.updatedAt
  }
}

const paymentFilterOptions = [
  { value: '', label: 'Todas las formas de pago' },
  ...ALL_PAYMENT_STATUSES.map((status) => ({
    value: status,
    label: PAYMENT_STATUS_LABELS[status],
  })),
]

const packageStatusOptions = [
  { value: '', label: 'Todos los estados' },
  ...Object.entries(PACKAGE_STATUS_LABELS).map(([value, label]) => ({ value, label })),
]

const METRIC_TONES: Record<
  PaymentStatus,
  'success' | 'warning' | 'info' | 'primary' | 'secondary'
> = {
  paid: 'success',
  cash: 'warning',
  usd_cash: 'secondary',
  transfer: 'info',
  pending: 'primary',
}

export default function PaymentsPage() {
  const { session } = useAuth()
  const canManagePayments = session?.role === 'admin' || session?.role === 'operator'

  const { data, loading, reload, error } = useAsyncData(async () => ({
    packages: await packagesService.getAll(),
    deliveries: await deliveriesService.getAll(),
  }))
  const packages = data?.packages ?? []
  const deliveries = data?.deliveries ?? []

  const [query, setQuery] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [sort, setSort] = useState<TableSortState>(DEFAULT_SORT)
  const [collectionModal, setCollectionModal] = useState<{
    pkg: Package
    mode: PaymentCollectionMode
  } | null>(null)

  const openCollectionModal = (pkg: Package, mode: PaymentCollectionMode) => {
    setCollectionModal({ pkg, mode })
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return packages.filter((pkg) => {
      if (paymentFilter && pkg.paymentStatus !== paymentFilter) return false
      if (statusFilter && pkg.status !== statusFilter) return false
      if (dateFilter && !isSameDayISO(pkg.updatedAt, dateFilter)) return false
      if (!q) return true
      return (
        pkg.shCode.toLowerCase().includes(q) ||
        pkg.ownerName.toLowerCase().includes(q) ||
        pkg.ownerPhone.toLowerCase().includes(q)
      )
    })
  }, [packages, query, paymentFilter, statusFilter, dateFilter])

  const dateFilterLabel = useMemo(
    () => datePeriodFilterLabel(dateFilter, formatDeliveryDateDisplay),
    [dateFilter],
  )

  const stats = useMemo(() => computePaymentReportStats(filtered), [filtered])

  const sorted = useMemo(
    () => sortRows(filtered, sort, getPaymentPackageSortValue),
    [filtered, sort],
  )

  const pagination = usePagination(sorted, 15)

  const handleSort = (key: string) => {
    setSort((current) => toggleTableSort(current, key, ['date', 'amount']))
  }

  const columns: TableColumn<Package>[] = [
    {
      key: 'code',
      header: 'Código',
      sortable: true,
      render: (pkg) => <PackageShCodeButton pkg={pkg} />,
    },
    { key: 'owner', header: 'Destinatario', sortable: true, render: (pkg) => pkg.ownerName },
    {
      key: 'date',
      header: 'Fecha',
      sortable: true,
      className: 'min-w-[100px] whitespace-nowrap',
      render: (pkg) => (
        <time className="text-xs leading-snug text-text-secondary" dateTime={pkg.updatedAt}>
          <span className="block font-medium text-text-primary">{formatDate(pkg.updatedAt.slice(0, 10))}</span>
          <span className="text-text-muted">{formatTime(pkg.updatedAt)}</span>
        </time>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      sortable: true,
      render: (pkg) => <StatusBadge status={pkg.status} />,
    },
    {
      key: 'payment',
      header: 'Forma de pago',
      sortable: true,
      render: (pkg) => <PaymentBadge status={pkg.paymentStatus} />,
    },
    {
      key: 'amount',
      header: 'Importe',
      sortable: true,
      render: (pkg) => (
        <div className="text-xs leading-snug">
          <p className="font-semibold text-text-primary">
            {pkg.paymentStatus === 'usd_cash' ? formatUsd(pkg.totalUsd) : formatArs(pkg.totalArs)}
          </p>
          <p className="text-text-muted">
            {pkg.paymentStatus === 'usd_cash'
              ? `Ref. ${formatArs(pkg.totalArs)}`
              : `Ref. ${formatUsd(pkg.totalUsd)}`}
          </p>
        </div>
      ),
    },
    {
      key: 'zone',
      header: 'Zona',
      sortable: true,
      render: (pkg) => <DestinationBadge destination={pkg.destinationType} />,
    },
    ...(canManagePayments
      ? [
          {
            key: 'actions',
            header: '',
            className: 'w-[1%] whitespace-nowrap',
            render: (pkg: Package) => {
              if (pkg.status === 'cancelled') {
                return <span className="text-xs text-text-muted">—</span>
              }

              const canPickup = canRegisterWarehousePickup(pkg)
              const canCollect = pkg.paymentStatus !== 'paid'

              return (
                <TableRowMenu
                  items={[
                    ...(canCollect
                      ? [{ label: 'Cobrar', icon: CircleDollarSign, onClick: () => openCollectionModal(pkg, 'collect') }]
                      : []),
                    ...(canPickup
                      ? [{ label: 'Retiro', icon: PackageCheck, onClick: () => openCollectionModal(pkg, 'pickup') }]
                      : []),
                    {
                      label: 'Cambiar pago',
                      icon: ArrowLeftRight,
                      onClick: () => openCollectionModal(pkg, 'change'),
                    },
                  ]}
                />
              )
            },
          } satisfies TableColumn<Package>,
        ]
      : []),
  ]

  const downloadExcel = () => {
    try {
      downloadPaymentsReportExcel(filtered)
      toast.success('Excel de cobranzas descargado')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo generar el Excel')
    }
  }

  if (loading) return <PageLoader label="Cargando cobranzas…" />
  if (error && !data) return <PageLoadError message={error} onRetry={reload} />

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Cobranzas</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Resumen por forma de pago y registro de cobros y retiros en depósito.
          </p>
        </div>
        <Button onClick={downloadExcel}>
          <Download className="h-4 w-4" />
          Descargar Excel
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {stats.byStatus.map((item) => {
          const Icon = PAYMENT_ICONS[item.status]
          return (
            <MetricCard
              key={item.status}
              label={PAYMENT_STATUS_LABELS[item.status]}
              value={item.count}
              hint={paymentSummaryAmountLabel(item)}
              icon={Icon}
              tone={METRIC_TONES[item.status]}
            />
          )
        })}
      </div>

      <Card>
        <div className="mb-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <Input
              placeholder="Buscar SH, titular o teléfono"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Select
              options={paymentFilterOptions}
              value={paymentFilter}
              onChange={(event) => setPaymentFilter(event.target.value)}
            />
            <Select
              options={packageStatusOptions}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            />
          </div>
          <DatePeriodFilter value={dateFilter} onChange={setDateFilter} />
        </div>

        <p className="mb-3 text-sm text-text-secondary">
          {filtered.length} paquete{filtered.length === 1 ? '' : 's'}
          {dateFilterLabel ? ` · ${dateFilterLabel}` : ''} · A cobrar{' '}
          <strong>{formatArs(stats.toCollectArs)}</strong>
          {stats.toCollectUsd > 0 ? (
            <>
              {' '}
              y <strong>{formatUsd(stats.toCollectUsd)}</strong> en billete
            </>
          ) : null}
        </p>

        <Table
          columns={columns}
          data={pagination.pageItems}
          rowKey={(pkg) => pkg.id}
          sort={sort}
          onSort={handleSort}
        />
        <Pagination {...pagination} onPageChange={pagination.setPage} />
      </Card>

      <PaymentCollectionModal
        open={collectionModal !== null}
        onClose={() => setCollectionModal(null)}
        pkg={collectionModal?.pkg ?? null}
        deliveries={deliveries}
        mode={collectionModal?.mode}
        onSaved={reload}
      />
    </div>
  )
}
