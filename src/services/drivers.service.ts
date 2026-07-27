import type { Driver, EntityStatus } from '@/types'
import { createId } from '@/utils/id'
import { delay } from '@/utils/delay'
import { formatFullName } from '@/utils/person-name'
import { historyService } from './history.service'
import { storageService } from './storage.service'

export type DriverInput = Omit<Driver, 'id' | 'createdAt' | 'updatedAt' | 'deliveryCount' | 'name'> & {
  deliveryCount?: number
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
    const now = new Date().toISOString()
    const driver: Driver = {
      ...input,
      name: formatFullName(input),
      email: input.email?.trim() || undefined,
      id: createId('drv'),
      deliveryCount: input.deliveryCount ?? 0,
      createdAt: now,
      updatedAt: now,
    }
    storageService.setDrivers([driver, ...storageService.getDrivers()])
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
    const updated: Driver = {
      ...current,
      ...input,
      name: formatFullName({ ...current, ...input }),
      email: input.email !== undefined ? input.email.trim() || undefined : current.email,
      id: current.id,
      updatedAt: new Date().toISOString(),
    }
    drivers[index] = updated
    storageService.setDrivers(drivers)
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
