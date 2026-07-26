import { ALL_PAYMENT_STATUSES } from '@/constants/labels'
import type { Package, PaymentStatus } from '@/types'

export interface PaymentStatusSummary {
  status: PaymentStatus
  count: number
  totalArs: number
  totalUsd: number
}

export interface PaymentReportStats {
  totalPackages: number
  byStatus: PaymentStatusSummary[]
  toCollectArs: number
  toCollectUsd: number
}

export function computePaymentReportStats(packages: Package[]): PaymentReportStats {
  const buckets = Object.fromEntries(
    ALL_PAYMENT_STATUSES.map((status) => [
      status,
      { count: 0, totalArs: 0, totalUsd: 0 },
    ]),
  ) as Record<PaymentStatus, { count: number; totalArs: number; totalUsd: number }>

  for (const pkg of packages) {
    const bucket = buckets[pkg.paymentStatus]
    bucket.count += 1
    bucket.totalArs += pkg.totalArs
    bucket.totalUsd += pkg.totalUsd
  }

  return {
    totalPackages: packages.length,
    byStatus: ALL_PAYMENT_STATUSES.map((status) => ({
      status,
      ...buckets[status],
    })),
    toCollectArs:
      buckets.cash.totalArs + buckets.pending.totalArs + buckets.transfer.totalArs,
    toCollectUsd: buckets.usd_cash.totalUsd,
  }
}

export function paymentSummaryAmountLabel(summary: PaymentStatusSummary): string {
  if (summary.status === 'usd_cash') {
    return summary.count > 0 ? `USD ${summary.totalUsd.toFixed(2)}` : '—'
  }
  if (summary.count === 0) return '—'
  return `$ ${summary.totalArs.toLocaleString('es-AR')}`
}
