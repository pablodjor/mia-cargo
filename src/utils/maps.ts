/** Origen y destino por defecto de las rutas de reparto (ida y vuelta). */
export const DEFAULT_ROUTE_HUB =
  'Mercado Central de Buenos Aires, Autopista Riccheri Km 37.5, Tapiales, Buenos Aires, Argentina'

/** @deprecated Usar DEFAULT_ROUTE_HUB */
export const DEFAULT_ROUTE_ORIGIN = DEFAULT_ROUTE_HUB

/** Quita piso/depto para que Google Maps geocodifique la calle. */
export function sanitizeAddressForMaps(address: string): string {
  return address
    .replace(/,?\s*(Piso|Depto|Dpto)\s+[A-Za-z0-9]+/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function formatFullAddress(parts: {
  address: string
  city: string
  province: string
  postalCode?: string
}): string {
  const segments = [parts.address, parts.city, parts.province]
  if (parts.postalCode) segments.push(parts.postalCode)
  segments.push('Argentina')
  return segments.filter(Boolean).join(', ')
}

/** Dirección limpia para Maps (sin piso/depto). */
export function formatMapsAddress(parts: {
  address: string
  city: string
  province: string
  postalCode?: string
}): string {
  return formatFullAddress({
    ...parts,
    address: sanitizeAddressForMaps(parts.address),
  })
}

/** Abre una sola dirección como destino (sin origen fijo). */
export function buildGoogleMapsUrl(address: string): string {
  const destination = sanitizeAddressForMaps(address)
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`
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
  const cleaned = addresses
    .map((item) => sanitizeAddressForMaps(item))
    .filter((item) => item.length > 0)
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

  return `https://www.google.com/maps/dir/?${params.toString()}`
}
