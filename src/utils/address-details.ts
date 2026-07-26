import type { AddressPlaceType } from '@/types'

export const ADDRESS_PLACE_TYPE_LABELS: Record<AddressPlaceType, string> = {
  home: 'Casa',
  work: 'Trabajo',
  other: 'Otro',
}

export const ADDRESS_PLACE_TYPE_OPTIONS = Object.entries(ADDRESS_PLACE_TYPE_LABELS).map(
  ([value, label]) => ({ value, label }),
)

export interface AddressExtrasValues {
  unit?: string
  bell?: string
  placeType?: AddressPlaceType | ''
}

export function formatAddressExtrasSummary(details: AddressExtrasValues): string {
  const parts: string[] = []
  if (details.placeType && details.placeType in ADDRESS_PLACE_TYPE_LABELS) {
    parts.push(ADDRESS_PLACE_TYPE_LABELS[details.placeType as AddressPlaceType])
  }
  if (details.unit?.trim()) parts.push(`Depto/Piso ${details.unit.trim()}`)
  if (details.bell?.trim()) parts.push(`Timbre ${details.bell.trim()}`)
  return parts.join(' · ')
}

export function streetAddressWithUnit(address: string, unit?: string): string {
  const trimmedUnit = unit?.trim()
  if (!trimmedUnit) return address
  return `${address}, ${trimmedUnit}`
}

export function formatAddressLine(parts: {
  address: string
  city: string
  province: string
  postalCode?: string
  unit?: string
  bell?: string
  placeType?: AddressPlaceType | ''
}): string {
  const segments = [
    streetAddressWithUnit(parts.address, parts.unit),
    parts.city,
    parts.province,
    parts.postalCode,
    'Argentina',
  ].filter(Boolean)

  const base = segments.join(', ')
  const extras = formatAddressExtrasSummary({
    bell: parts.bell,
    placeType: parts.placeType,
  })

  if (!extras) return base
  if (parts.bell?.trim() || parts.placeType) {
    return `${base} (${extras})`
  }
  return base
}
