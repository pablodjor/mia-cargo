import type { Driver, EntityStatus } from '@/types'
import { createId } from '@/utils/id'
import { delay } from '@/utils/delay'
import { historyService } from './history.service'
import { storageService } from './storage.service'
import { usersService } from './users.service'

export type DriverInput = Omit<Driver, 'id' | 'createdAt' | 'updatedAt' | 'deliveryCount'> & {
  deliveryCount?: number
  password?: string
}

function findLinkedDriverUser(driverId: string) {
  return storageService.getUsers().find((user) => user.role === 'driver' && user.driverId === driverId)
}

async function syncDriverAccess(driver: Driver, password?: string) {
  const linkedUser = findLinkedDriverUser(driver.id)
  const active = driver.status === 'active'

  if (linkedUser) {
    await usersService.update(linkedUser.id, {
      name: driver.name,
      email: driver.email,
      phone: driver.phone,
      role: 'driver',
      driverId: driver.id,
      active,
      password: password?.trim() ? password : undefined,
    })
    return
  }

  const trimmedPassword = password?.trim()
  if (!trimmedPassword || trimmedPassword.length < 4) {
    throw new Error('Definí una contraseña de al menos 4 caracteres para que el chofer pueda ingresar')
  }

  await usersService.create({
    name: driver.name,
    email: driver.email,
    phone: driver.phone,
    password: trimmedPassword,
    role: 'driver',
    driverId: driver.id,
    active,
  })
}

export const driversService = {
  async getAll(): Promise<Driver[]> {
    await delay()
    storageService.seedIfNeeded()
    return storageService.getDrivers()
  },

  async getById(id: string): Promise<Driver | null> {
    await delay()
    return storageService.getDrivers().find((driver) => driver.id === id) ?? null
  },

  async create(input: DriverInput): Promise<Driver> {
    await delay()
    storageService.seedIfNeeded()
    const { password, ...driverFields } = input
    const trimmedPassword = password?.trim()
    if (!trimmedPassword || trimmedPassword.length < 4) {
      throw new Error('La contraseña debe tener al menos 4 caracteres')
    }

    const now = new Date().toISOString()
    const driver: Driver = {
      ...driverFields,
      id: createId('drv'),
      deliveryCount: input.deliveryCount ?? 0,
      createdAt: now,
      updatedAt: now,
    }

    storageService.setDrivers([driver, ...storageService.getDrivers()])

    try {
      await syncDriverAccess(driver, trimmedPassword)
    } catch (error) {
      storageService.setDrivers(storageService.getDrivers().filter((item) => item.id !== driver.id))
      throw error
    }

    historyService.record({
      action: 'driver_created',
      entity: 'driver',
      entityId: driver.id,
      relatedCode: driver.name,
      newStatus: driver.status,
      description: `Chofer ${driver.name} creado`,
    })
    return driver
  },

  async update(id: string, input: Partial<DriverInput>): Promise<Driver> {
    await delay()
    const drivers = storageService.getDrivers()
    const index = drivers.findIndex((driver) => driver.id === id)
    if (index < 0) throw new Error('Chofer no encontrado')
    const current = drivers[index]
    if (!current) throw new Error('Chofer no encontrado')

    const { password, ...driverFields } = input
    const updated: Driver = {
      ...current,
      ...driverFields,
      id: current.id,
      updatedAt: new Date().toISOString(),
    }
    drivers[index] = updated
    storageService.setDrivers(drivers)

    await syncDriverAccess(updated, password)

    historyService.record({
      action: 'driver_updated',
      entity: 'driver',
      entityId: updated.id,
      relatedCode: updated.name,
      description: `Chofer ${updated.name} actualizado`,
    })
    return updated
  },

  async setStatus(id: string, status: EntityStatus): Promise<Driver> {
    return this.update(id, { status })
  },
}
