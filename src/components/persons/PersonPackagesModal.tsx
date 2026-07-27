import { useEffect, useMemo, useState } from 'react'
import { History, Route } from 'lucide-react'
import { PackageShCodeButton } from '@/components/common/PackageShCodeButton'
import { TableActionLink, TableRowMenu } from '@/components/common/TableActions'
import { DestinationBadge } from '@/components/common/DestinationBadge'
import { DriverBadge } from '@/components/common/DriverBadge'
import { PaymentBadge } from '@/components/common/PaymentBadge'
import { MoneyBadge } from '@/components/common/StatBadge'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { SearchInput } from '@/components/ui/SearchInput'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Table, type TableColumn, type TableSortState } from '@/components/ui/Table'
import {
  DESTINATION_LABELS,
  PACKAGE_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from '@/constants/labels'
import type { Courier, Delivery, Driver, Package, Person } from '@/types'
import { formatDateTime } from '@/utils/date'
import { formatArs, formatUsd, formatWeightKg } from '@/utils/money'
import { buildPackageDeliveredByMap } from '@/utils/package-delivery-info'
import { sortRows, toggleTableSort } from '@/utils/table-sort'

const DEFAULT_SORT: TableSortState = { key: 'updated', direction: 'desc' }

function getPersonPackageSortValue(
  pkg: Package,
  key: string,
  deliveredByMap: ReturnType<typeof buildPackageDeliveredByMap>,
): string | number {
  switch (key) {
    case 'code':
      return pkg.shCode
    case 'status':
      return PACKAGE_STATUS_LABELS[pkg.status]
    case 'deliveredBy':
      return deliveredByMap.get(pkg.id)?.name ?? ''
    case 'payment':
      return PAYMENT_STATUS_LABELS[pkg.paymentStatus]
    case 'weight':
      return pkg.weight
    case 'amount':
      return pkg.totalArs
    case 'address':
      return `${pkg.address}, ${pkg.city}`
    case 'zone':
      return DESTINATION_LABELS[pkg.destinationType]
    case 'created':
      return pkg.createdAt
    case 'updated':
      return pkg.updatedAt
    default:
      return pkg.updatedAt
  }
}

interface PersonPackagesModalProps {
  person: Person | null
  packages: Package[]
  deliveries: Delivery[]
  drivers: Driver[]
  couriers: Courier[]
  onClose: () => void
}

function packageSearchHaystack(
  pkg: Package,
  deliveredByMap: ReturnType<typeof buildPackageDeliveredByMap>,
): string {
  const delivered = deliveredByMap.get(pkg.id)

  return [
    pkg.shCode,
    pkg.address,
    pkg.city,
    pkg.province,
    pkg.postalCode,
    pkg.notes,
    String(pkg.weight),
    PACKAGE_STATUS_LABELS[pkg.status],
    PAYMENT_STATUS_LABELS[pkg.paymentStatus],
    DESTINATION_LABELS[pkg.destinationType],
    delivered?.name,
    delivered?.deliveryCode,
    delivered?.deliveredAt ? formatDateTime(delivered.deliveredAt) : '',
    formatDateTime(pkg.createdAt),
    formatDateTime(pkg.updatedAt),
    formatArs(pkg.totalArs),
    formatUsd(pkg.totalUsd),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function PersonPackagesModal({
  person,
  packages,
  deliveries,
  drivers,
  couriers,
  onClose,
}: PersonPackagesModalProps) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<TableSortState>(DEFAULT_SORT)

  useEffect(() => {
    setSearch('')
    setSort(DEFAULT_SORT)
  }, [person?.id])

  const rows = useMemo(() => packages.slice(), [packages])

  const deliveredByMap = useMemo(
    () => buildPackageDeliveredByMap(rows, deliveries, drivers, couriers),
    [rows, deliveries, drivers, couriers],
  )

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const base = !q
      ? rows
      : rows.filter((pkg) => packageSearchHaystack(pkg, deliveredByMap).includes(q))
    return sortRows(base, sort, (row, key) => getPersonPackageSortValue(row, key, deliveredByMap))
  }, [rows, search, deliveredByMap, sort])

  const handleSort = (key: string) => {
    setSort((current) =>
      toggleTableSort(current, key, ['weight', 'amount', 'created', 'updated']),
    )
  }

  const hasSearch = search.trim().length > 0

  const columns: TableColumn<Package>[] = [
    {
      key: 'code',
      header: 'SH',
      sortable: true,
      render: (pkg) => <PackageShCodeButton pkg={pkg} />,
    },
    {
      key: 'status',
      header: 'Estado',
      sortable: true,
      render: (pkg) => <StatusBadge status={pkg.status} type="package" />,
    },
    {
      key: 'deliveredBy',
      header: 'Entregó',
      sortable: true,
      render: (pkg) => {
        const info = deliveredByMap.get(pkg.id)
        if (!info) {
          return <span className="text-xs text-text-muted">—</span>
        }

        return (
          <div className="space-y-1">
            {info.kind === 'driver' ? (
              <DriverBadge name={info.name} />
            ) : (
              <span className="inline-block max-w-[220px] truncate" title={info.name}>
                <Badge tone="info">{info.name}</Badge>
              </span>
            )}
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-muted">
              <TableActionLink to={`/deliveries/${info.deliveryId}`}>{info.deliveryCode}</TableActionLink>
              {info.deliveredAt ? (
                <time dateTime={info.deliveredAt}>{formatDateTime(info.deliveredAt)}</time>
              ) : null}
            </div>
          </div>
        )
      },
    },
    {
      key: 'payment',
      header: 'Pago',
      sortable: true,
      render: (pkg) => (
        <PaymentBadge status={pkg.paymentStatus} />
      ),
    },
    {
      key: 'weight',
      header: 'Peso',
      sortable: true,
      render: (pkg) => formatWeightKg(pkg.weight),
    },
    {
      key: 'amount',
      header: 'Importe',
      sortable: true,
      render: (pkg) => (
        <div className="space-y-1">
          <MoneyBadge value={pkg.totalArs} tone="purple" />
          {pkg.totalUsd > 0 ? (
            <Badge tone="info" className="text-[10px]">
              {formatUsd(pkg.totalUsd)}
            </Badge>
          ) : null}
        </div>
      ),
    },
    {
      key: 'address',
      header: 'Dirección',
      sortable: true,
      render: (pkg) => (
        <div className="max-w-[280px] text-xs">
          <p>{pkg.address}</p>
          <p className="text-text-muted">
            {pkg.city}, {pkg.province} · CP {pkg.postalCode}
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
    {
      key: 'created',
      header: 'Alta',
      sortable: true,
      render: (pkg) => (
        <time className="text-xs text-text-muted" dateTime={pkg.createdAt}>
          {formatDateTime(pkg.createdAt)}
        </time>
      ),
    },
    {
      key: 'updated',
      header: 'Actualizado',
      sortable: true,
      render: (pkg) => (
        <time className="text-xs text-text-muted" dateTime={pkg.updatedAt}>
          {formatDateTime(pkg.updatedAt)}
        </time>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-[1%] whitespace-nowrap',
      render: (pkg) => (
        <TableRowMenu
          items={[
            { label: 'Historial', icon: History, to: `/history?entityId=${pkg.id}` },
            ...(deliveredByMap.get(pkg.id)
              ? [
                  {
                    label: 'Ver reparto',
                    icon: Route,
                    to: `/deliveries/${deliveredByMap.get(pkg.id)!.deliveryId}`,
                  },
                ]
              : []),
          ]}
        />
      ),
    },
  ]

  const description = person
    ? hasSearch
      ? `${filteredRows.length} de ${rows.length} paquete${rows.length === 1 ? '' : 's'} coinciden con la búsqueda.`
      : `${rows.length} paquete${rows.length === 1 ? '' : 's'} registrados para este cliente.`
    : undefined

  return (
    <Modal
      open={Boolean(person)}
      onClose={onClose}
      title={person ? `Paquetes · ${person.name}` : 'Paquetes'}
      description={description}
      size="3xl"
      footer={
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar SH, estado, pago, dirección, reparto, chofer, importe…"
        />

        <Table
          columns={columns}
          data={filteredRows}
          rowKey={(pkg) => pkg.id}
          sort={sort}
          onSort={handleSort}
          empty={
            <p className="py-8 text-center text-sm text-text-secondary">
              {hasSearch
                ? 'No hay paquetes que coincidan con la búsqueda.'
                : 'Este cliente aún no tiene paquetes asociados.'}
            </p>
          }
        />
      </div>
    </Modal>
  )
}
