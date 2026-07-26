import { Bot, MapPin, Route, Sparkles, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { PackagePaymentInfo } from '@/components/common/PackagePaymentInfo'
import { RouteMapPreview } from '@/components/common/RouteMapPreview'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { DELIVERY_ZONE_LABELS, PACKAGE_STATUS_LABELS } from '@/constants/labels'
import type { Courier, DeliveryZone, Package } from '@/types'
import { packageMatchesDeliveryZone } from '@/utils/delivery-zone'
import { buildGoogleMapsRouteUrl, buildGoogleMapsUrl, formatFullAddress, formatMapsAddress } from '@/utils/maps'
import {
  estimateRouteDistanceKm,
  estimateRouteDurationMinutes,
  formatDuration,
  optimizePackageOrder,
  routeSummary,
} from '@/utils/route-optimizer'
import {
  suggestCourierPackages,
  suggestPackagesForTimeBudget,
  type RouteAiSuggestion,
} from '@/utils/route-ai'

interface RoutePlannerModalProps {
  open: boolean
  onClose: () => void
  zone: DeliveryZone
  packages: Package[]
  available: Package[]
  selectedIds: string[]
  courier?: Courier
  onApply: (packageIds: string[]) => void
}

export function RoutePlannerModal({
  open,
  onClose,
  zone,
  packages,
  available,
  selectedIds,
  courier,
  onApply,
}: RoutePlannerModalProps) {
  const isCourier = Boolean(courier)
  const [draftIds, setDraftIds] = useState<string[]>(selectedIds)
  const [search, setSearch] = useState('')
  const [hoursAvailable, setHoursAvailable] = useState('5')
  const [aiSuggestion, setAiSuggestion] = useState<RouteAiSuggestion | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  const packageById = useMemo(
    () => new Map(packages.map((item) => [item.id, item])),
    [packages],
  )

  const draftPackages = useMemo(
    () =>
      draftIds
        .map((id) => packageById.get(id))
        .filter((item): item is Package => Boolean(item)),
    [draftIds, packageById],
  )

  const routeStats = useMemo(
    () => estimateRouteDurationMinutes(draftPackages),
    [draftPackages],
  )

  useEffect(() => {
    if (!open) return
    setSearch('')
    setAiSuggestion(null)
    setHoursAvailable('5')

    if (isCourier) {
      setDraftIds(selectedIds)
      return
    }

    const initial = selectedIds
      .map((id) => packageById.get(id))
      .filter((item): item is Package => Boolean(item))

    if (initial.length >= 2) {
      setDraftIds(optimizePackageOrder(initial).map((item) => item.id))
      return
    }

    setDraftIds(selectedIds)
  }, [open, selectedIds, isCourier, packageById])

  const zoneAvailable = useMemo(() => {
    const selected = new Set(draftIds)
    const query = search.trim().toLowerCase()
    return available
      .filter((item) => (isCourier ? true : packageMatchesDeliveryZone(item.destinationType, zone)) && !selected.has(item.id))
      .filter((item) => {
        if (!query) return true
        return (
          item.shCode.toLowerCase().includes(query) ||
          item.ownerName.toLowerCase().includes(query) ||
          item.city.toLowerCase().includes(query) ||
          formatFullAddress(item).toLowerCase().includes(query)
        )
      })
  }, [available, draftIds, search, zone, isCourier])

  const suggestWithAi = () => {
    setAiLoading(true)
    try {
      const hours = Number(hoursAvailable)
      if (!Number.isFinite(hours) || hours <= 0) return

      const suggestion = isCourier
        ? suggestCourierPackages(available)
        : suggestPackagesForTimeBudget(available, hours, zone)

      setAiSuggestion(suggestion)
      setDraftIds(suggestion.packageIds)
    } finally {
      setAiLoading(false)
    }
  }

  const applyOptimizedOrder = () => {
    if (draftPackages.length < 2) return
    setDraftIds(optimizePackageOrder(draftPackages).map((item) => item.id))
    setAiSuggestion(null)
  }

  const openMaps = () => {
    if (isCourier && courier) {
      window.open(
        buildGoogleMapsUrl(formatMapsAddress(courier)),
        '_blank',
        'noopener,noreferrer',
      )
      return
    }

    if (draftPackages.length === 0) return

    window.open(
      buildGoogleMapsRouteUrl(draftPackages.map((item) => formatMapsAddress(item))),
      '_blank',
      'noopener,noreferrer',
    )
  }

  const addPackage = (packageId: string) => {
    setDraftIds((current) => [...current, packageId])
    setAiSuggestion(null)
  }

  const removePackage = (packageId: string) => {
    setDraftIds((current) => current.filter((id) => id !== packageId))
    setAiSuggestion(null)
  }

  const move = (index: number, delta: number) => {
    setDraftIds((current) => {
      const next = [...current]
      const other = index + delta
      if (other < 0 || other >= next.length) return current
      ;[next[index], next[other]] = [next[other]!, next[index]!]
      return next
    })
    setAiSuggestion(null)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isCourier ? 'Ruta al correo' : 'Planificador inteligente de ruta'}
      description={
        isCourier
          ? 'Asistente para armar el lote de SH al correo.'
          : `IA demo · ${DELIVERY_ZONE_LABELS[zone]} · salida y regreso por Mercado Central`
      }
      size="xl"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="secondary"
            onClick={openMaps}
            disabled={!isCourier && draftPackages.length === 0}
          >
            <MapPin className="h-4 w-4" />
            Abrir en Google Maps
          </Button>
          <Button
            onClick={() => {
              onApply(draftIds)
              onClose()
            }}
          >
            Aplicar al reparto
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-[12px] border border-secondary/20 bg-secondary-light/50 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
              <Bot className="h-5 w-5" />
              Asistente IA (demo)
            </div>
            {!isCourier ? (
              <Input
                label="Horas disponibles"
                type="number"
                min="0.5"
                step="0.5"
                className="w-36"
                value={hoursAvailable}
                onChange={(event) => setHoursAvailable(event.target.value)}
              />
            ) : null}
            <Button loading={aiLoading} onClick={suggestWithAi}>
              <Sparkles className="h-4 w-4" />
              {isCourier ? 'Sugerir todos los SH al correo' : 'Sugerir paquetes automáticamente'}
            </Button>
          </div>

          {aiSuggestion ? (
            <div className="mt-3 space-y-1 text-sm text-text-secondary">
              <p className="font-semibold text-text-primary">{aiSuggestion.summary}</p>
              {aiSuggestion.reasoning.map((line) => (
                <p key={line}>· {line}</p>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-text-secondary">
              {isCourier
                ? 'La IA selecciona los paquetes disponibles válidos para llevar al correo.'
                : 'Indicá cuántas horas tenés (ej. 5 h) y la IA elige cuántos SH podés repartir en ese tiempo.'}
            </p>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-text-primary">
              SH en este reparto ({draftPackages.length})
            </h3>
            <div className="max-h-72 space-y-2 overflow-auto rounded-[10px] border border-border p-2">
              {draftPackages.map((item, index) => (
                <div
                  key={item.id}
                  className="rounded-[10px] border border-border bg-surface p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-primary">Parada {index + 1}</p>
                      <p className="font-mono text-sm font-semibold">{item.shCode}</p>
                      <p className="truncate text-sm font-medium">{item.ownerName}</p>
                      <p className="mt-0.5 text-xs text-text-secondary">
                        {formatFullAddress(item)}
                      </p>
                      <p className="mt-1 text-xs text-text-muted">
                        {item.weight} kg · {PACKAGE_STATUS_LABELS[item.status]}
                      </p>
                      <PackagePaymentInfo pkg={item} compact className="mt-1.5" />
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      {!isCourier ? (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => move(index, -1)}>
                            ↑
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => move(index, 1)}>
                            ↓
                          </Button>
                        </>
                      ) : null}
                      <Button size="sm" variant="ghost" onClick={() => removePackage(item.id)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {draftPackages.length === 0 ? (
                <p className="p-3 text-sm text-text-secondary">
                  Todavía no hay paquetes. Usá el asistente IA o agregá SH manualmente.
                </p>
              ) : null}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-text-primary">
              Agregar SH disponibles
              {isCourier ? '' : ` · ${DELIVERY_ZONE_LABELS[zone]}`}
            </h3>
            <Input
              placeholder="Buscar SH, titular o dirección"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="mt-2 max-h-72 overflow-auto rounded-[10px] border border-border">
              {zoneAvailable.slice(0, 15).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="block w-full border-b border-border p-3 text-left last:border-b-0 hover:bg-primary-light/40"
                  onClick={() => addPackage(item.id)}
                >
                  <span className="font-mono font-semibold">{item.shCode}</span> — {item.ownerName}
                  <span className="mt-0.5 block text-xs text-text-secondary">
                    {formatFullAddress(item)}
                  </span>
                  <span className="mt-0.5 block text-xs text-text-muted">
                    {item.city} · {item.weight} kg
                  </span>
                </button>
              ))}
              {zoneAvailable.length === 0 ? (
                <p className="p-3 text-sm text-text-secondary">
                  No hay más paquetes disponibles en esta zona.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {!isCourier ? (
          <div className="flex flex-wrap items-center gap-3 rounded-[10px] border border-border bg-background px-3 py-3 text-sm">
            <Route className="h-4 w-4 text-primary" />
            <span>{routeSummary(draftPackages)}</span>
            {draftPackages.length > 0 ? (
              <>
                <span className="text-text-muted">· ~{estimateRouteDistanceKm(draftPackages)} km</span>
                <span className="text-text-muted">
                  · ~{formatDuration(routeStats.minutes)} de ronda
                </span>
              </>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              className="ml-auto"
              disabled={draftPackages.length < 2}
              onClick={applyOptimizedOrder}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Reordenar ruta
            </Button>
          </div>
        ) : null}

        {routeStats.minutes > Number(hoursAvailable) * 60 && !isCourier ? (
          <Alert tone="warning" title="Tiempo excedido">
            La ruta actual (~{formatDuration(routeStats.minutes)}) supera las {hoursAvailable} h
            indicadas. Quitá paquetes o volvé a sugerir con IA.
          </Alert>
        ) : null}

        <RouteMapPreview packages={draftPackages} courier={courier} />
      </div>
    </Modal>
  )
}
