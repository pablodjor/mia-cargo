import type { HistoryEntry, Package, PaymentStatus } from '@/types'
import { isSameDayISO } from '@/utils/date'

const DELIVERED_ACTIONS = new Set(['package_delivered', 'package_pickup_registered'])
const NOT_DELIVERED_ACTIONS = new Set(['package_not_delivered'])
const RESCHEDULED_ACTIONS = new Set(['package_rescheduled'])

export interface DashboardPaymentBreakdown {
  status: PaymentStatus
  count: number
  totalArs: number
  totalUsd: number
}

export interface DashboardPeriodStats {
  delivered: number
  notDelivered: number
  rescheduled: number
  collectedArs: number
  collectedUsd: number
  pendingCollectionArs: number
  pendingCollectionUsd: number
  paymentBreakdown: DashboardPaymentBreakdown[]
}

function historyMatchesDate(entry: HistoryEntry, date: string | null): boolean {
  if (!date) return true
  return isSameDayISO(entry.createdAt, date)
}

function uniquePackageIdsFromHistory(
  history: HistoryEntry[],
  actions: Set<string>,
  date: string | null,
): Set<string> {
  const ids = new Set<string>()
  for (const entry of history) {
    if (entry.entity !== 'package' || !actions.has(entry.action)) continue
    if (!historyMatchesDate(entry, date)) continue
    ids.add(entry.entityId)
  }
  return ids
}

function deliveredIdsWithFallback(
  packages: Package[],
  history: HistoryEntry[],
  date: string | null,
): Set<string> {
  const ids = uniquePackageIdsFromHistory(history, DELIVERED_ACTIONS, date)

  if (date) {
    for (const pkg of packages) {
      if (pkg.status !== 'delivered' || !pkg.updatedAt) continue
      if (isSameDayISO(pkg.updatedAt, date)) ids.add(pkg.id)
    }
    return ids
  }

  for (const pkg of packages) {
    if (pkg.status === 'delivered') ids.add(pkg.id)
  }
  return ids
}

function notDeliveredIdsWithFallback(
  packages: Package[],
  history: HistoryEntry[],
  date: string | null,
): Set<string> {
  const ids = uniquePackageIdsFromHistory(history, NOT_DELIVERED_ACTIONS, date)

  if (date) {
    for (const pkg of packages) {
      if (pkg.status !== 'not_delivered' || !pkg.updatedAt) continue
      if (isSameDayISO(pkg.updatedAt, date)) ids.add(pkg.id)
    }
  } else {
    for (const pkg of packages) {
      if (pkg.status === 'not_delivered') ids.add(pkg.id)
    }
  }

  return ids
}

function rescheduledIdsWithFallback(
  packages: Package[],
  history: HistoryEntry[],
  date: string | null,
): Set<string> {
  const ids = uniquePackageIdsFromHistory(history, RESCHEDULED_ACTIONS, date)

  if (date) {
    for (const pkg of packages) {
      if (pkg.status !== 'rescheduled' || !pkg.updatedAt) continue
      if (isSameDayISO(pkg.updatedAt, date)) ids.add(pkg.id)
    }
  } else {
    for (const pkg of packages) {
      if (pkg.status === 'rescheduled') ids.add(pkg.id)
    }
  }

  return ids
}

function buildPaymentBreakdown(packages: Package[]): DashboardPaymentBreakdown[] {
  const statuses: PaymentStatus[] = ['paid', 'cash', 'usd_cash', 'transfer', 'pending']
  const buckets = Object.fromEntries(
    statuses.map((status) => [status, { count: 0, totalArs: 0, totalUsd: 0 }]),
  ) as Record<PaymentStatus, { count: number; totalArs: number; totalUsd: number }>

  for (const pkg of packages) {
    const bucket = buckets[pkg.paymentStatus]
    bucket.count += 1
    bucket.totalArs += pkg.totalArs
    bucket.totalUsd += pkg.totalUsd
  }

  return statuses.map((status) => ({
    status,
    ...buckets[status],
  }))
}

export function computeDashboardPeriodStats(
  packages: Package[],
  history: HistoryEntry[],
  date: string | null,
): DashboardPeriodStats {
  const packageById = new Map(packages.map((pkg) => [pkg.id, pkg]))

  const deliveredIds = deliveredIdsWithFallback(packages, history, date)
  const notDeliveredIds = notDeliveredIdsWithFallback(packages, history, date)
  const rescheduledIds = rescheduledIdsWithFallback(packages, history, date)

  const deliveredPackages = [...deliveredIds]
    .map((id) => packageById.get(id))
    .filter((pkg): pkg is Package => Boolean(pkg))

  const paymentBreakdown = buildPaymentBreakdown(deliveredPackages)

  const collectedArs = paymentBreakdown
    .filter((item) => item.status === 'paid' || item.status === 'cash' || item.status === 'transfer')
    .reduce((sum, item) => sum + item.totalArs, 0)

  const collectedUsd = paymentBreakdown
    .filter((item) => item.status === 'usd_cash')
    .reduce((sum, item) => sum + item.totalUsd, 0)

  const pending = paymentBreakdown.find((item) => item.status === 'pending')

  return {
    delivered: deliveredIds.size,
    notDelivered: notDeliveredIds.size,
    rescheduled: rescheduledIds.size,
    collectedArs,
    collectedUsd,
    pendingCollectionArs: pending?.totalArs ?? 0,
    pendingCollectionUsd: pending?.totalUsd ?? 0,
    paymentBreakdown,
  }
}
