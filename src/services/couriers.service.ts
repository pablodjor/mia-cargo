import type { Courier, EntityStatus } from '@/types'
import { createId } from '@/utils/id'
import { delay } from '@/utils/delay'
import { historyService } from './history.service'
import { storageService } from './storage.service'

export type CourierInput = Omit<Courier, 'id' | 'createdAt' | 'updatedAt'>

export const couriersService = {
  async getAll(): Promise<Courier[]> {
    await delay()
    storageService.seedIfNeeded()
    return storageService.getCouriers()
  },

  async getById(id: string): Promise<Courier | null> {
    await delay()
    return storageService.getCouriers().find((courier) => courier.id === id) ?? null
  },

  async create(input: CourierInput): Promise<Courier> {
    await delay()
    storageService.seedIfNeeded()
    const now = new Date().toISOString()
    const courier: Courier = {
      ...input,
      id: createId('cou'),
      createdAt: now,
      updatedAt: now,
    }
    storageService.setCouriers([courier, ...storageService.getCouriers()])
    historyService.record({
      action: 'courier_created',
      entity: 'courier',
      entityId: courier.id,
      relatedCode: courier.name,
      newStatus: courier.status,
      description: `Correo ${courier.name} creado`,
    })
    return courier
  },

  async update(id: string, input: Partial<CourierInput>): Promise<Courier> {
    await delay()
    const couriers = storageService.getCouriers()
    const index = couriers.findIndex((courier) => courier.id === id)
    if (index < 0) throw new Error('Correo no encontrado')
    const current = couriers[index]
    if (!current) throw new Error('Correo no encontrado')
    const updated: Courier = {
      ...current,
      ...input,
      id: current.id,
      updatedAt: new Date().toISOString(),
    }
    couriers[index] = updated
    storageService.setCouriers(couriers)
    historyService.record({
      action: 'courier_updated',
      entity: 'courier',
      entityId: updated.id,
      relatedCode: updated.name,
      description: `Correo ${updated.name} actualizado`,
    })
    return updated
  },

  async setStatus(id: string, status: EntityStatus): Promise<Courier> {
    return this.update(id, { status })
  },
}
