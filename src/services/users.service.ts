import type { User, UserRole } from '@/types'
import { createId } from '@/utils/id'
import { delay } from '@/utils/delay'
import { historyService } from './history.service'
import { storageService } from './storage.service'

export type UserInput = {
  name: string
  email: string
  password?: string
  role: UserRole
  phone?: string
  driverId?: string
  active: boolean
}

function toInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
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
    const email = normalizeEmail(input.email)

    if (users.some((user) => normalizeEmail(user.email) === email)) {
      throw new Error('Ya existe un usuario con ese email')
    }
    if (!input.password || input.password.length < 4) {
      throw new Error('La contraseña debe tener al menos 4 caracteres')
    }
    assertDriverRoleInput(input.role, input.driverId)
    if (input.role === 'driver' && input.driverId) {
      assertDriverLinkAvailable(input.driverId)
    }

    const user: User = {
      id: createId('usr'),
      name: input.name.trim(),
      email,
      password: input.password,
      role: input.role,
      phone: input.phone?.trim() || undefined,
      driverId: input.role === 'driver' ? input.driverId?.trim() : undefined,
      avatarInitials: toInitials(input.name),
      active: input.active,
    }

    storageService.setUsers([user, ...users])
    historyService.record({
      action: 'user_created',
      entity: 'user',
      entityId: user.id,
      relatedCode: user.email,
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

    const email = input.email ? normalizeEmail(input.email) : current.email
    if (
      input.email &&
      users.some((user) => user.id !== id && normalizeEmail(user.email) === email)
    ) {
      throw new Error('Ya existe un usuario con ese email')
    }

    const role = input.role ?? current.role
    const name = input.name?.trim() ?? current.name
    const driverId =
      role === 'driver' ? (input.driverId ?? current.driverId)?.trim() : undefined

    assertDriverRoleInput(role, driverId)
    if (role === 'driver' && driverId) {
      assertDriverLinkAvailable(driverId, id)
    }

    const updated: User = {
      ...current,
      name,
      email,
      role,
      phone: input.phone !== undefined ? input.phone.trim() || undefined : current.phone,
      driverId,
      avatarInitials: toInitials(name),
      active: input.active ?? current.active,
      password: input.password && input.password.length > 0 ? input.password : current.password,
    }

    users[index] = updated
    storageService.setUsers(users)
    historyService.record({
      action: 'user_updated',
      entity: 'user',
      entityId: updated.id,
      relatedCode: updated.email,
      description: `Usuario ${updated.name} actualizado`,
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
      relatedCode: user.email,
      description: `Usuario ${user.name} eliminado`,
    })
  },
}
