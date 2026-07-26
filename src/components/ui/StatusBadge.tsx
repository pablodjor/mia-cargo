import {
  Ban,
  CheckCircle2,
  Clock3,
  PackageCheck,
  PackageX,
  RefreshCw,
  Route,
} from 'lucide-react'
import type { DeliveryStatus, PackageStatus } from '@/types'
import {
  DELIVERY_STATUS_LABELS,
  PACKAGE_STATUS_LABELS,
} from '@/constants/labels'
import { Badge } from './Badge'

const packageTone: Record<PackageStatus, 'warning' | 'info' | 'primary' | 'success' | 'danger' | 'purple' | 'neutral'> = {
  pending: 'warning',
  assigned: 'info',
  in_route: 'primary',
  delivered: 'success',
  not_delivered: 'danger',
  rescheduled: 'purple',
  cancelled: 'neutral',
}

const packageIcon: Record<PackageStatus, typeof Clock3> = {
  pending: Clock3,
  assigned: PackageCheck,
  in_route: Route,
  delivered: CheckCircle2,
  not_delivered: PackageX,
  rescheduled: RefreshCw,
  cancelled: Ban,
}

const deliveryTone: Record<DeliveryStatus, 'neutral' | 'info' | 'primary' | 'success' | 'danger'> = {
  draft: 'neutral',
  prepared: 'info',
  in_progress: 'primary',
  completed: 'success',
  cancelled: 'danger',
}

const stopLabels = {
  pending: 'Pendiente',
  delivered: 'Entregado',
  not_delivered: 'No entregado',
  skipped: 'Omitido',
} as const

const stopTone = {
  pending: 'warning',
  delivered: 'success',
  not_delivered: 'danger',
  skipped: 'neutral',
} as const

export function StatusBadge({
  status,
  type = 'package',
}: {
  status: PackageStatus | DeliveryStatus | keyof typeof stopLabels
  type?: 'package' | 'delivery' | 'stop'
}) {
  if (type === 'delivery') {
    const deliveryStatus = status as DeliveryStatus
    return <Badge tone={deliveryTone[deliveryStatus]}>{DELIVERY_STATUS_LABELS[deliveryStatus]}</Badge>
  }

  if (type === 'stop') {
    const stopStatus = status as keyof typeof stopLabels
    return <Badge tone={stopTone[stopStatus]}>{stopLabels[stopStatus]}</Badge>
  }

  const packageStatus = status as PackageStatus
  const Icon = packageIcon[packageStatus]
  return (
    <Badge tone={packageTone[packageStatus]}>
      <Icon className="h-3.5 w-3.5" />
      {PACKAGE_STATUS_LABELS[packageStatus]}
    </Badge>
  )
}
