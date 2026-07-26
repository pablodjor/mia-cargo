import { PAYMENT_STATUS_BADGE_LABELS, PAYMENT_STATUS_DESCRIPTIONS } from '@/constants/labels'
import type { PaymentStatus } from '@/types'
import { cn } from '@/utils/cn'
import { PAYMENT_ACCENT, paymentIcon } from '@/utils/payment-display'

interface PaymentBadgeProps {
  status: PaymentStatus
  className?: string
  /** Muestra la descripción debajo del badge (solo en modales/detalle). */
  showDescription?: boolean
  size?: 'sm' | 'md'
}

export function PaymentBadge({
  status,
  className,
  showDescription = false,
  size = 'sm',
}: PaymentBadgeProps) {
  const Icon = paymentIcon(status)
  const accent = PAYMENT_ACCENT[status]

  return (
    <div
      className={cn('inline-flex max-w-full flex-col gap-1', className)}
      title={!showDescription ? PAYMENT_STATUS_DESCRIPTIONS[status] : undefined}
    >
      <span
        className={cn(
          'inline-flex max-w-full items-center gap-1.5 rounded-full font-semibold ring-1',
          size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
          accent.badgeClass,
        )}
      >
        <Icon className={cn('shrink-0', size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
        <span className="truncate">{PAYMENT_STATUS_BADGE_LABELS[status]}</span>
      </span>
      {showDescription ? (
        <span className="max-w-[240px] text-[11px] leading-snug text-text-muted">
          {PAYMENT_STATUS_DESCRIPTIONS[status]}
        </span>
      ) : null}
    </div>
  )
}

export function paymentTone(status: PaymentStatus) {
  return PAYMENT_ACCENT[status].badgeTone
}
