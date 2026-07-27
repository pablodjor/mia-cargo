import type { Courier, Delivery, Driver, Package, Person, Vehicle } from '@/types'
import { formatFullName, getPackageOwnerName } from '@/utils/person-name'

export type GlobalSearchResultType =
  | 'person'
  | 'package'
  | 'driver'
  | 'delivery'
  | 'courier'
  | 'vehicle'

export interface GlobalSearchResult {
  id: string
  type: GlobalSearchResultType
  title: string
  subtitle: string
  keywords: string
  person?: Person
  package?: Package
  driver?: Driver
  delivery?: Delivery
  courier?: Courier
  vehicle?: Vehicle
}

export interface GlobalSearchGroup {
  type: GlobalSearchResultType
  label: string
  results: GlobalSearchResult[]
}

export interface GlobalSearchData {
  persons: Person[]
  packages: Package[]
  drivers: Driver[]
  deliveries: Delivery[]
  couriers: Courier[]
  vehicles: Vehicle[]
}

const GROUP_LABELS: Record<GlobalSearchResultType, string> = {
  person: 'Clientes',
  package: 'Paquetes',
  driver: 'Choferes',
  delivery: 'Repartos',
  courier: 'Correos',
  vehicle: 'Vehículos',
}

const GROUP_ORDER: GlobalSearchResultType[] = [
  'person',
  'package',
  'driver',
  'delivery',
  'courier',
  'vehicle',
]

const MAX_PER_GROUP = 8

function normalizeQuery(query: string) {
  return query.trim().toLowerCase()
}

function matches(value: string | undefined, query: string) {
  if (!query) return false
  return (value ?? '').toLowerCase().includes(query)
}

function matchesAny(values: Array<string | undefined>, query: string) {
  return values.some((value) => matches(value, query))
}

function pushLimited<T>(list: T[], item: T, limit: number) {
  if (list.length < limit) list.push(item)
}

export function searchGlobal(query: string, data: GlobalSearchData): GlobalSearchGroup[] {
  const normalized = normalizeQuery(query)
  if (!normalized) return []

  const byType: Record<GlobalSearchResultType, GlobalSearchResult[]> = {
    person: [],
    package: [],
    driver: [],
    delivery: [],
    courier: [],
    vehicle: [],
  }

  for (const person of data.persons) {
    if (
      !matchesAny(
        [formatFullName(person), person.phone, person.address, person.addressUnit, person.addressBell, person.city, person.province, person.postalCode, person.notes],
        normalized,
      )
    ) {
      continue
    }

    pushLimited(
      byType.person,
      {
        id: `person-${person.id}`,
        type: 'person',
        title: formatFullName(person),
        subtitle: `${person.phone} · ${person.city}`,
        keywords: [formatFullName(person), person.phone, person.address, person.city, person.province].join(' '),
        person,
      },
      MAX_PER_GROUP,
    )
  }

  for (const pkg of data.packages) {
    if (
      !matchesAny(
        [pkg.shCode, getPackageOwnerName(pkg), pkg.ownerPhone, pkg.address, pkg.city, pkg.province, pkg.postalCode],
        normalized,
      )
    ) {
      continue
    }

    pushLimited(byType.package, {
      id: `package-${pkg.id}`,
      type: 'package',
      title: pkg.shCode,
      subtitle: `${getPackageOwnerName(pkg)} · ${pkg.ownerPhone}`,
      keywords: [pkg.shCode, getPackageOwnerName(pkg), pkg.ownerPhone, pkg.city, pkg.province].join(' '),
      package: pkg,
    }, MAX_PER_GROUP)
  }

  for (const driver of data.drivers) {
    if (!matchesAny([formatFullName(driver), driver.dni, driver.email, driver.phone], normalized)) continue

    pushLimited(byType.driver, {
      id: `driver-${driver.id}`,
      type: 'driver',
      title: formatFullName(driver),
      subtitle: `${driver.phone} · DNI ${driver.dni}`,
      keywords: [formatFullName(driver), driver.dni, driver.email ?? '', driver.phone].join(' '),
      driver,
    }, MAX_PER_GROUP)
  }

  for (const delivery of data.deliveries) {
    if (!matches(delivery.code, normalized) && !matches(delivery.notes, normalized)) continue

    pushLimited(byType.delivery, {
      id: `delivery-${delivery.id}`,
      type: 'delivery',
      title: delivery.code,
      subtitle: delivery.date,
      keywords: [delivery.code, delivery.notes ?? ''].join(' '),
      delivery,
    }, MAX_PER_GROUP)
  }

  for (const courier of data.couriers) {
    if (
      !matchesAny(
        [courier.name, courier.branchName, courier.phone, courier.city, courier.address],
        normalized,
      )
    ) {
      continue
    }

    pushLimited(byType.courier, {
      id: `courier-${courier.id}`,
      type: 'courier',
      title: courier.name,
      subtitle: `${courier.branchName} · ${courier.city}`,
      keywords: [courier.name, courier.branchName, courier.phone, courier.city].join(' '),
      courier,
    }, MAX_PER_GROUP)
  }

  for (const vehicle of data.vehicles) {
    if (!matchesAny([vehicle.name, vehicle.plate, vehicle.type], normalized)) continue

    pushLimited(byType.vehicle, {
      id: `vehicle-${vehicle.id}`,
      type: 'vehicle',
      title: vehicle.name,
      subtitle: `${vehicle.plate} · ${vehicle.type}`,
      keywords: [vehicle.name, vehicle.plate, vehicle.type].join(' '),
      vehicle,
    }, MAX_PER_GROUP)
  }

  return GROUP_ORDER.flatMap((type) => {
    const results = byType[type]
    if (results.length === 0) return []
    return [{ type, label: GROUP_LABELS[type], results }]
  })
}

export function countGlobalSearchResults(groups: GlobalSearchGroup[]) {
  return groups.reduce((total, group) => total + group.results.length, 0)
}
