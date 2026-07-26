import {
  ACTIVE_DELIVERY_STATUSES,
  DELIVERY_CHANNEL_LABELS,
  DELIVERY_STATUS_LABELS,
} from '@/constants/labels'
import { packagesService } from '@/services/packages.service'
import type { Delivery, DeliveryChannel, DeliveryStatus, Driver, Package, PackageStatus } from '@/types'
import { formatDeliveryDateDisplay } from '@/utils/date'
import { packageCanBeAssignedToDelivery } from '@/utils/package-status-flow'

const DELIVERY_STATUSES_FOR_PACKAGE_STATUS: Record<'assigned' | 'in_route', DeliveryStatus[]> = {
  assigned: ['draft', 'prepared'],
  in_route: ['in_progress'],
}

export interface DeliveryAssignmentOption {
  deliveryId: string
  label: string
  hint: string
  channel: DeliveryChannel
  alreadyAssigned: boolean
}

export function deliveryAssignmentOptionsForPackage(
  pkg: Package,
  deliveries: Delivery[],
  drivers: Driver[],
): DeliveryAssignmentOption[] {
  const options: DeliveryAssignmentOption[] = []

  for (const delivery of deliveries) {
    if (!ACTIVE_DELIVERY_STATUSES.includes(delivery.status)) continue

    const alreadyAssigned = delivery.stops.some((stop) => stop.packageId === pkg.id)
    if (alreadyAssigned) {
      if (pkg.status === 'delivered' || pkg.status === 'cancelled') continue
    } else {
      const check = packagesService.canAddToDelivery(pkg.id, delivery.id)
      if (!check.ok) continue
    }

    const driver = drivers.find((item) => item.id === delivery.driverId)
    const hintParts = [
      driver?.name,
      DELIVERY_CHANNEL_LABELS[delivery.channel],
      DELIVERY_STATUS_LABELS[delivery.status],
      alreadyAssigned ? 'Ya en este reparto' : undefined,
    ].filter(Boolean)

    options.push({
      deliveryId: delivery.id,
      label: `${delivery.code} · ${formatDeliveryDateDisplay(delivery.date)}`,
      hint: hintParts.join(' · '),
      channel: delivery.channel,
      alreadyAssigned,
    })
  }

  return options.sort((a, b) => a.label.localeCompare(b.label))
}

export function deliveryAssignmentOptionsForPackageStatus(
  pkg: Package,
  deliveries: Delivery[],
  drivers: Driver[],
  targetStatus: 'assigned' | 'in_route',
): DeliveryAssignmentOption[] {
  const allowedDeliveryStatuses = DELIVERY_STATUSES_FOR_PACKAGE_STATUS[targetStatus]
  return deliveryAssignmentOptionsForPackage(pkg, deliveries, drivers).filter((option) => {
    const delivery = deliveries.find((item) => item.id === option.deliveryId)
    return delivery ? allowedDeliveryStatuses.includes(delivery.status) : false
  })
}

/** Repartos en curso donde el paquete está (para no entrega / reprogramación). */
export function deliveryRouteOutcomeOptionsForPackage(
  pkg: Package,
  deliveries: Delivery[],
  drivers: Driver[],
): DeliveryAssignmentOption[] {
  return deliveryAssignmentOptionsForPackage(pkg, deliveries, drivers).filter((option) => {
    const delivery = deliveries.find((item) => item.id === option.deliveryId)
    if (!delivery || delivery.status !== 'in_progress') return false
    return option.alreadyAssigned || pkg.deliveryId === option.deliveryId
  })
}

export function deliveryOptionsForPackageStatus(
  pkg: Package,
  deliveries: Delivery[],
  drivers: Driver[],
  targetStatus: PackageStatus,
  deliveryMethod?: 'delivery_route',
): DeliveryAssignmentOption[] {
  if (targetStatus === 'delivered' && deliveryMethod === 'delivery_route') {
    return deliveryAssignmentOptionsForPackage(pkg, deliveries, drivers)
  }
  if (targetStatus === 'assigned' || targetStatus === 'in_route') {
    if (!packageCanBeAssignedToDelivery(pkg.status)) return []
    return deliveryAssignmentOptionsForPackageStatus(pkg, deliveries, drivers, targetStatus)
  }
  if (targetStatus === 'not_delivered' || targetStatus === 'rescheduled') {
    return deliveryRouteOutcomeOptionsForPackage(pkg, deliveries, drivers)
  }
  return []
}

export function pickDefaultDeliveryId(
  pkg: Package,
  options: DeliveryAssignmentOption[],
): string {
  if (pkg.deliveryId && options.some((item) => item.deliveryId === pkg.deliveryId)) {
    return pkg.deliveryId
  }
  return options[0]?.deliveryId ?? ''
}
