import type { Courier, Package } from '@/types'
import { DEFAULT_ROUTE_HUB_COORDS, estimatePackageCoords } from '@/utils/route-optimizer'

export type RouteCoords = { lat: number; lng: number }

export function estimateCourierCoords(courier: Pick<Courier, 'postalCode' | 'city' | 'province'>): RouteCoords {
  return estimatePackageCoords({
    id: 'courier',
    postalCode: courier.postalCode,
    city: courier.city,
    province: courier.province,
    destinationType: 'gba',
    address: '',
  })
}

/** Hub → paradas → hub (última milla) o hub → correo (courier). */
export function buildRouteWaypoints(packages: Package[], courier?: Courier): RouteCoords[] {
  if (courier) {
    return [DEFAULT_ROUTE_HUB_COORDS, estimateCourierCoords(courier)]
  }

  if (packages.length === 0) {
    return [DEFAULT_ROUTE_HUB_COORDS]
  }

  return [
    DEFAULT_ROUTE_HUB_COORDS,
    ...packages.map((item) => estimatePackageCoords(item)),
    DEFAULT_ROUTE_HUB_COORDS,
  ]
}

export type OsrmGeometry =
  | { type: 'LineString'; coordinates: [number, number][] }
  | { type: 'MultiLineString'; coordinates: [number, number][][] }

export async function fetchOsrmRoute(waypoints: RouteCoords[]): Promise<RouteCoords[] | null> {
  if (waypoints.length < 2) return null

  const path = waypoints.map((item) => `${item.lng},${item.lat}`).join(';')
  const url = `https://router.project-osrm.org/route/v1/driving/${path}?overview=full&geometries=geojson`

  const response = await fetch(url)
  if (!response.ok) return null

  const data = (await response.json()) as {
    code?: string
    routes?: Array<{ geometry?: OsrmGeometry }>
  }

  if (data.code !== 'Ok' || !data.routes?.[0]?.geometry) return null

  const geometry = data.routes[0].geometry
  const line =
    geometry.type === 'LineString'
      ? geometry.coordinates
      : geometry.coordinates.flat()

  return line.map(([lng, lat]) => ({ lat, lng }))
}

export { DEFAULT_ROUTE_HUB_COORDS }
