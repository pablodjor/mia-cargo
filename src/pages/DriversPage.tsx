import { zodResolver } from '@hookform/resolvers/zod'
import { History, Pencil, UserCheck, UserX } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { DriverDeliveryHistoryModal } from '@/components/drivers/DriverDeliveryHistoryModal'
import { DriversListEmpty } from '@/components/common/list-empty-states'
import { TableRowMenu } from '@/components/common/TableActions'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { PageLoadError } from '@/components/common/PageLoadError'
import { PageLoader } from '@/components/ui/PageLoader'
import { Select } from '@/components/ui/Select'
import { Table, type TableColumn, type TableSortState } from '@/components/ui/Table'
import { useAsyncData } from '@/hooks/useAsyncData'
import { driverSchema, type DriverFormValues } from '@/schemas'
import { couriersService } from '@/services/couriers.service'
import { deliveriesService } from '@/services/deliveries.service'
import { driversService } from '@/services/drivers.service'
import { packagesService } from '@/services/packages.service'
import { settingsService } from '@/services/settings.service'
import { vehiclesService } from '@/services/vehicles.service'
import type { Driver } from '@/types'
import { formatFullName } from '@/utils/person-name'
import { sortRows, toggleTableSort } from '@/utils/table-sort'

const DEFAULT_SORT: TableSortState = { key: 'name', direction: 'asc' }

function getDriverSortValue(
  driver: Driver,
  key: string,
  deliveryCountByDriver: Map<string, number>,
): string | number {
  switch (key) {
    case 'name':
      return formatFullName(driver)
    case 'contact':
      return `${driver.phone} ${driver.email}`
    case 'status':
      return driver.status
    case 'count':
      return deliveryCountByDriver.get(driver.id) ?? 0
    default:
      return formatFullName(driver)
  }
}

export default function DriversPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { data, reload, loading, error } = useAsyncData(async () => {
    const [drivers, vehicles, deliveries, packages, couriers, reasons] = await Promise.all([
      driversService.getAll(),
      vehiclesService.getAll(),
      deliveriesService.getAll(),
      packagesService.getAll(),
      couriersService.getAll(),
      settingsService.getFailureReasons(),
    ])
    return { drivers, vehicles, deliveries, packages, couriers, reasons }
  })

  const [editing, setEditing] = useState<Driver | null | undefined>(undefined)
  const [historyDriver, setHistoryDriver] = useState<Driver | null>(null)
  const [sort, setSort] = useState<TableSortState>(DEFAULT_SORT)

  useEffect(() => {
    const driverId = (location.state as { openHistoryDriverId?: string } | null)?.openHistoryDriverId
    if (!driverId || !data?.drivers) return

    const driver = data.drivers.find((item) => item.id === driverId)
    if (driver) setHistoryDriver(driver)
    navigate(location.pathname, { replace: true, state: null })
  }, [data?.drivers, location.pathname, location.state, navigate])

  const deliveryCountByDriver = useMemo(() => {
    const counts = new Map<string, number>()
    for (const delivery of data?.deliveries ?? []) {
      counts.set(delivery.driverId, (counts.get(delivery.driverId) ?? 0) + 1)
    }
    return counts
  }, [data?.deliveries])

  const rows = useMemo(
    () =>
      sortRows(data?.drivers ?? [], sort, (driver, key) =>
        getDriverSortValue(driver, key, deliveryCountByDriver),
      ),
    [data?.drivers, sort, deliveryCountByDriver],
  )

  const handleSort = (key: string) => {
    setSort((current) => toggleTableSort(current, key, ['count']))
  }

  const form = useForm<DriverFormValues>({
    resolver: zodResolver(driverSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      dni: '',
      phone: '',
      email: '',
      status: 'active',
      habitualVehicleId: '',
    },
  })

  const open = (driver?: Driver) => {
    setEditing(driver ?? null)
    form.reset(
      driver
        ? {
            firstName: driver.firstName,
            lastName: driver.lastName,
            dni: driver.dni,
            phone: driver.phone,
            email: driver.email ?? '',
            status: driver.status,
            habitualVehicleId: driver.habitualVehicleId ?? '',
          }
        : {
            firstName: '',
            lastName: '',
            dni: '',
            phone: '',
            email: '',
            status: 'active',
            habitualVehicleId: '',
          },
    )
  }

  const save = form.handleSubmit(async (values) => {
    try {
      if (editing) await driversService.update(editing.id, values)
      else await driversService.create(values)
      toast.success('Chofer guardado')
      setEditing(undefined)
      reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar')
    }
  })

  const columns: TableColumn<Driver>[] = [
    { key: 'name', header: 'Chofer', sortable: true, render: (driver) => <strong>{formatFullName(driver)}</strong> },
    {
      key: 'contact',
      header: 'Contacto',
      sortable: true,
      render: (driver) => `${driver.phone} · ${driver.email}`,
    },
    {
      key: 'status',
      header: 'Estado',
      sortable: true,
      render: (driver) => (driver.status === 'active' ? 'Activo' : 'Inactivo'),
    },
    {
      key: 'count',
      header: 'Repartos',
      sortable: true,
      render: (driver) => deliveryCountByDriver.get(driver.id) ?? 0,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-[1%] whitespace-nowrap',
      render: (driver) => (
        <TableRowMenu
          items={[
            { label: 'Historial de repartos', icon: History, onClick: () => setHistoryDriver(driver) },
            { label: 'Editar', icon: Pencil, onClick: () => open(driver) },
            {
              label: driver.status === 'active' ? 'Desactivar' : 'Activar',
              icon: driver.status === 'active' ? UserX : UserCheck,
              onClick: () => {
                void (async () => {
                  await driversService.setStatus(
                    driver.id,
                    driver.status === 'active' ? 'inactive' : 'active',
                  )
                  reload()
                })()
              },
              tone: driver.status === 'active' ? 'danger' : 'default',
            },
          ]}
        />
      ),
    },
  ]

  if (loading) return <PageLoader label="Cargando choferes…" />
  if (error && !data) return <PageLoadError message={error} onRetry={reload} />

  return (
    <div className="space-y-5">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">Choferes</h1>
        <Button onClick={() => open()}>Nuevo chofer</Button>
      </div>

      <Table
        columns={columns}
        data={rows}
        rowKey={(driver) => driver.id}
        sort={sort}
        onSort={handleSort}
        empty={<DriversListEmpty />}
      />

      <DriverDeliveryHistoryModal
        driver={historyDriver}
        deliveries={data?.deliveries ?? []}
        packages={data?.packages ?? []}
        couriers={data?.couriers ?? []}
        vehicles={data?.vehicles ?? []}
        failureReasons={data?.reasons ?? []}
        onClose={() => setHistoryDriver(null)}
      />

      <Modal
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        title={editing ? 'Editar chofer' : 'Nuevo chofer'}
        footer={<Button onClick={save}>Guardar</Button>}
      >
        <form className="grid gap-3" onSubmit={save}>
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="Nombre" error={form.formState.errors.firstName?.message} {...form.register('firstName')} />
            <Input label="Apellido" error={form.formState.errors.lastName?.message} {...form.register('lastName')} />
          </div>
          <Input label="DNI" error={form.formState.errors.dni?.message} {...form.register('dni')} />
          <Input label="Teléfono" error={form.formState.errors.phone?.message} {...form.register('phone')} />
          <Input label="Email (opcional)" error={form.formState.errors.email?.message} {...form.register('email')} />
          <Select
            label="Estado"
            options={[
              { value: 'active', label: 'Activo' },
              { value: 'inactive', label: 'Inactivo' },
            ]}
            {...form.register('status')}
          />
          <Select
            label="Vehículo habitual"
            options={(data?.vehicles ?? []).map((vehicle) => ({ value: vehicle.id, label: vehicle.name }))}
            placeholder="Sin asignar"
            {...form.register('habitualVehicleId')}
          />
        </form>
      </Modal>
    </div>
  )
}
