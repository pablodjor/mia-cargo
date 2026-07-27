import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Trash2, UserCheck, UserX } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { UsersListEmpty } from '@/components/common/list-empty-states'
import { TableRowMenu } from '@/components/common/TableActions'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { PageLoader } from '@/components/ui/PageLoader'
import { Select } from '@/components/ui/Select'
import { Table, type TableColumn, type TableSortState } from '@/components/ui/Table'
import { ROLE_LABELS, USER_ROLES } from '@/constants/labels'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useAuth } from '@/contexts/AuthContext'
import { userSchema, type UserFormValues } from '@/schemas'
import { driversService } from '@/services/drivers.service'
import { usersService } from '@/services/users.service'
import type { User } from '@/types'
import { sortRows, toggleTableSort } from '@/utils/table-sort'

const DEFAULT_SORT: TableSortState = { key: 'name', direction: 'asc' }

function getUserSortValue(user: User, key: string): string | number {
  switch (key) {
    case 'name':
      return user.name
    case 'role':
      return ROLE_LABELS[user.role]
    case 'phone':
      return user.phone ?? ''
    case 'status':
      return user.active ? 'active' : 'inactive'
    default:
      return user.name
  }
}

const emptyValues: UserFormValues = {
  name: '',
  email: '',
  password: '',
  role: 'operator',
  phone: '',
  driverId: '',
  active: true,
}

const roleOptions = USER_ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] }))

export default function UsersPage() {
  const { session } = useAuth()
  const { data, reload, loading } = useAsyncData(async () => {
    const [users, drivers] = await Promise.all([usersService.getAll(), driversService.getAll()])
    return { users, drivers }
  })

  const [editing, setEditing] = useState<User | null | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [sort, setSort] = useState<TableSortState>(DEFAULT_SORT)

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: emptyValues,
  })

  const selectedRole = form.watch('role')

  const open = (user?: User) => {
    setEditing(user ?? null)
    form.reset(
      user
        ? {
            name: user.name,
            email: user.email,
            password: '',
            role: user.role,
            phone: user.phone ?? '',
            driverId: user.driverId ?? '',
            active: user.active,
          }
        : emptyValues,
    )
  }

  const save = form.handleSubmit(async (values) => {
    try {
      if (editing) {
        if (!values.password) {
          const { password: _, ...rest } = values
          await usersService.update(editing.id, rest)
        } else {
          await usersService.update(editing.id, values)
        }
      } else {
        if (!values.password || values.password.length < 4) {
          toast.error('La contraseña debe tener al menos 4 caracteres')
          return
        }
        await usersService.create(values)
      }
      toast.success('Usuario guardado')
      setEditing(undefined)
      reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar')
    }
  })

  const rows = useMemo(
    () => sortRows(data?.users ?? [], sort, getUserSortValue),
    [data?.users, sort],
  )

  const handleSort = (key: string) => {
    setSort((current) => toggleTableSort(current, key))
  }

  const columns: TableColumn<User>[] = [
    {
      key: 'name',
      header: 'Usuario',
      sortable: true,
      render: (user) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary">
            {user.avatarInitials}
          </div>
          <div>
            <strong>{user.name}</strong>
            <p className="text-sm text-text-secondary">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Rol',
      sortable: true,
      render: (user) => ROLE_LABELS[user.role],
    },
    {
      key: 'phone',
      header: 'Teléfono',
      sortable: true,
      render: (user) => user.phone ?? '—',
    },
    {
      key: 'status',
      header: 'Estado',
      sortable: true,
      render: (user) => (user.active ? 'Activo' : 'Inactivo'),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-[1%] whitespace-nowrap',
      render: (user) => (
        <TableRowMenu
          items={[
            { label: 'Editar', icon: Pencil, onClick: () => open(user) },
            {
              label: user.active ? 'Desactivar' : 'Activar',
              icon: user.active ? UserX : UserCheck,
              onClick: () => {
                void (async () => {
                  try {
                    await usersService.setActive(user.id, !user.active)
                    reload()
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : 'No se pudo actualizar')
                  }
                })()
              },
              tone: user.active ? 'danger' : 'default',
            },
            { separator: true },
            { label: 'Eliminar', icon: Trash2, onClick: () => setDeleteTarget(user), tone: 'danger' },
          ]}
        />
      ),
    },
  ]

  if (loading) return <PageLoader label="Cargando usuarios…" />

  return (
    <div className="space-y-5">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <Button onClick={() => open()}>Nuevo usuario</Button>
      </div>

      <Table
        columns={columns}
        data={rows}
        rowKey={(user) => user.id}
        sort={sort}
        onSort={handleSort}
        empty={<UsersListEmpty />}
      />

      <Modal
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        title={editing ? 'Editar usuario' : 'Nuevo usuario'}
        footer={<Button onClick={() => void save()}>Guardar</Button>}
      >
        <form className="grid gap-3" onSubmit={(event) => void save(event)}>
          <Input label="Nombre" error={form.formState.errors.name?.message} {...form.register('name')} />
          <Input
            label="Email"
            type="email"
            error={form.formState.errors.email?.message}
            {...form.register('email')}
          />
          <Input
            label={editing ? 'Contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
            type="password"
            error={form.formState.errors.password?.message}
            {...form.register('password')}
          />
          <Select
            label="Rol"
            options={roleOptions}
            error={form.formState.errors.role?.message}
            {...form.register('role')}
          />
          {selectedRole === 'driver' && (
            <Select
              label="Chofer vinculado"
              options={(data?.drivers ?? [])
                .filter((driver) => driver.status === 'active')
                .map((driver) => ({ value: driver.id, label: driver.name }))}
              placeholder="Seleccionar chofer"
              error={form.formState.errors.driverId?.message}
              {...form.register('driverId')}
            />
          )}
          <Input label="Teléfono" {...form.register('phone')} />
          <Select
            label="Estado"
            options={[
              { value: 'true', label: 'Activo' },
              { value: 'false', label: 'Inactivo' },
            ]}
            value={form.watch('active') ? 'true' : 'false'}
            onChange={(event) => form.setValue('active', event.target.value === 'true')}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Eliminar usuario"
        description={`¿Eliminar a ${deleteTarget?.name}? Esta acción no se puede deshacer.`}
        tone="danger"
        confirmLabel="Eliminar"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return
          try {
            await usersService.remove(deleteTarget.id, session?.userId)
            toast.success('Usuario eliminado')
            setDeleteTarget(null)
            reload()
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo eliminar')
          }
        }}
      />
    </div>
  )
}
