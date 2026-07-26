import {
  ArrowLeftRight,
  Banknote,
  CheckCircle2,
  CircleHelp,
  DollarSign,
  type LucideIcon,
} from 'lucide-react'
import type { PaymentStatus } from '@/types'
import { formatArs, formatUsd } from '@/utils/money'

export interface PaymentStatusCopy {
  label: string
  description: string
  driverHint: string
  selectLabel: string
}

export const PAYMENT_STATUS_COPY: Record<PaymentStatus, PaymentStatusCopy> = {
  paid: {
    label: 'Pagado',
    description: 'El importe ya está cobrado o acreditado. No hay nada que cobrar al entregar.',
    driverHint: 'No cobrar al entregar',
    selectLabel: 'Pagado — no hay que cobrar',
  },
  cash: {
    label: 'Cobrar en efectivo (ARS)',
    description: 'El cliente paga en pesos en mano al recibir el paquete. El chofer debe cobrar al entregar.',
    driverHint: 'Cobrar pesos en efectivo al entregar',
    selectLabel: 'Efectivo ARS — cobrar al entregar',
  },
  usd_cash: {
    label: 'Cobrar en dólares billete',
    description: 'El cliente paga en dólares billete al recibir el paquete. El chofer debe cobrar el importe en USD.',
    driverHint: 'Cobrar dólares billete al entregar',
    selectLabel: 'Dólares billete — cobrar al entregar',
  },
  pending: {
    label: 'Sin definir',
    description: 'Todavía no se definió cómo va a pagar el cliente. Revisar antes de salir a repartir.',
    driverHint: 'Confirmar forma de pago antes de entregar',
    selectLabel: 'Sin definir — falta confirmar el pago',
  },
  transfer: {
    label: 'Transferencia pendiente',
    description: 'El cliente debe transferir el importe. Todavía no está acreditado en cuenta.',
    driverHint: 'Verificar que la transferencia ingrese',
    selectLabel: 'Transferencia — pendiente de acreditar',
  },
}

export const PAYMENT_ICONS: Record<PaymentStatus, LucideIcon> = {
  paid: CheckCircle2,
  cash: Banknote,
  usd_cash: DollarSign,
  transfer: ArrowLeftRight,
  pending: CircleHelp,
}

export const PAYMENT_ACCENT: Record<
  PaymentStatus,
  {
    iconBg: string
    icon: string
    badgeTone: 'success' | 'warning' | 'info' | 'primary' | 'purple'
    badgeClass: string
    chipClass: string
  }
> = {
  paid: {
    iconBg: 'bg-success-light',
    icon: 'text-success',
    badgeTone: 'success',
    badgeClass: 'bg-success-light text-success ring-success/25',
    chipClass: 'border-success/25 bg-success-light/35',
  },
  cash: {
    iconBg: 'bg-warning-light',
    icon: 'text-warning',
    badgeTone: 'warning',
    badgeClass: 'bg-warning-light text-warning ring-warning/25',
    chipClass: 'border-warning/25 bg-warning-light/35',
  },
  usd_cash: {
    iconBg: 'bg-purple-light',
    icon: 'text-purple',
    badgeTone: 'purple',
    badgeClass: 'bg-purple-light text-purple ring-purple/25',
    chipClass: 'border-purple/25 bg-purple-light/35',
  },
  transfer: {
    iconBg: 'bg-info-light',
    icon: 'text-info',
    badgeTone: 'info',
    badgeClass: 'bg-info-light text-info ring-info/25',
    chipClass: 'border-info/25 bg-info-light/35',
  },
  pending: {
    iconBg: 'bg-primary-light',
    icon: 'text-primary-hover',
    badgeTone: 'primary',
    badgeClass: 'bg-primary-light text-primary-hover ring-primary/20',
    chipClass: 'border-primary/25 bg-primary-light/35',
  },
}

export function paymentIcon(status: PaymentStatus): LucideIcon {
  return PAYMENT_ICONS[status]
}

export function paymentStatusLabel(status: PaymentStatus): string {
  return PAYMENT_STATUS_COPY[status].label
}

export function paymentStatusDescription(status: PaymentStatus): string {
  return PAYMENT_STATUS_COPY[status].description
}

export function paymentDriverHint(status: PaymentStatus): string {
  return PAYMENT_STATUS_COPY[status].driverHint
}

export function paymentAmountLine(
  status: PaymentStatus,
  amountArs: number,
  amountUsd?: number,
): string {
  if (status === 'usd_cash') return `Cobrar ${formatUsd(amountUsd ?? 0)}`
  const formatted = formatArs(amountArs)
  if (status === 'paid') return `Pagado · ${formatted}`
  if (status === 'cash') return `Cobrar ${formatted}`
  if (status === 'transfer') return `Transferir ${formatted}`
  return `Sin definir · ${formatted}`
}

export function paymentActionLabel(
  pkg: Pick<import('@/types').Package, 'paymentStatus' | 'totalArs' | 'totalUsd'>,
): string {
  const copy = PAYMENT_STATUS_COPY[pkg.paymentStatus]
  if (pkg.paymentStatus === 'paid') return copy.driverHint
  if (pkg.paymentStatus === 'usd_cash') {
    return `${copy.driverHint} · ${formatUsd(pkg.totalUsd)}`
  }
  if (pkg.paymentStatus === 'pending') return `${copy.driverHint} · ${formatArs(pkg.totalArs)}`
  return `${copy.driverHint} · ${formatArs(pkg.totalArs)}`
}

export function paymentSelectOptions(statuses: PaymentStatus[]) {
  return statuses.map((status) => ({
    value: status,
    label: PAYMENT_STATUS_COPY[status].selectLabel,
  }))
}

export function paymentChipClass(status: PaymentStatus): string {
  return PAYMENT_ACCENT[status].chipClass
}
