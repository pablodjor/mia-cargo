import { MOCK_DATABASE_VERSION } from '@/constants/storage'
import type { DatabaseSnapshot } from '@/types'
import { couriersMock } from './couriers.mock'
import { deliveriesMock } from './deliveries.mock'
import { driversMock } from './drivers.mock'
import { failureReasonsMock } from './failureReasons.mock'
import { historyMock, seededPackagesMock } from './history.mock'
import { personsMock } from './persons.mock'
import { usersMock } from './users.mock'
import { vehiclesMock } from './vehicles.mock'

export function createInitialDatabase(): DatabaseSnapshot {
  return {
    version: MOCK_DATABASE_VERSION,
    users: structuredClone(usersMock),
    persons: structuredClone(personsMock),
    packages: structuredClone(seededPackagesMock),
    deliveries: structuredClone(deliveriesMock),
    drivers: structuredClone(driversMock),
    vehicles: structuredClone(vehiclesMock),
    couriers: structuredClone(couriersMock),
    history: structuredClone(historyMock),
    failureReasons: structuredClone(failureReasonsMock),
  }
}
