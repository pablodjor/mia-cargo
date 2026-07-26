import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import type { Courier, Package } from '@/types'
import { DEFAULT_ROUTE_HUB, formatFullAddress } from '@/utils/maps'
import {
  buildRouteWaypoints,
  DEFAULT_ROUTE_HUB_COORDS,
  fetchOsrmRoute,
  type RouteCoords,
} from '@/utils/route-coords'
import { cn } from '@/utils/cn'

interface OsmRouteMapProps {
  packages: Package[]
  courier?: Courier
  className?: string
}

function hubIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:9999px;background:#059669;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.25);color:#fff;font-size:14px;font-weight:700;">M</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })
}

function stopIcon(label: string | number) {
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;background:#2563eb;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.25);color:#fff;font-size:12px;font-weight:700;">${label}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

function MapResize() {
  const map = useMap()

  useEffect(() => {
    const timer = window.setTimeout(() => map.invalidateSize(), 150)
    return () => window.clearTimeout(timer)
  }, [map])

  return null
}

function FitRouteBounds({ points }: { points: RouteCoords[] }) {
  const map = useMap()

  useEffect(() => {
    if (points.length === 0) return
    const bounds = L.latLngBounds(points.map((item) => [item.lat, item.lng]))
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 })
  }, [map, points])

  return null
}

export function OsmRouteMap({ packages, courier, className }: OsmRouteMapProps) {
  const waypoints = useMemo(() => buildRouteWaypoints(packages, courier), [packages, courier])
  const stopPoints = useMemo(() => {
    if (courier) return waypoints.slice(1)
    if (packages.length === 0) return []
    return waypoints.slice(1, -1)
  }, [waypoints, packages.length, courier])

  const [routeLine, setRouteLine] = useState<RouteCoords[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (waypoints.length < 2) {
      setRouteLine([])
      return
    }

    let cancelled = false
    setLoading(true)

    fetchOsrmRoute(waypoints)
      .then((geometry) => {
        if (cancelled) return
        setRouteLine(geometry ?? waypoints)
      })
      .catch(() => {
        if (cancelled) return
        setRouteLine(waypoints)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [waypoints])

  const polyline = useMemo<[number, number][]>(
    () => (routeLine.length > 0 ? routeLine : waypoints).map((item) => [item.lat, item.lng]),
    [routeLine, waypoints],
  )

  const boundsPoints = useMemo(
    () => (routeLine.length > 0 ? routeLine : waypoints),
    [routeLine, waypoints],
  )

  const hasRoute = waypoints.length >= 2
  const mapKey = `${courier?.id ?? 'last-mile'}-${packages.map((item) => item.id).join(',')}`

  return (
    <div className={cn('relative', className)}>
      {!hasRoute ? (
        <div className="flex h-80 items-center justify-center bg-surface p-6 text-center text-sm text-text-secondary">
          Agregá paquetes para ver el mapa con la ruta marcada.
        </div>
      ) : (
        <>
          <MapContainer
            key={mapKey}
            center={[DEFAULT_ROUTE_HUB_COORDS.lat, DEFAULT_ROUTE_HUB_COORDS.lng]}
            zoom={11}
            className="h-80 w-full"
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapResize />
            <FitRouteBounds points={boundsPoints} />

            {polyline.length > 1 ? (
              <Polyline positions={polyline} pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.9 }} />
            ) : null}

            <Marker position={[waypoints[0]!.lat, waypoints[0]!.lng]} icon={hubIcon()}>
              <Popup>
                <strong>Salida / regreso</strong>
                <br />
                {DEFAULT_ROUTE_HUB}
              </Popup>
            </Marker>

            {courier ? (
              stopPoints.map((point) => (
                <Marker key="courier-dest" position={[point.lat, point.lng]} icon={stopIcon('C')}>
                  <Popup>
                    <strong>{courier.name}</strong>
                    <br />
                    {formatFullAddress(courier)}
                  </Popup>
                </Marker>
              ))
            ) : (
              stopPoints.map((point, index) => {
                const pkg = packages[index]
                return (
                  <Marker
                    key={pkg?.id ?? `${point.lat}-${point.lng}`}
                    position={[point.lat, point.lng]}
                    icon={stopIcon(index + 1)}
                  >
                    <Popup>
                      <strong>Parada {index + 1}</strong>
                      {pkg ? (
                        <>
                          <br />
                          <span className="font-mono">{pkg.shCode}</span>
                          <br />
                          {pkg.ownerName}
                          <br />
                          <span className="text-xs">{formatFullAddress(pkg)}</span>
                        </>
                      ) : null}
                    </Popup>
                  </Marker>
                )
              })
            )}
          </MapContainer>

          {loading ? (
            <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
              <span className="rounded-full bg-background/95 px-3 py-1 text-xs text-text-secondary shadow-md">
                Trazando ruta en el mapa…
              </span>
            </div>
          ) : null}
        </>
      )}

      <div className="flex flex-wrap items-center gap-4 border-t border-border bg-background px-3 py-2 text-xs text-text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-600" />
          Mercado Central
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary" />
          Paradas
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-6 rounded bg-primary/80" />
          Ruta
        </span>
        <span className="ml-auto">OpenStreetMap · sin API key</span>
      </div>
    </div>
  )
}
