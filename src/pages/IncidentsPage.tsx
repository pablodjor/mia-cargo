import { useMemo, useState } from 'react'
import {
  CalendarPlus,
  Calendar,
  MapPin,
  Clock,
  History,
  Ban,
} from 'lucide-react'
import { toast } from 'sonner'
import { TableRowMenu } from '@/components/common/TableActions'
import { Button } from '@/components/ui/Button'
import { DateField } from '@/components/ui/DateField'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { PageLoader } from '@/components/ui/PageLoader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Table, type TableColumn, type TableSortState } from '@/components/ui/Table'
import { INCIDENT_PACKAGE_STATUSES, PACKAGE_STATUS_LABELS } from '@/constants/labels'
import { useAsyncData } from '@/hooks/useAsyncData'
import { packagesService } from '@/services/packages.service'
import type { Package } from '@/types'
import { addDaysISODate, formatDeliveryDateDisplay } from '@/utils/date'
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
  const { data, reload, loading } = useAsyncData(() => packagesService.getAll())
  const packages = data ?? []
  const [reschedule, setReschedule] = useState<Package | null>(null)
  const [address, setAddress] = useState<Package | null>(null)
  const [date, setDate] = useState(addDaysISODate(1))
  const [newAddress, setNewAddress] = useState('')
  const [sort, setSort] = useState<TableSortState>(DEFAULT_SORT)

  const action = async (callback: () => Promise<unknown>) => {
    try {
      await callback()
      toast.success('Incidencia actualizada')
      reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar')
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
      render: (p) => <strong className="font-mono">{p.shCode}</strong>,
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
              label: 'Reprogramar para mañana',
              icon: CalendarPlus,
              onClick: () =>
                void action(() =>
                  packagesService.reschedule(p.id, formatDeliveryDateDisplay(addDaysISODate(1))),
                ),
            },
            { label: 'Elegir fecha', icon: Calendar, onClick: () => setReschedule(p) },
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

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Incidencias</h1>
      <Table
        columns={columns}
        data={rows}
        rowKey={(p) => p.id}
        sort={sort}
        onSort={handleSort}
        empty={<p>No hay incidencias.</p>}
      />

      <Modal
        open={Boolean(reschedule)}
        onClose={() => setReschedule(null)}
        title="Reprogramar entrega"
        footer={
          <Button
            onClick={() => {
              if (reschedule) {
                void action(() =>
                  packagesService.reschedule(reschedule.id, formatDeliveryDateDisplay(date)),
                )
              }
              setReschedule(null)
            }}
          >
            Guardar
          </Button>
        }
      >
        <DateField label="Nueva fecha" value={date} onChange={setDate} />
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
