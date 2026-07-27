import { ArrowRight, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { HistoryListEmpty, HistoryPackageEventsEmpty } from '@/components/common/list-empty-states'
import { PackageShCodeButton } from '@/components/common/PackageShCodeButton'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Pagination } from '@/components/ui/Pagination'
import { PageLoader } from '@/components/ui/PageLoader'
import { Select } from '@/components/ui/Select'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Table, type TableColumn, type TableSortState } from '@/components/ui/Table'
import {
  DELIVERY_STATUS_LABELS,
  HISTORY_ENTITY_LABELS,
  HISTORY_ENTITY_OPTIONS,
  PACKAGE_STATUS_LABELS,
  translateHistoryStatus,
} from '@/constants/labels'
import { useAsyncData } from '@/hooks/useAsyncData'
import { usePagination } from '@/hooks/usePagination'
import { deliveriesService } from '@/services/deliveries.service'
import { historyService } from '@/services/history.service'
import { packagesService } from '@/services/packages.service'
import type { Delivery, DeliveryStatus, HistoryEntry, Package, PackageStatus } from '@/types'
import { formatDateTime } from '@/utils/date'
import { formatHistoryDescription } from '@/utils/history-display'
import { isDeliveryCode } from '@/utils/delivery-code'
import { sortRows, toggleTableSort } from '@/utils/table-sort'

const DEFAULT_SORT: TableSortState = { key: 'date', direction: 'desc' }

function getHistorySortValue(entry: HistoryEntry, key: string): string | number {
  switch (key) {
    case 'date':
      return entry.createdAt
    case 'entity':
      return HISTORY_ENTITY_LABELS[entry.entity]
    case 'code':
      return entry.relatedCode ?? ''
    case 'description':
      return entry.description
    case 'user':
      return entry.userName
    case 'status':
      return entry.newStatus ?? entry.previousStatus ?? ''
    default:
      return entry.createdAt
  }
}

function HistoryStatusChange({ entry }: { entry: HistoryEntry }) {
  const previous = translateHistoryStatus(entry.previousStatus)
  const next = translateHistoryStatus(entry.newStatus)

  if (!previous && !next) {
    return <span className="text-text-muted">—</span>
  }

  const badgeType =
    entry.entity === 'delivery' ? 'delivery' : entry.entity === 'package' ? 'package' : null

  const renderStatus = (status: string | undefined, label: string | null) => {
    if (!label || !status) return null

    if (badgeType === 'package' && status in PACKAGE_STATUS_LABELS) {
      return <StatusBadge status={status as PackageStatus} type="package" />
    }

    if (badgeType === 'delivery' && status in DELIVERY_STATUS_LABELS) {
      return <StatusBadge status={status as DeliveryStatus} type="delivery" />
    }

    return <Badge tone="neutral">{label}</Badge>
  }

  if (!previous && next) {
    return renderStatus(entry.newStatus, next) ?? <Badge tone="info">{next}</Badge>
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {previous ? <Badge tone="neutral">{previous}</Badge> : null}
      {previous && next ? (
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden />
      ) : null}
      {next
        ? (renderStatus(entry.newStatus, next) ?? <Badge tone="info">{next}</Badge>)
        : null}
    </div>
  )
}

function HistoryCodeCell({
  entry,
  packageById,
  deliveryById,
  deliveryByCode,
}: {
  entry: HistoryEntry
  packageById: Map<string, Package>
  deliveryById: Map<string, Delivery>
  deliveryByCode: Map<string, Delivery>
}) {
  if (entry.entity === 'package') {
    const pkg = packageById.get(entry.entityId)
    if (pkg) return <PackageShCodeButton pkg={pkg} />
  }

  const deliveryFromEntity =
    entry.entity === 'delivery' ? deliveryById.get(entry.entityId) : undefined
  const deliveryFromCode = entry.relatedCode ? deliveryByCode.get(entry.relatedCode) : undefined
  const delivery = deliveryFromEntity ?? deliveryFromCode

  if (delivery) {
    return (
      <Link
        to={`/deliveries/${delivery.id}`}
        className="font-mono text-sm font-semibold text-primary hover:underline"
      >
        {delivery.code}
      </Link>
    )
  }

  if (entry.relatedCode && isDeliveryCode(entry.relatedCode)) {
    return <span className="font-mono text-sm font-semibold text-text-primary">{entry.relatedCode}</span>
  }

  return entry.relatedCode ? (
    <span className="font-mono text-sm font-semibold text-text-primary">{entry.relatedCode}</span>
  ) : (
    <span className="text-text-muted">—</span>
  )
}

export default function HistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const entityId = searchParams.get('entityId') ?? ''
  const { data, loading } = useAsyncData(
    async () => {
      const [history, packages, deliveries, pkg] = await Promise.all([
        historyService.getAll(),
        packagesService.getAll(),
        deliveriesService.getAll(),
        entityId ? packagesService.getById(entityId) : Promise.resolve(null),
      ])
      return { history, packages, deliveries, pkg }
    },
    [entityId],
  )
  const history = data?.history ?? []
  const filteredPackage = data?.pkg ?? null
  const filteredPackageCode = useMemo(() => {
    if (filteredPackage) return filteredPackage.shCode
    if (!entityId) return null
    return history.find((item) => item.entityId === entityId)?.relatedCode ?? null
  }, [filteredPackage, entityId, history])
  const packageById = useMemo(
    () => new Map((data?.packages ?? []).map((item) => [item.id, item])),
    [data?.packages],
  )
  const deliveryById = useMemo(
    () => new Map((data?.deliveries ?? []).map((item) => [item.id, item])),
    [data?.deliveries],
  )
  const deliveryByCode = useMemo(
    () => new Map((data?.deliveries ?? []).map((item) => [item.code, item])),
    [data?.deliveries],
  )
  const [entity, setEntity] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<TableSortState>(DEFAULT_SORT)

  const filtered = useMemo(
    () =>
      history.filter((item) => {
        if (entityId && item.entityId !== entityId) return false
        if (entity && item.entity !== entity) return false
        if (!search) return true
        const haystack = `${item.relatedCode ?? ''} ${item.description} ${item.userName}`.toLowerCase()
        return haystack.includes(search.toLowerCase())
      }),
    [history, entity, entityId, search],
  )

  const rows = useMemo(
    () => sortRows(filtered, sort, getHistorySortValue),
    [filtered, sort],
  )

  const pager = usePagination(rows)

  const handleSort = (key: string) => {
    setSort((current) => toggleTableSort(current, key, ['date']))
  }

  const clearEntityFilter = () => {
    setSearchParams({})
  }

  const columns: TableColumn<HistoryEntry>[] = [
    {
      key: 'date',
      header: 'Fecha',
      sortable: true,
      className: 'whitespace-nowrap',
      render: (h) => (
        <time className="text-sm text-text-primary" dateTime={h.createdAt}>
          {formatDateTime(h.createdAt)}
        </time>
      ),
    },
    {
      key: 'entity',
      header: 'Entidad',
      sortable: true,
      render: (h) => (
        <Badge tone="neutral">{HISTORY_ENTITY_LABELS[h.entity]}</Badge>
      ),
    },
    {
      key: 'code',
      header: 'Código',
      sortable: true,
      render: (h) => (
        <HistoryCodeCell
          entry={h}
          packageById={packageById}
          deliveryById={deliveryById}
          deliveryByCode={deliveryByCode}
        />
      ),
    },
    {
      key: 'description',
      header: 'Detalle',
      sortable: true,
      className: 'min-w-[220px]',
      render: (h) => (
        <span className="text-sm text-text-primary">{formatHistoryDescription(h)}</span>
      ),
    },
    {
      key: 'user',
      header: 'Usuario',
      sortable: true,
      render: (h) => <span className="text-sm text-text-secondary">{h.userName}</span>,
    },
    {
      key: 'status',
      header: 'Cambio',
      sortable: true,
      className: 'min-w-[180px]',
      render: (h) => <HistoryStatusChange entry={h} />,
    },
  ]

  if (loading) return <PageLoader label="Cargando historial…" />

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Historial</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {entityId
            ? filteredPackage
              ? `Seguimiento de cambios del paquete ${filteredPackage.shCode}.`
              : filteredPackageCode
                ? `Seguimiento del paquete ${filteredPackageCode} (eliminado del sistema).`
                : 'Seguimiento de cambios de una entidad específica.'
            : 'Registro de auditoría de operaciones: quién hizo qué y cuándo en paquetes, repartos y más.'}
        </p>
      </div>

      {entityId ? (
        <Alert tone="info" title="Filtro activo">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">
              {filteredPackage
                ? `Mostrando solo eventos del paquete ${filteredPackage.shCode} (${filteredPackage.ownerName}).`
                : filteredPackageCode
                  ? `Mostrando eventos del paquete ${filteredPackageCode}. El paquete ya no existe en el listado.`
                  : `Mostrando solo eventos de la entidad ${entityId}.`}
            </p>
            <Button variant="outline" size="sm" onClick={clearEntityFilter}>
              <X className="h-4 w-4" />
              Ver todo el historial
            </Button>
          </div>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder="Buscar por código, detalle o usuario"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          className="sm:max-w-52"
          options={HISTORY_ENTITY_OPTIONS}
          placeholder="Todas las entidades"
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
        />
      </div>

      <Table
        columns={columns}
        data={pager.pageItems}
        rowKey={(h) => h.id}
        sort={sort}
        onSort={handleSort}
        empty={entityId ? <HistoryPackageEventsEmpty /> : <HistoryListEmpty />}
      />
      <Pagination {...pager} onPageChange={pager.setPage} />
    </div>
  )
}
