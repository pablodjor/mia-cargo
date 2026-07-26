import { ACTIVE_DELIVERY_STATUSES } from '@/constants/labels'
import type { Delivery, DeliveryChannel, Package, PackageStatus, PaymentStatus } from '@/types'
import { PAYMENT_STATUS_COPY } from '@/utils/payment-display'

export const LAST_MILE_PAYMENT_STATUSES: PaymentStatus[] = [
  'paid',
  'cash',
  'usd_cash',
  'pending',
  'transfer',
]
export const COURIER_PAYMENT_STATUSES: PaymentStatus[] = ['paid', 'transfer']

const DOMICILIO_CASH_STATUSES = new Set<PaymentStatus>(['cash', 'usd_cash', 'pending'])

export function getDeliveryById(
  deliveries: Delivery[],
  deliveryId?: string,
): Delivery | undefined {
  if (!deliveryId) return undefined
  return deliveries.find((delivery) => delivery.id === deliveryId)
}

export function getPackageDelivery(
  pkg: Pick<Package, 'deliveryId'>,
  deliveries: Delivery[],
): Delivery | undefined {
  if (!pkg.deliveryId) return undefined
  return getDeliveryById(deliveries, pkg.deliveryId)
}

export function isCourierDelivery(delivery?: Pick<Delivery, 'channel'>): boolean {
  return delivery?.channel === 'courier'
}

export function isCourierPackage(
  pkg: Pick<Package, 'deliveryId'>,
  deliveries: Delivery[],
): boolean {
  return isCourierDelivery(getPackageDelivery(pkg, deliveries))
}

export function normalizePaymentForCourier(status: PaymentStatus): PaymentStatus {
  if (status === 'cash' || status === 'usd_cash') {
    throw new Error('Los repartos a correo no admiten cobro en efectivo. Usá transferencia.')
  }
  if (status === 'pending') return 'transfer'
  if (status === 'transfer' || status === 'paid') return status
  return status
}

export function assertCourierPackagePayment(
  pkg: Pick<Package, 'shCode' | 'paymentStatus'>,
): void {
  if (pkg.paymentStatus === 'cash') {
    throw new Error(
      `El paquete ${pkg.shCode} tiene pago en efectivo ARS. En repartos a correo solo se permite transferencia.`,
    )
  }
  if (pkg.paymentStatus === 'usd_cash') {
    throw new Error(
      `El paquete ${pkg.shCode} tiene pago en dólares billete. En repartos a correo solo se permite transferencia.`,
    )
  }
  if (pkg.paymentStatus === 'pending') {
    throw new Error(
      `El paquete ${pkg.shCode} tiene pago pendiente en domicilio. Cambiá el pago a transferencia antes de enviarlo a correo.`,
    )
  }
}

export function paymentOptionsForChannel(channel?: DeliveryChannel | null): PaymentStatus[] {
  if (channel === 'courier') {
    return COURIER_PAYMENT_STATUSES
  }
  return LAST_MILE_PAYMENT_STATUSES
}

export interface DriverDeliveryPaymentOption {
  value: PaymentStatus
  label: string
  description: string
  tone: 'success' | 'warning' | 'info' | 'neutral' | 'purple'
}

/** Opciones que el chofer confirma al marcar una entrega. */
export function driverDeliveryPaymentOptions(
  channel: DeliveryChannel,
): DriverDeliveryPaymentOption[] {
  if (channel === 'courier') {
    return [
      {
        value: 'paid',
        label: 'Transferencia acreditada',
        description: 'El pago ya ingresó en cuenta',
        tone: 'success',
      },
      {
        value: 'transfer',
        label: 'Transferencia pendiente',
        description: 'Todavía falta acreditar la transferencia',
        tone: 'info',
      },
    ]
  }

  return [
    {
      value: 'paid',
      label: 'Pagó / cobré',
      description: 'Efectivo, dólares billete, transferencia recibida o ya estaba pago',
      tone: 'success',
    },
    {
      value: 'transfer',
      label: 'Transferencia pendiente',
      description: 'El cliente transfiere después de la entrega',
      tone: 'info',
    },
    {
      value: 'cash',
      label: 'Debe en efectivo (ARS)',
      description: 'Entregué y el cobro en pesos sigue pendiente',
      tone: 'warning',
    },
    {
      value: 'usd_cash',
      label: 'Debe en dólares billete',
      description: 'Entregué y el cobro en USD billete sigue pendiente',
      tone: 'purple',
    },
    {
      value: 'pending',
      label: 'Sin pagar',
      description: 'Entregué y el pago quedó pendiente',
      tone: 'neutral',
    },
  ]
}

export function assertDriverDeliveryPayment(
  channel: DeliveryChannel,
  status: PaymentStatus,
): void {
  const allowed = new Set(driverDeliveryPaymentOptions(channel).map((item) => item.value))
  if (!allowed.has(status) && channel === 'courier') {
    throw new Error('En repartos a correo solo se permite transferencia acreditada o pendiente.')
  }
  if (channel === 'courier' && DOMICILIO_CASH_STATUSES.has(status)) {
    throw new Error('En repartos a correo no se admite efectivo, dólares billete ni pago pendiente en domicilio.')
  }
}

/** Si el chofer debe confirmar el cobro en un modal al marcar entregado. */
export function needsPaymentConfirmOnDelivery(status: PaymentStatus): boolean {
  return status !== 'paid'
}

/** Opciones de pago al editar un paquete (incluye transferencia si aún no va a correo). */
export function paymentOptionsForPackage(
  pkg: Pick<Package, 'deliveryId'> | null | undefined,
  deliveries: Delivery[],
): PaymentStatus[] {
  if (pkg && isCourierPackage(pkg, deliveries)) {
    return COURIER_PAYMENT_STATUSES
  }
  return LAST_MILE_PAYMENT_STATUSES
}

export interface CollectionDeskPaymentOption {
  value: PaymentStatus
  label: string
  description: string
}

/** Opciones de pago en mostrador (Cobranzas). */
export function collectionDeskPaymentOptions(
  pkg: Pick<Package, 'deliveryId'>,
  deliveries: Delivery[],
): CollectionDeskPaymentOption[] {
  return paymentOptionsForPackage(pkg, deliveries).map((value) => ({
    value,
    label: PAYMENT_STATUS_COPY[value].label,
    description: PAYMENT_STATUS_COPY[value].description,
  }))
}

const WAREHOUSE_PICKUP_STATUSES = new Set<PackageStatus>([
  'pending',
  'assigned',
  'rescheduled',
  'not_delivered',
])

/** Paquete que el cliente puede retirar en depósito (aún no entregado). */
export function canRegisterWarehousePickup(pkg: Package): boolean {
  return WAREHOUSE_PICKUP_STATUSES.has(pkg.status)
}

/** Paquete en reparto activo — el retiro en depósito no aplica. */
export function isOnActiveDeliveryRoute(
  pkg: Package,
  deliveries: Delivery[],
): boolean {
  if (!pkg.deliveryId || pkg.status !== 'in_route') return false
  const delivery = getPackageDelivery(pkg, deliveries)
  return Boolean(delivery && ACTIVE_DELIVERY_STATUSES.includes(delivery.status))
}

export type PackageDeskDeliveryMethod =
  | 'delivery_route'
  | 'warehouse_pickup'
  | 'counter'
  | 'other'

export interface PackageDeskDeliveryOption {
  value: PackageDeskDeliveryMethod
  label: string
  description: string
}

export const PACKAGE_DESK_DELIVERY_OPTIONS: PackageDeskDeliveryOption[] = [
  {
    value: 'delivery_route',
    label: 'Reparto',
    description: 'El chofer entregó el paquete en domicilio o en ruta.',
  },
  {
    value: 'warehouse_pickup',
    label: 'Retiro en depósito',
    description: 'El cliente vino a buscar el paquete al depósito.',
  },
  {
    value: 'counter',
    label: 'Entrega en mostrador',
    description: 'Se entregó en el local, sin salir a reparto.',
  },
  {
    value: 'other',
    label: 'Otra forma',
    description: 'Entrega registrada manualmente. Describí cómo se entregó el paquete.',
  },
]

export function canRegisterDeliveryRouteDelivery(
  pkg: Package,
  deliveries: Delivery[],
): boolean {
  if (!pkg.deliveryId) return false
  const delivery = getPackageDelivery(pkg, deliveries)
  if (!delivery) return false
  return delivery.stops.some((stop) => stop.packageId === pkg.id)
}

/** Opciones de cobro al registrar entrega por reparto. */
export function deliveryRoutePaymentOptions(
  pkg: Pick<Package, 'deliveryId'>,
  deliveries: Delivery[],
  deliveryIdOverride?: string,
): CollectionDeskPaymentOption[] {
  const delivery = deliveryIdOverride
    ? getDeliveryById(deliveries, deliveryIdOverride)
    : getPackageDelivery(pkg, deliveries)
  if (!delivery) return []
  return driverDeliveryPaymentOptions(delivery.channel).map((item) => ({
    value: item.value,
    label: item.label,
    description: item.description,
  }))
}

export function deskDeliveryMethodLabel(method: PackageDeskDeliveryMethod): string {
  return PACKAGE_DESK_DELIVERY_OPTIONS.find((item) => item.value === method)?.label ?? method
}
