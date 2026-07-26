import { Badge } from '@/components/ui/Badge'
import { DESTINATION_LABELS } from '@/constants/labels'
import type { DestinationType } from '@/types'

const zoneTones: Record<DestinationType, 'primary' | 'info' | 'purple'> = {
  caba: 'primary',
  gba: 'info',
  interior: 'purple',
}

export function DestinationBadge({ destination }: { destination: DestinationType }) {
  return <Badge tone={zoneTones[destination]}>{DESTINATION_LABELS[destination]}</Badge>
}
