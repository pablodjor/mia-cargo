import { Badge } from '@/components/ui/Badge'
import { DELIVERY_ZONE_LABELS } from '@/constants/labels'
import type { DeliveryZone } from '@/types'

const zoneTones: Record<DeliveryZone, 'primary' | 'info' | 'purple' | 'neutral'> = {
  caba: 'primary',
  gba: 'info',
  caba_gba: 'neutral',
  interior: 'purple',
}

export function DeliveryZoneBadge({ zone }: { zone: DeliveryZone }) {
  return <Badge tone={zoneTones[zone]}>{DELIVERY_ZONE_LABELS[zone]}</Badge>
}
