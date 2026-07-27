import type { DestinationType } from '@/types'

/** Origen y destino por defecto de las rutas de reparto (ida y vuelta). */
export const DEFAULT_ROUTE_HUB =
  'Mercado Central de Buenos Aires, Autopista Riccheri Km 37.5, Tapiales, Buenos Aires, Argentina'

/** @deprecated Usar DEFAULT_ROUTE_HUB */
export const DEFAULT_ROUTE_ORIGIN = DEFAULT_ROUTE_HUB

export interface MapsAddressInput {
  address: string
  city: string
  province: string
  postalCode?: string
  destinationType?: DestinationType
}

const PROVINCE_GEO_LABELS: Record<string, string> = {
  caba: 'Ciudad Autónoma de Buenos Aires',
  'capital federal': 'Ciudad Autónoma de Buenos Aires',
  'c.a.b.a.': 'Ciudad Autónoma de Buenos Aires',
  'ciudad autónoma de buenos aires': 'Ciudad Autónoma de Buenos Aires',
  'ciudad autonoma de buenos aires': 'Ciudad Autónoma de Buenos Aires',
}

/** Calles frecuentes en CABA cuyo nombre coincide con provincias argentinas. */
const PROVINCE_LIKE_STREET =
  /^(tucum[aá]n|salta|mendoza|san\s+juan|catamarca|jujuy|santa\s+fe|corrientes|chaco|formosa|misiones|neuqu[eé]n|r[ií]o\s+negro|chubut|santa\s+cruz|tierra\s+del\s+fuego|entre\s+r[ií]os|la\s+pampa|santiago\s+del\s+estero|la\s+rioja)\b/i

const STREET_PREFIX =
  /^(av\.?|avenida|avda\.?|calle|cal\.?|pasaje|psje\.?|boulevard|blvd\.?|diag\.?|diagonal)\b/i

/** Quita piso/depto para que Google Maps geocodifique la calle. */
export function sanitizeAddressForMaps(address: string): string {
  return address
    .replace(/,?\s*(Piso|Depto|Dpto)\s+[A-Za-z0-9]+/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function normalizeCityForMaps(city: string, destinationType?: DestinationType): string {
  const trimmed = city.trim()
  if (trimmed) return trimmed
  if (destinationType === 'caba') return 'Buenos Aires'
  return trimmed
}

function normalizeProvinceForMaps(
  province: string,
  destinationType?: DestinationType,
): string {
  const key = province.trim().toLowerCase()
  if (key in PROVINCE_GEO_LABELS) return PROVINCE_GEO_LABELS[key]!
  if (destinationType === 'caba') return 'Ciudad Autónoma de Buenos Aires'
  return province.trim()
}

function normalizeStreetForMaps(address: string, destinationType?: DestinationType): string {
  const street = sanitizeAddressForMaps(address)
  if (!street) return street

  const disambiguate =
    destinationType === 'caba' ||
    destinationType === 'gba' ||
    destinationType === undefined

  if (disambiguate && PROVINCE_LIKE_STREET.test(street) && !STREET_PREFIX.test(street)) {
    return `Av. ${street}`
  }

  return street
}

export function isMapsAddressComplete(parts: MapsAddressInput): boolean {
  const hasStreet = Boolean(parts.address?.trim())
  const hasCity = Boolean(parts.city?.trim()) || parts.destinationType === 'caba'
  const hasProvince =
    Boolean(parts.province?.trim()) ||
    parts.destinationType === 'caba' ||
    parts.destinationType === 'gba'
  return hasStreet && hasCity && hasProvince
}

export function formatFullAddress(parts: {
  address: string
  city: string
  province: string
  postalCode?: string
}): string {
  const segments = [parts.address, parts.city, parts.province]
  if (parts.postalCode?.trim()) segments.push(parts.postalCode.trim())
  segments.push('Argentina')
  return segments.filter(Boolean).join(', ')
}

/** Dirección optimizada para geocodificar en Google Maps (sin piso/depto, con contexto AR). */
export function formatMapsAddress(parts: MapsAddressInput): string {
  const destinationType = parts.destinationType
  const city = normalizeCityForMaps(parts.city, destinationType)
  const province = normalizeProvinceForMaps(parts.province, destinationType)
  const address = normalizeStreetForMaps(parts.address, destinationType)

  return formatFullAddress({
    address,
    city,
    province,
    postalCode: parts.postalCode,
  })
}

function withRegionBias(url: string): string {
  if (url.includes('region=')) return url
  return `${url}&region=AR`
}

/** Abre una sola dirección como destino (sin origen fijo). */
export function buildGoogleMapsUrl(address: string): string {
  const destination = address.trim()
  if (!destination) {
    return withRegionBias(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(DEFAULT_ROUTE_HUB)}&travelmode=driving`,
    )
  }
  return withRegionBias(
    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`,
  )
}

/**
 * Ruta multi-parada: sale del Mercado Central, visita las paradas y vuelve al Mercado Central.
 *
 * Nota: en Maps URLs (abrir en el navegador) NO se puede usar `optimize:true`
 * en waypoints; Google lo interpreta como una parada literal.
 */
export function buildGoogleMapsRouteUrl(
  addresses: string[],
  options?: { hub?: string },
): string {
  const cleaned = addresses.map((item) => item.trim()).filter((item) => item.length > 0)
  const hub = (options?.hub ?? DEFAULT_ROUTE_HUB).trim()

  if (cleaned.length === 0) {
    return buildGoogleMapsUrl(hub)
  }

  const params = new URLSearchParams({
    api: '1',
    travelmode: 'driving',
    origin: hub,
    destination: hub,
    waypoints: cleaned.join('|'),
  })

  return withRegionBias(`https://www.google.com/maps/dir/?${params.toString()}`)
}
