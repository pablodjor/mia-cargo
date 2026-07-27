import { ExternalLink, MapPin } from 'lucide-react'
import type { Courier, Package } from '@/types'
import { Button } from '@/components/ui/Button'
import { OsmRouteMap } from '@/components/common/OsmRouteMap'
import { RouteTimelinePreview } from '@/components/common/RouteTimelinePreview'
import { formatPackageMapsAddress } from '@/utils/delivery-address'
import {
  buildGoogleMapsRouteUrl,
  buildGoogleMapsUrl,
  formatMapsAddress,
} from '@/utils/maps'
import { cn } from '@/utils/cn'

interface RouteMapPreviewProps {
  packages: Package[]
  courier?: Courier
  className?: string
}

export function RouteMapPreview({ packages, courier, className }: RouteMapPreviewProps) {
  const hasRoute = Boolean(courier) || packages.length > 0

  const openExternal = () => {
    if (courier) {
      window.open(buildGoogleMapsUrl(formatMapsAddress(courier)), '_blank', 'noopener,noreferrer')
      return
    }
    if (packages.length === 0) return
    window.open(
      buildGoogleMapsRouteUrl(packages.map((item) => formatPackageMapsAddress(item))),
      '_blank',
      'noopener,noreferrer',
    )
  }

  return (
    <div className={cn('overflow-hidden rounded-[12px] border border-border bg-background', className)}>
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <MapPin className="h-4 w-4 text-primary" />
          Vista de la ruta
        </div>
        <Button size="sm" variant="outline" onClick={openExternal} disabled={!hasRoute}>
          <ExternalLink className="h-3.5 w-3.5" />
          Abrir en Google Maps
        </Button>
      </div>

      {!hasRoute ? (
        <div className="flex h-40 items-center justify-center p-6 text-center text-sm text-text-secondary">
          Agregá paquetes o usá el planificador de ruta para ver el recorrido.
        </div>
      ) : (
        <div className="space-y-3 p-3">
          <RouteTimelinePreview packages={packages} courier={courier} />
          <OsmRouteMap packages={packages} courier={courier} />
        </div>
      )}
    </div>
  )
}
