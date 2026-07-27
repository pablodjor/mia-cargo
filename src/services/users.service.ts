import type { User, UserRole } from '@/types'
import { ROLE_LABELS } from '@/constants/labels'
import { createId } from '@/utils/id'
import { delay } from '@/utils/delay'
import { formatFullName, getNameInitials, normalizeUsername } from '@/utils/person-name'
import { historyService } from './history.service'
import { storageService } from './storage.service'

export type UserInput = {
  username: string
  firstName: string
  lastName: string
  email?: string
  password?: string
  role: UserRole
  phone?: string
  driverId?: string
  active: boolean
}

function assertDriverLinkAvailable(driverId: string, exceptUserId?: string) {
  const taken = storageService.getUsers().find(
    (user) => user.role === 'driver' && user.driverId === driverId && user.id !== exceptUserId,
  )
  if (taken) {
    throw new Error('Ese chofer ya tiene un usuario de acceso vinculado')
  }
}

function assertDriverRoleInput(role: UserRole, driverId?: string) {
  if (role !== 'driver') return
  if (!driverId?.trim()) {
    throw new Error('Seleccioná el chofer vinculado')
  }
  const driver = storageService.getDrivers().find((item) => item.id === driverId)
  if (!driver) throw new Error('Chofer no encontrado')
}

function driverLabel(driverId?: string): string {
  if (!driverId) return '—'
  return storageService.getDrivers().find((item) => item.id === driverId)?.name ?? driverId
}

function describeUserChanges(
  before: User,
  after: User,
  options?: { passwordChanged?: boolean },
): string {
  const changes: string[] = []

  if (before.username !== after.username) {
    changes.push(`usuario: ${before.username} → ${after.username}`)
  }
  if (before.firstName !== after.firstName || before.lastName !== after.lastName) {
    changes.push(`nombre: ${before.name} → ${after.name}`)
  }
  if ((before.email ?? '') !== (after.email ?? '')) {
    changes.push(`email: ${before.email ?? '—'} → ${after.email ?? '—'}`)
  }
  if (before.role !== after.role) {
    changes.push(`rol: ${ROLE_LABELS[before.role]} → ${ROLE_LABELS[after.role]}`)
  }
  if ((before.phone ?? '') !== (after.phone ?? '')) {
    changes.push(`teléfono: ${before.phone ?? '—'} → ${after.phone ?? '—'}`)
  }
  if ((before.driverId ?? '') !== (after.driverId ?? '')) {
    changes.push(`chofer: ${driverLabel(before.driverId)} → ${driverLabel(after.driverId)}`)
  }
  if (before.active !== after.active) {
    changes.push(
      `estado: ${before.active ? 'Activo' : 'Inactivo'} → ${after.active ? 'Activo' : 'Inactivo'}`,
    )
  }
  if (options?.passwordChanged) {
    changes.push('contraseña actualizada')
  }

  return changes.length > 0 ? changes.join(' · ') : 'sin cambios en los datos'
}

export const usersService = {
  async getAll(): Promise<User[]> {
    await delay()
    storageService.seedIfNeeded()
    return storageService.getUsers()
  },

  async getById(id: string): Promise<User | null> {
    await delay()
    return storageService.getUsers().find((user) => user.id === id) ?? null
  },

  async create(input: UserInput): Promise<User> {
    await delay()
    storageService.seedIfNeeded()
    const users = storageService.getUsers()
    const username = normalizeUsername(input.username)

    if (users.some((user) => normalizeUsername(user.username) === username)) {
      throw new Error('Ya existe un usuario con ese nombre de usuario')
    }
    if (!input.password || input.password.length < 4) {
      throw new Error('La contraseña debe tener al menos 4 caracteres')
    }
    assertDriverRoleInput(input.role, input.driverId)
    if (input.role === 'driver' && input.driverId) {
      assertDriverLinkAvailable(input.driverId)
    }

    const firstName = input.firstName.trim()
    const lastName = input.lastName.trim()
    const user: User = {
      id: createId('usr'),
      username,
      firstName,
      lastName,
      name: formatFullName({ firstName, lastName }),
      email: input.email?.trim() || undefined,
      password: input.password,
      role: input.role,
      phone: input.phone?.trim() || undefined,
      driverId: input.role === 'driver' ? input.driverId?.trim() : undefined,
      avatarInitials: getNameInitials({ firstName, lastName }),
      active: input.active,
    }

    storageService.setUsers([user, ...users])
    historyService.record({
      action: 'user_created',
      entity: 'user',
      entityId: user.id,
      relatedCode: user.username,
      newStatus: user.active ? 'active' : 'inactive',
      description: `Usuario ${user.name} creado`,
    })
    return user
  },

  async update(id: string, input: Partial<UserInput>): Promise<User> {
    await delay()
    const users = storageService.getUsers()
    const index = users.findIndex((user) => user.id === id)
    if (index < 0) throw new Error('Usuario no encontrado')

    const current = users[index]
    if (!current) throw new Error('Usuario no encontrado')

    const username = input.username ? normalizeUsername(input.username) : current.username
    if (
      input.username &&
      users.some((user) => user.id !== id && normalizeUsername(user.username) === username)
    ) {
      throw new Error('Ya existe un usuario con ese nombre de usuario')
    }

    const role = input.role ?? current.role
    const firstName = input.firstName?.trim() ?? current.firstName
    const lastName = input.lastName?.trim() ?? current.lastName
    const driverId =
      role === 'driver' ? (input.driverId ?? current.driverId)?.trim() : undefined

    assertDriverRoleInput(role, driverId)
    if (role === 'driver' && driverId) {
      assertDriverLinkAvailable(driverId, id)
    }

    const updated: User = {
      ...current,
      username,
      firstName,
      lastName,
      name: formatFullName({ firstName, lastName }),
      email: input.email !== undefined ? input.email.trim() || undefined : current.email,
      role,
      phone: input.phone !== undefined ? input.phone.trim() || undefined : current.phone,
      driverId,
      avatarInitials: getNameInitials({ firstName, lastName }),
      active: input.active ?? current.active,
      password: input.password && input.password.length > 0 ? input.password : current.password,
    }

    users[index] = updated
    storageService.setUsers(users)
    const changes = describeUserChanges(current, updated, {
      passwordChanged: Boolean(input.password && input.password.length > 0),
    })
    historyService.record({
      action: 'user_updated',
      entity: 'user',
      entityId: updated.id,
      relatedCode: updated.username,
      previousStatus: current.active ? 'active' : 'inactive',
      newStatus: updated.active ? 'active' : 'inactive',
      description:
        changes === 'sin cambios en los datos'
          ? `Usuario ${updated.username} actualizado`
          : `Usuario ${updated.username}: ${changes}`,
    })
    return updated
  },

  async setActive(id: string, active: boolean): Promise<User> {
    return this.update(id, { active })
  },

  async remove(id: string, currentUserId?: string): Promise<void> {
    await delay()
    const users = storageService.getUsers()
    const user = users.find((item) => item.id === id)
    if (!user) throw new Error('Usuario no encontrado')

    if (currentUserId && user.id === currentUserId) {
      throw new Error('No podés eliminar tu propio usuario')
    }

    if (user.role === 'admin' && user.active) {
      const activeAdmins = users.filter((item) => item.role === 'admin' && item.active)
      if (activeAdmins.length <= 1) {
        throw new Error('Debe quedar al menos un administrador activo')
      }
    }

    storageService.setUsers(users.filter((item) => item.id !== id))
    historyService.record({
      action: 'user_deleted',
      entity: 'user',
      entityId: user.id,
      relatedCode: user.username,
      description: `Usuario ${user.name} eliminado`,
    })
  },
}
