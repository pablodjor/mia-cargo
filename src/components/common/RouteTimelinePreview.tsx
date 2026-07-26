import { ArrowDown, Home, MapPin } from 'lucide-react'
import type { Courier, Package } from '@/types'
import { DEFAULT_ROUTE_HUB, formatFullAddress } from '@/utils/maps'
import { cn } from '@/utils/cn'

interface RouteTimelinePreviewProps {
  packages: Package[]
  courier?: Courier
  className?: string
}

export function RouteTimelinePreview({ packages, courier, className }: RouteTimelinePreviewProps) {
  const hasStops = Boolean(courier) || packages.length > 0

  if (!hasStops) return null

  return (
    <div className={cn('rounded-[10px] border border-border bg-surface p-3', className)}>
      <p className="mb-3 text-xs font-semibold tracking-wide text-text-muted uppercase">
        Recorrido propuesto
      </p>

      <ol className="space-y-0">
        <li className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Home className="h-3.5 w-3.5" />
            </span>
            {!courier || packages.length > 0 ? (
              <span className="my-1 h-full min-h-6 w-px bg-border" />
            ) : null}
          </div>
          <div className="pb-3">
            <p className="text-sm font-semibold text-text-primary">Salida</p>
            <p className="text-xs text-text-secondary">{DEFAULT_ROUTE_HUB}</p>
          </div>
        </li>

        {courier ? (
          <li className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                C
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">{courier.name}</p>
              <p className="text-xs text-text-secondary">{formatFullAddress(courier)}</p>
              <p className="mt-1 text-xs text-text-muted">
                {packages.length} SH para depositar en sucursal
              </p>
            </div>
          </li>
        ) : (
          packages.map((item, index) => (
            <li key={item.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  {index + 1}
                </span>
                {index < packages.length - 1 ? (
                  <span className="my-1 flex min-h-6 flex-col items-center text-border">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </span>
                ) : (
                  <span className="my-1 h-full min-h-6 w-px bg-border" />
                )}
              </div>
              <div className={index < packages.length - 1 ? 'pb-3' : 'pb-1'}>
                <p className="font-mono text-sm font-semibold text-text-primary">{item.shCode}</p>
                <p className="text-sm font-medium">{item.ownerName}</p>
                <p className="text-xs text-text-secondary">{formatFullAddress(item)}</p>
              </div>
            </li>
          ))
        )}

        {!courier && packages.length > 0 ? (
          <li className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <MapPin className="h-3.5 w-3.5" />
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">Regreso</p>
              <p className="text-xs text-text-secondary">{DEFAULT_ROUTE_HUB}</p>
            </div>
          </li>
        ) : null}
      </ol>
    </div>
  )
}
