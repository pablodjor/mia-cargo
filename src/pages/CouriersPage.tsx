import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Power } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { CouriersListEmpty } from '@/components/common/list-empty-states'
import { TableRowMenu } from '@/components/common/TableActions'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { PageLoader } from '@/components/ui/PageLoader'
import { Select } from '@/components/ui/Select'
import { Table, type TableColumn, type TableSortState } from '@/components/ui/Table'
import { Textarea } from '@/components/ui/Textarea'
import { useAsyncData } from '@/hooks/useAsyncData'
import { courierSchema, type CourierFormValues } from '@/schemas'
import { couriersService } from '@/services/couriers.service'
import type { Courier } from '@/types'
import { sortRows, toggleTableSort } from '@/utils/table-sort'

const DEFAULT_SORT: TableSortState = { key: 'name', direction: 'asc' }

function getCourierSortValue(courier: Courier, key: string): string | number {
  switch (key) {
    case 'name':
      return courier.name
    case 'address':
      return `${courier.address}, ${courier.city}`
    case 'phone':
      return courier.phone
    case 'status':
      return courier.status
    default:
      return courier.name
  }
}

const emptyValues: CourierFormValues = {
  name: '',
  branchName: '',
  address: '',
  city: '',
  province: '',
  postalCode: '',
  phone: '',
  status: 'active',
  notes: '',
}

export default function CouriersPage() {
  const { data, reload, loading } = useAsyncData(async () => couriersService.getAll())
  const [editing, setEditing] = useState<Courier | null | undefined>(undefined)
  const [sort, setSort] = useState<TableSortState>(DEFAULT_SORT)
  const form = useForm<CourierFormValues>({
    resolver: zodResolver(courierSchema),
    defaultValues: emptyValues,
  })

  const open = (courier?: Courier) => {
    setEditing(courier ?? null)
    form.reset(
      courier
        ? {
            name: courier.name,
            branchName: courier.branchName,
            address: courier.address,
            city: courier.city,
            province: courier.province,
            postalCode: courier.postalCode,
            phone: courier.phone,
            status: courier.status,
            notes: courier.notes ?? '',
          }
        : emptyValues,
    )
  }

  const save = form.handleSubmit(async (values) => {
    try {
      if (editing) await couriersService.update(editing.id, values)
      else await couriersService.create(values)
      toast.success('Correo guardado')
      setEditing(undefined)
      reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar')
    }
  })

  const rows = useMemo(
    () => sortRows(data ?? [], sort, getCourierSortValue),
    [data, sort],
  )

  const handleSort = (key: string) => {
    setSort((current) => toggleTableSort(current, key))
  }

  const columns: TableColumn<Courier>[] = [
    {
      key: 'name',
      header: 'Correo',
      sortable: true,
      render: (c) => (
        <div>
          <strong>{c.name}</strong>
          <p className="text-sm text-text-secondary">{c.branchName}</p>
        </div>
      ),
    },
    {
      key: 'address',
      header: 'Sucursal',
      sortable: true,
      render: (c) => `${c.address}, ${c.city}`,
    },
    { key: 'phone', header: 'Teléfono', sortable: true, render: (c) => c.phone },
    {
      key: 'status',
      header: 'Estado',
      sortable: true,
      render: (c) => (c.status === 'active' ? 'Activo' : 'Inactivo'),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-[1%] whitespace-nowrap',
      render: (c) => (
        <TableRowMenu
          items={[
            { label: 'Editar', icon: Pencil, onClick: () => open(c) },
            {
              label: c.status === 'active' ? 'Desactivar' : 'Activar',
              icon: Power,
              onClick: () => {
                void (async () => {
                  await couriersService.setStatus(c.id, c.status === 'active' ? 'inactive' : 'active')
                  reload()
                })()
              },
              tone: c.status === 'active' ? 'danger' : 'default',
            },
          ]}
        />
      ),
    },
  ]

  if (loading) return <PageLoader label="Cargando correos…" />

  return (
    <div className="space-y-5">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">Correos</h1>
        <Button onClick={() => open()}>Nuevo correo</Button>
      </div>
      <Table
        columns={columns}
        data={rows}
        rowKey={(c) => c.id}
        sort={sort}
        onSort={handleSort}
        empty={<CouriersListEmpty />}
      />
      <Modal
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        title={editing ? 'Editar correo' : 'Nuevo correo'}
        footer={<Button onClick={() => void save()}>Guardar</Button>}
      >
        <form className="grid gap-3" onSubmit={(event) => void save(event)}>
          <Input label="Nombre" error={form.formState.errors.name?.message} {...form.register('name')} />
          <Input
            label="Sucursal / planta"
            error={form.formState.errors.branchName?.message}
            {...form.register('branchName')}
          />
          <Input
            label="Dirección"
            error={form.formState.errors.address?.message}
            {...form.register('address')}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Localidad" error={form.formState.errors.city?.message} {...form.register('city')} />
            <Input
              label="Provincia"
              error={form.formState.errors.province?.message}
              {...form.register('province')}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Código postal"
              error={form.formState.errors.postalCode?.message}
              {...form.register('postalCode')}
            />
            <Input
              label="Teléfono"
              error={form.formState.errors.phone?.message}
              {...form.register('phone')}
            />
          </div>
          <Select
            label="Estado"
            options={[
              { value: 'active', label: 'Activo' },
              { value: 'inactive', label: 'Inactivo' },
            ]}
            {...form.register('status')}
          />
          <Textarea label="Notas" {...form.register('notes')} />
        </form>
      </Modal>
    </div>
  )
}
