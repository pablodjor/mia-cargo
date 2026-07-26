import { CheckCircle2 } from 'lucide-react'
import { PAYMENT_STATUS_LABELS } from '@/constants/labels'
import type { Package, PaymentStatus } from '@/types'
import { formatArs, formatUsd } from '@/utils/money'
import { cn } from '@/utils/cn'
import {
  PAYMENT_ACCENT,
  paymentAmountLine,
  paymentDriverHint,
  paymentIcon,
  paymentStatusDescription,
} from '@/utils/payment-display'

export { paymentActionLabel } from '@/utils/payment-display'
export { PaymentBadge, paymentTone } from '@/components/common/PaymentBadge'

export function sumCashToCollect(packages: Pick<Package, 'paymentStatus' | 'totalArs'>[]): number {
  return packages
    .filter((pkg) => pkg.paymentStatus === 'cash' || pkg.paymentStatus === 'pending')
    .reduce((sum, pkg) => sum + pkg.totalArs, 0)
}

export function sumUsdCashToCollect(
  packages: Pick<Package, 'paymentStatus' | 'totalUsd'>[],
): number {
  return packages
    .filter((pkg) => pkg.paymentStatus === 'usd_cash')
    .reduce((sum, pkg) => sum + pkg.totalUsd, 0)
}

export function countPaid(packages: Pick<Package, 'paymentStatus'>[]): number {
  return packages.filter((pkg) => pkg.paymentStatus === 'paid').length
}

export function PackagePaymentInfo({
  pkg,
  compact = false,
  className,
}: {
  pkg: Pick<Package, 'paymentStatus' | 'totalArs' | 'totalUsd'>
  compact?: boolean
  className?: string
}) {
  const Icon = paymentIcon(pkg.paymentStatus)
  const accent = PAYMENT_ACCENT[pkg.paymentStatus]
  const description = paymentStatusDescription(pkg.paymentStatus)

  return (
    <div
      className={cn(
        'inline-flex max-w-full items-start gap-2 rounded-[10px] border bg-surface',
        accent.chipClass,
        compact ? 'py-1 pl-1 pr-2.5' : 'p-1.5 pr-3',
        className,
      )}
      title={description}
    >
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full',
          compact ? 'h-7 w-7' : 'h-8 w-8',
          accent.iconBg,
        )}
      >
        <Icon className={cn(compact ? 'h-3.5 w-3.5' : 'h-4 w-4', accent.icon)} />
      </span>
      <span className="min-w-0">
        <span
          className={cn(
            'block truncate font-semibold text-text-primary',
            compact ? 'text-xs' : 'text-sm',
          )}
        >
          {paymentAmountLine(pkg.paymentStatus, pkg.totalArs, pkg.totalUsd)}
        </span>
        <span
          className={cn(
            'block text-text-muted',
            compact ? 'text-[11px] leading-snug' : 'text-xs leading-snug',
          )}
        >
          {paymentDriverHint(pkg.paymentStatus)}
        </span>
      </span>
    </div>
  )
}

export function PaymentSummaryPanel({
  status,
  amount,
  amountUsd,
  actionLabel,
  className,
}: {
  status: PaymentStatus
  amount: number
  amountUsd?: number
  label?: string
  actionLabel?: string
  className?: string
}) {
  const Icon = paymentIcon(status)
  const accent = PAYMENT_ACCENT[status]
  const needsCollection = status === 'cash'
  const needsUsdCollection = status === 'usd_cash'
  const needsReview = status === 'pending'

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-[12px] border p-3 shadow-sm',
        accent.chipClass,
        className,
      )}
    >
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
          accent.iconBg,
        )}
      >
        <Icon className={cn('h-5 w-5', accent.icon)} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-text-primary">
          {PAYMENT_STATUS_LABELS[status]}
        </p>
        <p className="mt-0.5 text-xs font-medium text-text-secondary">
          {actionLabel ?? paymentDriverHint(status)}
        </p>
        <p
          className={cn(
            'mt-1 text-xl font-bold tracking-tight',
            status === 'paid' ? 'text-text-muted' : 'text-text-primary',
          )}
        >
          {status === 'usd_cash' ? formatUsd(amountUsd ?? 0) : formatArs(amount)}
        </p>
      </div>
      {needsUsdCollection ? (
        <span className="shrink-0 rounded-full bg-purple-light px-2 py-0.5 text-[10px] font-bold tracking-wide text-purple uppercase ring-1 ring-purple/25">
          USD
        </span>
      ) : needsCollection ? (
        <span className="shrink-0 rounded-full bg-warning-light px-2 py-0.5 text-[10px] font-bold tracking-wide text-warning uppercase ring-1 ring-warning/25">
          A cobrar
        </span>
      ) : needsReview ? (
        <span className="shrink-0 rounded-full bg-primary-light px-2 py-0.5 text-[10px] font-bold tracking-wide text-primary-hover uppercase ring-1 ring-primary/20">
          Revisar
        </span>
      ) : status === 'paid' ? (
        <CheckCircle2 className="h-5 w-5 shrink-0 text-success/80" aria-hidden />
      ) : status === 'transfer' ? (
        <span className="shrink-0 rounded-full bg-info-light px-2 py-0.5 text-[10px] font-bold tracking-wide text-info uppercase ring-1 ring-info/25">
          Pendiente
        </span>
      ) : null}
    </div>
  )
}

export function paymentPanelClasses(status: PaymentStatus) {
  return cn('rounded-[12px] border p-3 shadow-sm', PAYMENT_ACCENT[status].chipClass)
}
