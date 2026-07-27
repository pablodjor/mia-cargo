import type { Courier, Delivery, DeliveryStatus, Driver, Package, PackageStatus } from '@/types'

const DELIVERY_LINKED_STATUSES: PackageStatus[] = [
  'assigned',
  'in_route',
  'not_delivered',
  'rescheduled',
]

const ACTIVE_PACKAGE_DELIVERY_STATUSES = DELIVERY_LINKED_STATUSES

/** Paquete con reparto activo (aún no entregado ni cancelado). */
export function packageHasActiveDeliveryAssignment(pkg: Package): boolean {
  return Boolean(pkg.deliveryId && ACTIVE_PACKAGE_DELIVERY_STATUSES.includes(pkg.status))
}


/** Paquetes en reparto deben tener deliveryId; retiro en depósito puede quedar entregado sin reparto. */
export function normalizePackageDeliveryLink(pkg: Package): Package {
  if (!DELIVERY_LINKED_STATUSES.includes(pkg.status)) {
    return pkg
  }

  if (pkg.deliveryId) {
    return pkg
  }

  return {
    ...pkg,
    status: 'pending',
    deliveryId: undefined,
    failureReasonId: undefined,
    failureNotes: undefined,
    lastAttemptAt: undefined,
    failedAttempts: undefined,
  }
}

export interface PackageDeliveryAssignment {
  deliveryId: string
  deliveryCode: string
  deliveryStatus: DeliveryStatus
  driverName?: string
}

export interface PackageDeliveredByInfo {
  kind: 'driver' | 'courier'
  name: string
  deliveryId: string
  deliveryCode: string
  deliveredAt?: string
}

function findDeliveredStop(
  pkg: Package,
  deliveries: Delivery[],
): { delivery: Delivery; deliveredAt?: string } | undefined {
  const matches = deliveries
    .map((delivery) => {
      const stop = delivery.stops.find(
        (item) => item.packageId === pkg.id && item.status === 'delivered',
      )
      if (!stop) return null
      return { delivery, deliveredAt: stop.attemptedAt }
    })
    .filter(Boolean) as Array<{ delivery: Delivery; deliveredAt?: string }>

  if (matches.length === 0) return undefined

  if (pkg.deliveryId) {
    const current = matches.find((item) => item.delivery.id === pkg.deliveryId)
    if (current) return current
  }

  return matches.sort((a, b) => {
    const left = a.deliveredAt ?? a.delivery.updatedAt
    const right = b.deliveredAt ?? b.delivery.updatedAt
    return right.localeCompare(left)
  })[0]
}

export function getPackageDeliveryAssignment(
  pkg: Package,
  deliveries: Delivery[],
  drivers: Driver[],
): PackageDeliveryAssignment | undefined {
  if (!pkg.deliveryId) return undefined

  const delivery = deliveries.find((item) => item.id === pkg.deliveryId)
  if (!delivery) return undefined

  const driver = drivers.find((item) => item.id === delivery.driverId)

  return {
    deliveryId: delivery.id,
    deliveryCode: delivery.code,
    deliveryStatus: delivery.status,
    driverName: driver?.name,
  }
}

export function buildPackageDeliveryAssignmentMap(
  packages: Package[],
  deliveries: Delivery[],
  drivers: Driver[],
): Map<string, PackageDeliveryAssignment> {
  const map = new Map<string, PackageDeliveryAssignment>()
  for (const pkg of packages) {
    const info = getPackageDeliveryAssignment(pkg, deliveries, drivers)
    if (info) map.set(pkg.id, info)
  }
  return map
}

export function getPackageDeliveredBy(
  pkg: Package,
  deliveries: Delivery[],
  drivers: Driver[],
  couriers: Courier[],
): PackageDeliveredByInfo | undefined {
  if (pkg.status !== 'delivered') return undefined

  const match = findDeliveredStop(pkg, deliveries)
  if (!match) return undefined

  const { delivery, deliveredAt } = match

  if (delivery.channel === 'courier' && delivery.courierId) {
    const courier = couriers.find((item) => item.id === delivery.courierId)
    return {
      kind: 'courier',
      name: courier ? `${courier.name} · ${courier.branchName}` : 'Correo',
      deliveryId: delivery.id,
      deliveryCode: delivery.code,
      deliveredAt,
    }
  }

  const driver = drivers.find((item) => item.id === delivery.driverId)
  return {
    kind: 'driver',
    name: driver?.name ?? 'Chofer',
    deliveryId: delivery.id,
    deliveryCode: delivery.code,
    deliveredAt,
  }
}

export function buildPackageDeliveredByMap(
  packages: Package[],
  deliveries: Delivery[],
  drivers: Driver[],
  couriers: Courier[],
): Map<string, PackageDeliveredByInfo> {
  const map = new Map<string, PackageDeliveredByInfo>()
  for (const pkg of packages) {
    const info = getPackageDeliveredBy(pkg, deliveries, drivers, couriers)
    if (info) map.set(pkg.id, info)
  }
  return map
}
