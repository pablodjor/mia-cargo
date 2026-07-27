import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Trash2, UserCheck, UserX } from 'lucide-react'
import { useMemo, useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { UsersListEmpty } from '@/components/common/list-empty-states'
import { TableRowMenu } from '@/components/common/TableActions'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { PageLoadError } from '@/components/common/PageLoadError'
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
import { formatFullName } from '@/utils/person-name'
import { sortRows, toggleTableSort } from '@/utils/table-sort'

const DEFAULT_SORT: TableSortState = { key: 'name', direction: 'asc' }

function getUserSortValue(user: User, key: string): string | number {
  const displayName = formatFullName(user)
  switch (key) {
    case 'name':
      return displayName
    case 'role':
      return ROLE_LABELS[user.role]
    case 'phone':
      return user.phone ?? ''
    case 'status':
      return user.active ? 'active' : 'inactive'
    default:
      return displayName
  }
}

const emptyValues: UserFormValues = {
  username: '',
  firstName: '',
  lastName: '',
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
  const { data, reload, loading, error } = useAsyncData(async () => {
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
  const selectedDriverId = form.watch('driverId')

  const driverById = useMemo(
    () => new Map((data?.drivers ?? []).map((driver) => [driver.id, driver])),
    [data?.drivers],
  )

  const linkedDriverIds = useMemo(
    () =>
      new Set(
        (data?.users ?? [])
          .filter((user) => user.role === 'driver' && user.driverId)
          .map((user) => user.driverId as string),
      ),
    [data?.users],
  )

  const driverOptions = useMemo(
    () =>
      (data?.drivers ?? [])
        .filter((driver) => {
          if (editing?.driverId === driver.id) return true
          return !linkedDriverIds.has(driver.id)
        })
        .map((driver) => ({
          value: driver.id,
          label: formatFullName(driver),
        })),
    [data?.drivers, linkedDriverIds, editing?.driverId],
  )

  useEffect(() => {
    if (selectedRole !== 'driver') {
      form.setValue('driverId', '')
    }
  }, [selectedRole, form])

  useEffect(() => {
    if (selectedRole !== 'driver' || !selectedDriverId || editing) return
    const driver = driverById.get(selectedDriverId)
    if (!driver) return
    form.setValue('firstName', driver.firstName, { shouldDirty: true })
    form.setValue('lastName', driver.lastName, { shouldDirty: true })
    form.setValue('phone', driver.phone, { shouldDirty: true })
  }, [selectedRole, selectedDriverId, driverById, editing, form])

  const open = (user?: User) => {
    setEditing(user ?? null)
    form.reset(
      user
        ? {
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email ?? '',
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
            <strong>{formatFullName(user)}</strong>
            <p className="text-sm text-text-secondary">@{user.username}</p>
            {user.email ? <p className="text-xs text-text-muted">{user.email}</p> : null}
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Rol',
      sortable: true,
      render: (user) => (
        <div>
          <p>{ROLE_LABELS[user.role]}</p>
          {user.role === 'driver' && user.driverId ? (
            <p className="text-xs text-text-muted">
              Chofer: {driverById.get(user.driverId) ? formatFullName(driverById.get(user.driverId)!) : user.driverId}
            </p>
          ) : null}
        </div>
      ),
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
  if (error && !data) return <PageLoadError message={error} onRetry={reload} />

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
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="Nombre" error={form.formState.errors.firstName?.message} {...form.register('firstName')} />
            <Input label="Apellido" error={form.formState.errors.lastName?.message} {...form.register('lastName')} />
          </div>
          <Input
            label="Usuario"
            autoComplete="username"
            error={form.formState.errors.username?.message}
            {...form.register('username')}
          />
          <Input
            label="Email (opcional)"
            type="email"
            error={form.formState.errors.email?.message}
            {...form.register('email')}
          />
          <Input
            label={editing ? 'Contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
            type="password"
            autoComplete="new-password"
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
            <>
              <Select
                label="Chofer vinculado"
                options={driverOptions}
                placeholder={
                  driverOptions.length > 0 ? 'Seleccionar chofer' : 'No hay choferes disponibles'
                }
                error={form.formState.errors.driverId?.message}
                {...form.register('driverId')}
              />
              <p className="-mt-1 text-xs text-text-muted">
                Elegí el chofer operativo. La contraseña de arriba es la que usa para ingresar a la app.
              </p>
            </>
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
        description={`¿Eliminar a ${deleteTarget ? formatFullName(deleteTarget) : ''}? Esta acción no se puede deshacer.`}
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
