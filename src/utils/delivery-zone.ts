import { DELIVERY_ZONE_LABELS } from '@/constants/labels'
import type { DeliveryZone, DestinationType } from '@/types'

export function packageMatchesDeliveryZone(
  destinationType: DestinationType,
  zone: DeliveryZone,
): boolean {
  if (zone === 'caba_gba') return destinationType === 'caba' || destinationType === 'gba'
  return destinationType === zone
}

export function deliveryZoneLabel(zone: DeliveryZone): string {
  return DELIVERY_ZONE_LABELS[zone]
}

export function deliveryZoneSelectOptions(): { value: DeliveryZone; label: string }[] {
  return (Object.entries(DELIVERY_ZONE_LABELS) as [DeliveryZone, string][]).map(
    ([value, label]) => ({ value, label }),
  )
}

export function inferDeliveryZoneFromPackages(
  packages: Pick<{ destinationType: DestinationType }, 'destinationType'>[],
): DeliveryZone | null {
  const zones = new Set(packages.map((pkg) => pkg.destinationType))
  const hasCaba = zones.has('caba')
  const hasGba = zones.has('gba')
  const hasInterior = zones.has('interior')

  if (hasInterior && (hasCaba || hasGba)) return null
  if (hasInterior) return 'interior'
  if (hasCaba && hasGba) return 'caba_gba'
  if (hasCaba) return 'caba'
  if (hasGba) return 'gba'
  return null
}
