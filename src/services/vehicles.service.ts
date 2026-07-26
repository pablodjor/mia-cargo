import type { EntityStatus, Vehicle } from '@/types'
import { createId } from '@/utils/id'
import { delay } from '@/utils/delay'
import { historyService } from './history.service'
import { storageService } from './storage.service'

export type VehicleInput = Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>

export const vehiclesService = {
  async getAll(): Promise<Vehicle[]> {
    await delay()
    storageService.seedIfNeeded()
    return storageService.getVehicles()
  },

  async getById(id: string): Promise<Vehicle | null> {
    await delay()
    return storageService.getVehicles().find((vehicle) => vehicle.id === id) ?? null
  },

  async create(input: VehicleInput): Promise<Vehicle> {
    await delay()
    storageService.seedIfNeeded()
    const now = new Date().toISOString()
    const vehicle: Vehicle = {
      ...input,
      id: createId('veh'),
      createdAt: now,
      updatedAt: now,
    }
    storageService.setVehicles([vehicle, ...storageService.getVehicles()])
    historyService.record({
      action: 'vehicle_created',
      entity: 'vehicle',
      entityId: vehicle.id,
      relatedCode: vehicle.plate,
      newStatus: vehicle.status,
      description: `Vehículo ${vehicle.name} creado`,
    })
    return vehicle
  },

  async update(id: string, input: Partial<VehicleInput>): Promise<Vehicle> {
    await delay()
    const vehicles = storageService.getVehicles()
    const index = vehicles.findIndex((vehicle) => vehicle.id === id)
    if (index < 0) throw new Error('Vehículo no encontrado')
    const current = vehicles[index]
    if (!current) throw new Error('Vehículo no encontrado')
    const updated: Vehicle = {
      ...current,
      ...input,
      id: current.id,
      updatedAt: new Date().toISOString(),
    }
    vehicles[index] = updated
    storageService.setVehicles(vehicles)
    historyService.record({
      action: 'vehicle_updated',
      entity: 'vehicle',
      entityId: updated.id,
      relatedCode: updated.plate,
      description: `Vehículo ${updated.name} actualizado`,
    })
    return updated
  },

  async setStatus(id: string, status: EntityStatus): Promise<Vehicle> {
    return this.update(id, { status })
  },
}
