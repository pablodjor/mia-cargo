import type { Package, Person, PersonPackageStats, PersonSummary } from '@/types'

const ACTIVE_PACKAGE_STATUSES = new Set(['pending', 'assigned', 'in_route', 'not_delivered', 'rescheduled'])

export function getPackagesForPerson(person: Person, packages: Package[]): Package[] {
  return packages.filter(
    (pkg) =>
      pkg.personId === person.id ||
      (pkg.ownerName === person.name && pkg.ownerPhone === person.phone),
  )
}

export function computePersonPackageStats(packages: Package[]): PersonPackageStats {
  let deliveredCount = 0
  let activeCount = 0
  let pendingPaymentCount = 0
  let totalUsd = 0
  let totalArs = 0
  let paidArs = 0
  let cashArs = 0
  let pendingArs = 0
  let transferArs = 0
  let usdCashUsd = 0
  let lastPackageAt: string | undefined

  for (const pkg of packages) {
    totalUsd += pkg.totalUsd
    totalArs += pkg.totalArs

    if (pkg.status === 'delivered') deliveredCount += 1
    if (ACTIVE_PACKAGE_STATUSES.has(pkg.status)) activeCount += 1

    if (pkg.paymentStatus === 'paid') paidArs += pkg.totalArs
    if (pkg.paymentStatus === 'cash') cashArs += pkg.totalArs
    if (pkg.paymentStatus === 'pending') {
      pendingArs += pkg.totalArs
      pendingPaymentCount += 1
    }
    if (pkg.paymentStatus === 'transfer') transferArs += pkg.totalArs
    if (pkg.paymentStatus === 'usd_cash') usdCashUsd += pkg.totalUsd

    if (!lastPackageAt || pkg.updatedAt.localeCompare(lastPackageAt) > 0) {
      lastPackageAt = pkg.updatedAt
    }
  }

  return {
    packageCount: packages.length,
    deliveredCount,
    activeCount,
    pendingPaymentCount,
    totalUsd,
    totalArs,
    paidArs,
    cashArs,
    pendingArs,
    transferArs,
    usdCashUsd,
    lastPackageAt,
  }
}

export function buildPersonSummaries(persons: Person[], packages: Package[]): PersonSummary[] {
  return persons.map((person) => ({
    person,
    stats: computePersonPackageStats(getPackagesForPerson(person, packages)),
  }))
}

export function applyPersonToPackageFields(person: Person) {
  return {
    personId: person.id,
    ownerName: person.name,
    ownerPhone: person.phone,
    address: person.address,
    city: person.city,
    province: person.province,
    postalCode: person.postalCode,
    destinationType: person.destinationType,
    addressUnit: person.addressUnit,
    addressBell: person.addressBell,
    addressPlaceType: person.addressPlaceType,
  }
}
