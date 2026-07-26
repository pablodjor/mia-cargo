import { MOCK_DATABASE_VERSION } from '@/constants/storage'
import type { DatabaseSnapshot, Delivery, Package } from '@/types'
import { formatDeliveryCode } from '@/utils/delivery-code'
import { todayISODate } from '@/utils/date'
import { couriersMock } from './couriers.mock'
import { driversMock } from './drivers.mock'
import { failureReasonsMock } from './failureReasons.mock'
import { createInitialDatabase } from './database'
import { personsMock } from './persons.mock'
import { usersMock } from './users.mock'
import { vehiclesMock } from './vehicles.mock'

export type MockDataPreset = 'empty' | 'full' | 'minimal'

export function createDatabasePreset(preset: MockDataPreset): DatabaseSnapshot {
  if (preset === 'full') return createInitialDatabase()
  if (preset === 'empty') return createEmptyDatabase()
  return createMinimalDatabase()
}

function createEmptyDatabase(): DatabaseSnapshot {
  return {
    version: MOCK_DATABASE_VERSION,
    users: structuredClone(usersMock),
    failureReasons: structuredClone(failureReasonsMock),
    persons: [],
    packages: [],
    deliveries: [],
    drivers: [],
    vehicles: [],
    couriers: [],
    history: [],
  }
}

function createMinimalDatabase(): DatabaseSnapshot {
  const today = todayISODate()
  const persons = structuredClone(personsMock.slice(0, 3))
  const drivers = [structuredClone(driversMock[0]!)]
  const vehicles = [structuredClone(vehiclesMock[0]!)]
  const couriers = [structuredClone(couriersMock[0]!)]
  const users = structuredClone(usersMock)
  const failureReasons = structuredClone(failureReasonsMock)

  const full = createInitialDatabase()
  const keepPackageIds = ['pkg_001', 'pkg_002', 'pkg_003', 'pkg_004', 'pkg_005', 'pkg_006']
  const deliveryPackageIds = ['pkg_003', 'pkg_004', 'pkg_005']

  const packages: Package[] = full.packages
    .filter((pkg) => keepPackageIds.includes(pkg.id))
    .map((pkg) => ({
      ...pkg,
      deliveryId: undefined,
      status: 'pending' as const,
      failureReasonId: undefined,
      failureNotes: undefined,
      lastAttemptAt: undefined,
      failedAttempts: undefined,
    }))

  for (const pkg of packages) {
    if (deliveryPackageIds.includes(pkg.id)) {
      pkg.deliveryId = 'del_1'
      pkg.status = 'assigned'
    }
  }

  const deliveries: Delivery[] = [
    {
      id: 'del_1',
      code: formatDeliveryCode(today, 1),
      date: today,
      zone: 'caba',
      channel: 'last_mile',
      driverId: 'drv_1',
      vehicleId: 'veh_1',
      status: 'prepared',
      notes: 'Reparto reducido de ejemplo',
      stops: deliveryPackageIds.map((packageId, index) => ({
        packageId,
        order: index + 1,
        status: 'pending' as const,
      })),
      createdAt: `${today}T07:00:00.000Z`,
      updatedAt: `${today}T08:00:00.000Z`,
    },
  ]

  const relatedIds = new Set([...keepPackageIds, 'del_1', 'drv_1', 'veh_1', 'cou_1'])
  const history = full.history.filter((entry) => relatedIds.has(entry.entityId)).slice(0, 6)

  return {
    version: MOCK_DATABASE_VERSION,
    users,
    persons,
    packages,
    deliveries,
    drivers,
    vehicles,
    couriers,
    history,
    failureReasons,
  }
}
