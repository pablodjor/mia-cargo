import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Power } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { VehiclesListEmpty } from '@/components/common/list-empty-states'
import { TableRowMenu } from '@/components/common/TableActions'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { PageLoader } from '@/components/ui/PageLoader'
import { Select } from '@/components/ui/Select'
import { Table, type TableColumn, type TableSortState } from '@/components/ui/Table'
import { useAsyncData } from '@/hooks/useAsyncData'
import { vehicleSchema, type VehicleFormValues } from '@/schemas'
import { driversService } from '@/services/drivers.service'
import { vehiclesService } from '@/services/vehicles.service'
import type { Vehicle } from '@/types'
import { formatWeightKg } from '@/utils/money'
import { sortRows, toggleTableSort } from '@/utils/table-sort'

const DEFAULT_SORT: TableSortState = { key: 'name', direction: 'asc' }

function getVehicleSortValue(vehicle: Vehicle, key: string): string | number {
  switch (key) {
    case 'name':
      return vehicle.name
    case 'plate':
      return vehicle.plate
    case 'capacity':
      return vehicle.capacityKg
    case 'status':
      return vehicle.status
    default:
      return vehicle.name
  }
}

export default function VehiclesPage() {
  const { data, reload, loading } = useAsyncData(async () => ({
    vehicles: await vehiclesService.getAll(),
    drivers: await driversService.getAll(),
  }))
  const [editing, setEditing] = useState<Vehicle | null | undefined>(undefined)
  const [sort, setSort] = useState<TableSortState>(DEFAULT_SORT)
  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: { name: '', type: '', plate: '', capacityKg: 1, status: 'active', habitualDriverId: '' },
  })

  const open = (vehicle?: Vehicle) => {
    setEditing(vehicle ?? null)
    form.reset(
      vehicle
        ? {
            name: vehicle.name,
            type: vehicle.type,
            plate: vehicle.plate,
            capacityKg: vehicle.capacityKg,
            status: vehicle.status,
            habitualDriverId: vehicle.habitualDriverId ?? '',
          }
        : { name: '', type: '', plate: '', capacityKg: 1, status: 'active', habitualDriverId: '' },
    )
  }

  const save = form.handleSubmit(async (values) => {
    try {
      if (editing) await vehiclesService.update(editing.id, values)
      else await vehiclesService.create(values)
      toast.success('Vehículo guardado')
      setEditing(undefined)
      reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar')
    }
  })

  const rows = useMemo(
    () => sortRows(data?.vehicles ?? [], sort, getVehicleSortValue),
    [data?.vehicles, sort],
  )

  const handleSort = (key: string) => {
    setSort((current) => toggleTableSort(current, key, ['capacity']))
  }

  const columns: TableColumn<Vehicle>[] = [
    { key: 'name', header: 'Vehículo', sortable: true, render: (v) => <strong>{v.name}</strong> },
    { key: 'plate', header: 'Patente', sortable: true, render: (v) => v.plate },
    {
      key: 'capacity',
      header: 'Capacidad',
      sortable: true,
      render: (v) => formatWeightKg(v.capacityKg),
    },
    {
      key: 'status',
      header: 'Estado',
      sortable: true,
      render: (v) => (v.status === 'active' ? 'Activo' : 'Inactivo'),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-[1%] whitespace-nowrap',
      render: (v) => (
        <TableRowMenu
          items={[
            { label: 'Editar', icon: Pencil, onClick: () => open(v) },
            {
              label: v.status === 'active' ? 'Desactivar' : 'Activar',
              icon: Power,
              onClick: () => {
                void (async () => {
                  await vehiclesService.setStatus(v.id, v.status === 'active' ? 'inactive' : 'active')
                  reload()
                })()
              },
              tone: v.status === 'active' ? 'danger' : 'default',
            },
          ]}
        />
      ),
    },
  ]

  if (loading) return <PageLoader label="Cargando vehículos…" />

  return (
    <div className="space-y-5">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">Vehículos</h1>
        <Button onClick={() => open()}>Nuevo vehículo</Button>
      </div>
      <Table
        columns={columns}
        data={rows}
        rowKey={(v) => v.id}
        sort={sort}
        onSort={handleSort}
        empty={<VehiclesListEmpty />}
      />
      <Modal
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        title={editing ? 'Editar vehículo' : 'Nuevo vehículo'}
        footer={<Button onClick={save}>Guardar</Button>}
      >
        <form className="grid gap-3" onSubmit={save}>
          <Input label="Nombre" error={form.formState.errors.name?.message} {...form.register('name')} />
          <Input label="Tipo" error={form.formState.errors.type?.message} {...form.register('type')} />
          <Input label="Patente" error={form.formState.errors.plate?.message} {...form.register('plate')} />
          <Input
            label="Capacidad (kg)"
            type="number"
            error={form.formState.errors.capacityKg?.message}
            {...form.register('capacityKg', { valueAsNumber: true })}
          />
          <Select
            label="Estado"
            options={[
              { value: 'active', label: 'Activo' },
              { value: 'inactive', label: 'Inactivo' },
            ]}
            {...form.register('status')}
          />
          <Select
            label="Chofer habitual"
            options={(data?.drivers ?? []).map((d) => ({ value: d.id, label: d.name }))}
            placeholder="Sin asignar"
            {...form.register('habitualDriverId')}
          />
        </form>
      </Modal>
    </div>
  )
}
