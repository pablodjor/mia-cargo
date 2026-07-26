import type {
  DeliveryZone,
  DestinationType,
  DeliveryChannel,
  DeliveryStatus,
  HistoryEntity,
  PackageStatus,
  PaymentStatus,
  UserRole,
} from '@/types'

export const PACKAGE_STATUS_LABELS: Record<PackageStatus, string> = {
  pending: 'Pendiente',
  assigned: 'Asignado',
  in_route: 'En reparto',
  delivered: 'Entregado',
  not_delivered: 'No entregado',
  rescheduled: 'Reprogramado',
  cancelled: 'Cancelado',
}

export const DESTINATION_LABELS: Record<DestinationType, string> = {
  caba: 'CABA',
  gba: 'GBA',
  interior: 'Interior',
}

export const DELIVERY_ZONE_LABELS: Record<DeliveryZone, string> = {
  caba: 'CABA',
  gba: 'GBA',
  caba_gba: 'CABA + GBA',
  interior: 'Interior',
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  paid: 'Pagado',
  cash: 'Cobrar en efectivo (ARS)',
  usd_cash: 'Cobrar en dólares billete',
  pending: 'Sin definir',
  transfer: 'Transferencia pendiente',
}

/** Etiquetas cortas para badges en tablas y chips. */
export const PAYMENT_STATUS_BADGE_LABELS: Record<PaymentStatus, string> = {
  paid: 'Pagado',
  cash: 'Efectivo ARS',
  usd_cash: 'USD billete',
  pending: 'Sin definir',
  transfer: 'Transferencia',
}

export const PAYMENT_STATUS_DESCRIPTIONS: Record<PaymentStatus, string> = {
  paid: 'El importe ya está cobrado o acreditado. No hay nada que cobrar al entregar.',
  cash: 'El cliente paga en pesos en mano al recibir el paquete. El chofer debe cobrar al entregar.',
  usd_cash: 'El cliente paga en dólares billete al recibir el paquete. El chofer debe cobrar el equivalente en USD.',
  pending: 'Todavía no se definió cómo va a pagar el cliente. Revisar antes de salir a repartir.',
  transfer: 'El cliente debe transferir el importe. Todavía no está acreditado en cuenta.',
}

export const ALL_PAYMENT_STATUSES: PaymentStatus[] = [
  'paid',
  'cash',
  'usd_cash',
  'transfer',
  'pending',
]

export const DELIVERY_CHANNEL_LABELS: Record<DeliveryChannel, string> = {
  last_mile: 'Última milla',
  courier: 'Entrega a correo',
}

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  draft: 'Borrador',
  prepared: 'Preparado',
  in_progress: 'En curso',
  completed: 'Finalizado',
  cancelled: 'Cancelado',
}

export const USER_ROLES: UserRole[] = ['admin', 'operator', 'reader', 'driver']

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  operator: 'Operador',
  reader: 'Lector',
  driver: 'Chofer',
}

export const ACTIVE_DELIVERY_STATUSES: DeliveryStatus[] = ['draft', 'prepared', 'in_progress']

export const INCIDENT_PACKAGE_STATUSES: PackageStatus[] = [
  'not_delivered',
  'rescheduled',
]

export const HISTORY_ENTITY_LABELS: Record<HistoryEntity, string> = {
  package: 'Paquete',
  delivery: 'Reparto',
  driver: 'Chofer',
  vehicle: 'Vehículo',
  courier: 'Correo',
  person: 'Cliente',
  user: 'Usuario',
  system: 'Sistema',
}

const HISTORY_ENTITY_OPTIONS = (Object.entries(HISTORY_ENTITY_LABELS) as [HistoryEntity, string][]).map(
  ([value, label]) => ({ value, label }),
)

export { HISTORY_ENTITY_OPTIONS }

/** Traduce un estado guardado en el historial (paquete, reparto, activo/inactivo, etc.). */
export function translateHistoryStatus(status: string | undefined): string | null {
  if (!status) return null
  if (status in PACKAGE_STATUS_LABELS) {
    return PACKAGE_STATUS_LABELS[status as PackageStatus]
  }
  if (status in DELIVERY_STATUS_LABELS) {
    return DELIVERY_STATUS_LABELS[status as DeliveryStatus]
  }
  if (status === 'active') return 'Activo'
  if (status === 'inactive') return 'Inactivo'
  return status
}
