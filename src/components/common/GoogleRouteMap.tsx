import { AlertTriangle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Courier, Package } from '@/types'
import { formatPackageMapsAddress } from '@/utils/delivery-address'
import { DEFAULT_ROUTE_HUB, formatMapsAddress } from '@/utils/maps'
import { getGoogleMapsApiKey, loadGoogleMaps } from '@/utils/google-maps-loader'
import { cn } from '@/utils/cn'

interface GoogleRouteMapProps {
  packages: Package[]
  courier?: Courier
  className?: string
}

export function GoogleRouteMap({ packages, courier, className }: GoogleRouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const rendererRef = useRef<google.maps.DirectionsRenderer | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const apiKey = getGoogleMapsApiKey()
    const container = containerRef.current

    if (!apiKey || !container) {
      setLoading(false)
      return
    }

    if (!courier && packages.length === 0) {
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    loadGoogleMaps(apiKey)
      .then(() => {
        if (cancelled || !containerRef.current) return

        if (!mapRef.current) {
          mapRef.current = new google.maps.Map(containerRef.current, {
            center: { lat: -34.839, lng: -58.537 },
            zoom: 11,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
          })
        }

        if (!rendererRef.current) {
          rendererRef.current = new google.maps.DirectionsRenderer({
            map: mapRef.current,
            suppressMarkers: false,
            polylineOptions: {
              strokeColor: '#2563eb',
              strokeWeight: 5,
            },
          })
        } else {
          rendererRef.current.setMap(mapRef.current)
        }

        const service = new google.maps.DirectionsService()
        const destination = courier
          ? formatMapsAddress(courier)
          : DEFAULT_ROUTE_HUB

        const request: google.maps.DirectionsRequest = {
          origin: DEFAULT_ROUTE_HUB,
          destination,
          travelMode: google.maps.TravelMode.DRIVING,
          optimizeWaypoints: false,
        }

        if (!courier && packages.length > 0) {
          request.waypoints = packages.map((item) => ({
            location: formatPackageMapsAddress(item),
            stopover: true,
          }))
        }

        service.route(request, (result, status) => {
          if (cancelled) return
          setLoading(false)

          if (status === google.maps.DirectionsStatus.OK && result) {
            rendererRef.current?.setDirections(result)
            setError(null)
            return
          }

          rendererRef.current?.setDirections(null)
          setError(
            status === google.maps.DirectionsStatus.ZERO_RESULTS
              ? 'Google Maps no encontró una ruta para esas direcciones.'
              : 'No se pudo calcular la ruta. Verificá la API key y que Directions API esté habilitada.',
          )
        })
      })
      .catch(() => {
        if (cancelled) return
        setLoading(false)
        setError('No se pudo cargar Google Maps. Revisá tu conexión y la API key.')
      })

    return () => {
      cancelled = true
    }
  }, [packages, courier])

  return (
    <div className={cn('relative', className)}>
      <div ref={containerRef} className="h-72 w-full" />

      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 text-sm text-text-secondary">
          Cargando ruta en Google Maps…
        </div>
      ) : null}

      {error ? (
        <div className="absolute inset-x-3 bottom-3 flex items-start gap-2 rounded-[10px] border border-warning/30 bg-warning-light px-3 py-2 text-xs text-text-primary">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <span>{error}</span>
        </div>
      ) : null}
    </div>
  )
}
