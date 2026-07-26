import type { Package } from '@/types'
import { DEFAULT_ROUTE_HUB } from '@/utils/maps'

/** Hub aproximado del Mercado Central (Tapiales). */
export const DEFAULT_ROUTE_HUB_COORDS = { lat: -34.839, lng: -58.537 }

type Coords = { lat: number; lng: number }

type RoutablePackage = Pick<
  Package,
  'id' | 'postalCode' | 'city' | 'province' | 'destinationType' | 'address'
>

function haversineKm(a: Coords, b: Coords): number {
  const toRad = (value: number) => (value * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

/** Coordenadas aproximadas para ordenar paradas sin API de geocoding. */
export function estimatePackageCoords(pkg: RoutablePackage): Coords {
  const cp = Number(pkg.postalCode.replace(/\D/g, '')) || 1400

  if (pkg.destinationType === 'caba' || pkg.province === 'CABA') {
    return {
      lat: -34.55 - ((cp % 100) / 100) * 0.12,
      lng: -58.52 + ((Math.floor(cp / 100) % 10) / 10) * 0.18,
    }
  }

  if (pkg.destinationType === 'gba') {
    return {
      lat: -34.58 - ((cp % 1000) / 1000) * 0.25,
      lng: -58.55 - ((cp % 500) / 500) * 0.2,
    }
  }

  return {
    lat: -34.6 - ((cp % 2000) / 2000) * 0.8,
    lng: -58.7 - ((cp % 1500) / 1500) * 0.6,
  }
}

/** Orden sugerido: vecino más cercano desde el hub de salida. */
export function optimizePackageOrder<T extends RoutablePackage & { id: string }>(
  packages: T[],
  origin: Coords = DEFAULT_ROUTE_HUB_COORDS,
): T[] {
  if (packages.length <= 1) return [...packages]

  const remaining = [...packages]
  const ordered: T[] = []
  let current = origin

  while (remaining.length > 0) {
    let bestIndex = 0
    let bestDistance = Number.POSITIVE_INFINITY

    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index]
      if (!candidate) continue
      const distance = haversineKm(current, estimatePackageCoords(candidate))
      if (distance < bestDistance) {
        bestDistance = distance
        bestIndex = index
      }
    }

    const next = remaining.splice(bestIndex, 1)[0]
    if (!next) break
    ordered.push(next)
    current = estimatePackageCoords(next)
  }

  return ordered
}

export function estimateRouteDistanceKm(packages: RoutablePackage[]): number {
  if (packages.length === 0) return 0

  let total = 0
  let current = DEFAULT_ROUTE_HUB_COORDS

  for (const pkg of packages) {
    const next = estimatePackageCoords(pkg)
    total += haversineKm(current, next)
    current = next
  }

  total += haversineKm(current, DEFAULT_ROUTE_HUB_COORDS)
  return Math.round(total * 10) / 10
}

export function routeSummary(packages: RoutablePackage[]): string {
  if (packages.length === 0) {
    return `Salida y regreso desde ${DEFAULT_ROUTE_HUB}`
  }
  return `${DEFAULT_ROUTE_HUB} → ${packages.length} parada${packages.length === 1 ? '' : 's'} → ${DEFAULT_ROUTE_HUB}`
}

/** Minutos de manejo por parada + tiempos de viaje urbanos estimados. */
const HUB_BUFFER_MINUTES = 25
const MINUTES_PER_STOP = 8
const MINUTES_PER_KM = 2.8

export function estimateRouteDurationMinutes(packages: RoutablePackage[]): {
  minutes: number
  km: number
} {
  if (packages.length === 0) {
    return { minutes: HUB_BUFFER_MINUTES, km: 0 }
  }

  let km = 0
  let minutes = HUB_BUFFER_MINUTES
  let current = DEFAULT_ROUTE_HUB_COORDS

  for (const pkg of packages) {
    const next = estimatePackageCoords(pkg)
    const leg = haversineKm(current, next)
    km += leg
    minutes += leg * MINUTES_PER_KM + MINUTES_PER_STOP
    current = next
  }

  const back = haversineKm(current, DEFAULT_ROUTE_HUB_COORDS)
  km += back
  minutes += back * MINUTES_PER_KM

  return { minutes: Math.round(minutes), km: Math.round(km * 10) / 10 }
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins} min`
  if (mins === 0) return `${hours} h`
  return `${hours} h ${mins} min`
}
