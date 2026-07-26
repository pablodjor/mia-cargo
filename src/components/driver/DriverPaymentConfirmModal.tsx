import { Check, CheckCircle2, CircleDollarSign } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { PaymentSummaryPanel } from '@/components/common/PackagePaymentInfo'
import type { Package, PaymentStatus } from '@/types'
import type { DriverDeliveryPaymentOption } from '@/utils/payment-rules'
import { formatArs, formatUsd } from '@/utils/money'
import { paymentIcon } from '@/utils/payment-display'
import { cn } from '@/utils/cn'

const OPTION_TONE_STYLES: Record<
  DriverDeliveryPaymentOption['tone'],
  { ring: string; iconWrap: string; icon: string }
> = {
  success: {
    ring: 'border-success/40 bg-success-light/40',
    iconWrap: 'bg-success-light',
    icon: 'text-success',
  },
  warning: {
    ring: 'border-warning/35 bg-warning-light/40',
    iconWrap: 'bg-warning-light',
    icon: 'text-warning',
  },
  info: {
    ring: 'border-info/35 bg-info-light/50',
    iconWrap: 'bg-info-light',
    icon: 'text-info',
  },
  purple: {
    ring: 'border-purple/35 bg-purple-light/40',
    iconWrap: 'bg-purple-light',
    icon: 'text-purple',
  },
  neutral: {
    ring: 'border-border bg-background',
    iconWrap: 'bg-secondary-light',
    icon: 'text-secondary',
  },
}

function PaymentOptionButton({
  option,
  selected,
  onSelect,
}: {
  option: DriverDeliveryPaymentOption
  selected: boolean
  onSelect: () => void
}) {
  const Icon = paymentIcon(option.value)
  const styles = OPTION_TONE_STYLES[option.tone]

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-start gap-3 rounded-[12px] border-2 p-3 text-left transition',
        selected
          ? cn(styles.ring, 'border-primary shadow-sm ring-2 ring-primary/20')
          : 'border-border bg-surface hover:border-primary/25 hover:bg-background',
      )}
    >
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
          styles.iconWrap,
        )}
      >
        <Icon className={cn('h-4 w-4', styles.icon)} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-text-primary">{option.label}</span>
          {selected ? <Check className="h-4 w-4 shrink-0 text-primary" /> : null}
        </span>
        <span className="mt-0.5 block text-xs leading-snug text-text-secondary">
          {option.description}
        </span>
      </span>
    </button>
  )
}

interface DriverPaymentConfirmModalProps {
  open: boolean
  onClose: () => void
  pkg: Package | null
  isCourier: boolean
  options: DriverDeliveryPaymentOption[]
  selectedPayment: PaymentStatus
  onSelectPayment: (status: PaymentStatus) => void
  onConfirm: () => void
}

export function DriverPaymentConfirmModal({
  open,
  onClose,
  pkg,
  isCourier,
  options,
  selectedPayment,
  onSelectPayment,
  onConfirm,
}: DriverPaymentConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isCourier ? 'Confirmar pago' : 'Confirmar cobro'}
      description={
        pkg ? `${pkg.shCode} · ${pkg.ownerName}` : undefined
      }
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" className="w-full sm:w-auto" onClick={onClose}>
            Cancelar
          </Button>
          <Button className="w-full sm:w-auto" onClick={onConfirm}>
            <CheckCircle2 className="h-4 w-4" />
            Confirmar entrega
          </Button>
        </div>
      }
    >
      {pkg ? (
        <div className="space-y-5">
          <div className="flex items-center gap-2 rounded-[10px] bg-secondary-light/60 px-3 py-2 text-sm text-secondary">
            <CircleDollarSign className="h-4 w-4 shrink-0" />
            <span>
              Total del paquete:{' '}
              <strong className="text-text-primary">
                {pkg.paymentStatus === 'usd_cash'
                  ? formatUsd(pkg.totalUsd)
                  : formatArs(pkg.totalArs)}
              </strong>
              {pkg.paymentStatus !== 'usd_cash' ? (
                <span className="text-text-muted"> · ref. {formatUsd(pkg.totalUsd)}</span>
              ) : null}
            </span>
          </div>

          <PaymentSummaryPanel
            status={pkg.paymentStatus}
            amount={pkg.totalArs}
            amountUsd={pkg.totalUsd}
            actionLabel="Estado planificado"
          />

          <div>
            <p className="text-sm font-semibold text-text-primary">
              {isCourier ? '¿Cómo quedó el pago?' : '¿Cómo quedó el cobro?'}
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              Elegí el resultado final. Si cobró o transfirió, usá{' '}
              <strong className="text-text-primary">Pagó / cobré</strong>.
            </p>
            <div className="mt-3 space-y-2">
              {options.map((option) => (
                <PaymentOptionButton
                  key={option.value}
                  option={option}
                  selected={selectedPayment === option.value}
                  onSelect={() => onSelectPayment(option.value)}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  )
}
