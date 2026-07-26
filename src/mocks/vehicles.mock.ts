import type { Vehicle } from '@/types'

export const vehiclesMock: Vehicle[] = [
  {
    id: 'veh_1',
    name: 'Fiat Fiorino',
    type: 'Furgón',
    plate: 'AB123CD',
    capacityKg: 550,
    status: 'active',
    habitualDriverId: 'drv_1',
    createdAt: '2026-01-10T10:00:00.000Z',
    updatedAt: '2026-07-01T10:00:00.000Z',
  },
  {
    id: 'veh_2',
    name: 'Renault Kangoo',
    type: 'Utilitario',
    plate: 'AC456EF',
    capacityKg: 650,
    status: 'active',
    habitualDriverId: 'drv_2',
    createdAt: '2026-01-12T10:00:00.000Z',
    updatedAt: '2026-07-01T10:00:00.000Z',
  },
  {
    id: 'veh_3',
    name: 'Peugeot Partner',
    type: 'Utilitario',
    plate: 'AD789GH',
    capacityKg: 700,
    status: 'active',
    habitualDriverId: 'drv_3',
    createdAt: '2026-02-01T10:00:00.000Z',
    updatedAt: '2026-07-01T10:00:00.000Z',
  },
]
