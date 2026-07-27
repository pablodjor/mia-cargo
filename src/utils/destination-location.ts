import type { DestinationType } from '@/types'

export interface DestinationLocationFields {
  city: string
  province: string
  destinationType: DestinationType
}

/** Valores sugeridos al elegir zona CABA o GBA. */
export function getDestinationLocationDefaults(
  destinationType: DestinationType,
  previousType?: DestinationType,
): Partial<Pick<DestinationLocationFields, 'city' | 'province'>> {
  switch (destinationType) {
    case 'caba':
      return { city: 'Buenos Aires', province: 'CABA' }
    case 'gba':
      return {
        province: 'Buenos Aires',
        ...(previousType === 'caba' ? { city: '' } : {}),
      }
    default:
      return {}
  }
}

/** Asegura ciudad/provincia coherentes con la zona al guardar o abrir Maps. */
export function normalizeDestinationLocation<T extends DestinationLocationFields>(input: T): T {
  switch (input.destinationType) {
    case 'caba':
      return {
        ...input,
        city: 'Buenos Aires',
        province: 'CABA',
      }
    case 'gba':
      return {
        ...input,
        province: input.province.trim() || 'Buenos Aires',
      }
    default:
      return {
        ...input,
        city: input.city.trim(),
        province: input.province.trim(),
      }
  }
}

export function isCabaProvince(province: string): boolean {
  const key = province.trim().toLowerCase()
  return (
    key === 'caba' ||
    key === 'capital federal' ||
    key === 'c.a.b.a.' ||
    key.includes('autónoma') ||
    key.includes('autonoma')
  )
}
