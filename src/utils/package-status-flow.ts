import type { PackageStatus } from '@/types'

export type PackageStatusFlowKind =
  | 'simple'
  | 'delivery_assign'
  | 'delivery_deliver'
  | 'route_failure'
  | 'route_reschedule'

export function packageStatusFlowKind(status: PackageStatus): PackageStatusFlowKind {
  switch (status) {
    case 'assigned':
    case 'in_route':
      return 'delivery_assign'
    case 'delivered':
      return 'delivery_deliver'
    case 'not_delivered':
      return 'route_failure'
    case 'rescheduled':
      return 'route_reschedule'
    default:
      return 'simple'
  }
}

export function packageStatusModalTitle(status: PackageStatus): string {
  switch (packageStatusFlowKind(status)) {
    case 'delivery_deliver':
      return 'Registrar entrega'
    case 'delivery_assign':
      return 'Asignar reparto'
    case 'route_failure':
      return 'Registrar no entrega'
    case 'route_reschedule':
      return 'Reprogramar entrega'
    default:
      return 'Cambiar estado'
  }
}

export function packageStatusModalConfirmLabel(status: PackageStatus): string {
  switch (packageStatusFlowKind(status)) {
    case 'delivery_deliver':
      return 'Confirmar entrega'
    case 'delivery_assign':
      return 'Asignar y actualizar'
    case 'route_failure':
      return 'Confirmar no entrega'
    case 'route_reschedule':
      return 'Confirmar reprogramación'
    default:
      return 'Actualizar'
  }
}

export function packageStatusModalSize(status: PackageStatus): 'md' | 'lg' {
  return packageStatusFlowKind(status) === 'simple' ? 'md' : 'lg'
}

export function packageStatusSimpleHint(status: PackageStatus): string | undefined {
  switch (status) {
    case 'pending':
      return 'El paquete vuelve a pendiente. Si estaba en un reparto, se quita automáticamente.'
    case 'cancelled':
      return 'El paquete queda cancelado y se quita del reparto si correspondía.'
    default:
      return 'Podés corregir el estado si te equivocaste.'
  }
}

export function packageCanBeAssignedToDelivery(status: PackageStatus): boolean {
  return status !== 'delivered' && status !== 'cancelled'
}
