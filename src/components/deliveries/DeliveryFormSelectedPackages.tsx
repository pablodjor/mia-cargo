import { ChevronDown, ChevronUp, GripVertical, PackagePlus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { DeliveryStopAddressFields } from '@/components/deliveries/DeliveryStopAddressFields'
import { DeliveryStopAdminActions } from '@/components/deliveries/DeliveryStopAdminActions'
import { DeliveryStopFailureSummary } from '@/components/deliveries/DeliveryStopFailureSummary'
import { DestinationBadge } from '@/components/common/DestinationBadge'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { PACKAGE_STATUS_LABELS } from '@/constants/labels'
import type { DeliveryAddressOverride, DeliveryChannel, DeliveryStop, Package } from '@/types'
import { formatDateTime } from '@/utils/date'
import {
  formatPackageAddress,
  formatStopAddress,
  formatStopMapsAddress,
  hasAlternateDeliveryAddress,
  isCompleteDeliveryAddress,
} from '@/utils/delivery-address'
import { formatAddressLine } from '@/utils/address-details'
import { cn } from '@/utils/cn'

interface DeliveryFormSelectedPackagesProps {
  selected: Package[]
  channel: DeliveryChannel
  stopByPackageId: Map<string, DeliveryStop>
  canManageStops: boolean
  addressOverrides: Record<string, DeliveryAddressOverride>
  openAddressEditors: Record<string, boolean>
  lockedAddressOverrides: Record<string, boolean>
  onReorder: (fromIndex: number, toIndex: number) => void
  onRemove: (packageId: string) => void
  onOpenAddressEditor: (packageId: string) => void
  onAddressEditorOpenChange: (packageId: string, open: boolean) => void
  onLockedAddressChange: (packageId: string, locked: boolean) => void
  onAddressOverrideChange: (packageId: string, value: DeliveryAddressOverride | undefined) => void
  onMarkDelivered: (stop: DeliveryStop) => void
  onMarkFailed: (stop: DeliveryStop) => void
  onRescheduleTomorrow: (stop: DeliveryStop) => void
  onReschedule: (stop: DeliveryStop) => void
  onResetPending: (stop: DeliveryStop) => void
}

function resolveDeliveryAddress(
  pkg: Package,
  stop: DeliveryStop | undefined,
  override: DeliveryAddressOverride | undefined,
  locked: boolean,
): string {
  if (override && (locked || isCompleteDeliveryAddress(override))) {
    return formatAddressLine(override)
  }
  if (stop) return formatStopAddress(pkg, stop)
  return formatPackageAddress(pkg)
}

function resolveMapsAddress(
  pkg: Package,
  stop: DeliveryStop | undefined,
  override: DeliveryAddressOverride | undefined,
  locked: boolean,
): string {
  if (override && locked && isCompleteDeliveryAddress(override)) {
    return formatAddressLine(override)
  }
  if (stop) return formatStopMapsAddress(pkg, stop)
  return formatPackageAddress(pkg)
}

export function DeliveryFormSelectedPackages({
  selected,
  channel,
  stopByPackageId,
  canManageStops,
  addressOverrides,
  openAddressEditors,
  lockedAddressOverrides,
  onReorder,
  onRemove,
  onOpenAddressEditor,
  onAddressEditorOpenChange,
  onLockedAddressChange,
  onAddressOverrideChange,
  onMarkDelivered,
  onMarkFailed,
  onRescheduleTomorrow,
  onReschedule,
  onResetPending,
}: DeliveryFormSelectedPackagesProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const sortable = channel !== 'courier'

  const move = (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= selected.length) return
    onReorder(index, target)
  }

  const handleDrop = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) return
    onReorder(draggedIndex, targetIndex)
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  if (selected.length === 0) {
    return (
      <div className="rounded-[10px] border border-dashed border-primary/30 bg-surface px-4 py-8 text-center">
        <PackagePlus className="mx-auto h-8 w-8 text-primary/60" />
        <p className="mt-2 text-sm font-medium text-text-primary">Todavía no hay paquetes en el reparto</p>
        <p className="mt-1 text-xs text-text-secondary">
          Buscá abajo un SH disponible o usá el planificador IA para sugerirlos.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {selected.map((item, index) => {
        const stop = stopByPackageId.get(item.id)
        const override = addressOverrides[item.id]
        const locked = Boolean(lockedAddressOverrides[item.id])
        const deliveryAddress = resolveDeliveryAddress(item, stop, override, locked)
        const mapsAddress = resolveMapsAddress(item, stop, override, locked)
        const alternateAddress =
          stop && hasAlternateDeliveryAddress(item, stop)
            ? true
            : Boolean(override && locked && formatPackageAddress(item).toLowerCase() !== deliveryAddress.toLowerCase())
        const isDragging = draggedIndex === index
        const isDragOver = dragOverIndex === index && draggedIndex !== index
        const isFailed = stop?.status === 'not_delivered'

        const reorderActions = sortable ? (
          <div className="flex items-center gap-0.5 rounded-[8px] border border-border bg-background p-0.5">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 px-0"
              aria-label="Subir parada"
              disabled={index === 0}
              onClick={() => move(index, -1)}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 px-0"
              aria-label="Bajar parada"
              disabled={index === selected.length - 1}
              onClick={() => move(index, 1)}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        ) : null

        const removeAction = (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-danger hover:bg-danger-light hover:text-danger"
            aria-label="Quitar del reparto"
            disabled={stop?.status === 'delivered'}
            onClick={() => onRemove(item.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )

        return (
          <div
            key={item.id}
            draggable={sortable}
            onDragStart={() => setDraggedIndex(index)}
            onDragEnd={() => {
              setDraggedIndex(null)
              setDragOverIndex(null)
            }}
            onDragOver={(event) => {
              if (!sortable || draggedIndex === null) return
              event.preventDefault()
              setDragOverIndex(index)
            }}
            onDrop={(event) => {
              event.preventDefault()
              handleDrop(index)
            }}
            className={cn(
              'rounded-[10px] border border-primary/20 bg-surface p-3 shadow-sm transition',
              isDragging && 'opacity-50',
              isDragOver && 'border-primary ring-2 ring-primary/20',
              stop?.status === 'delivered' && 'border-success/30 bg-success-light/20',
              stop?.status === 'not_delivered' && 'border-danger/25 bg-danger-light/10',
            )}
          >
            <div className="flex min-w-0 gap-3">
              {sortable ? (
                <button
                  type="button"
                  className="mt-0.5 flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded-full bg-secondary-light text-secondary active:cursor-grabbing"
                  aria-label="Arrastrar para reordenar"
                  onMouseDown={(event) => event.stopPropagation()}
                >
                  <GripVertical className="h-4 w-4" />
                </button>
              ) : null}
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">
                    <span className="font-mono font-semibold text-primary">{item.shCode}</span>
                    <span className="text-text-muted"> · </span>
                    {item.ownerName}
                    <span className="text-text-muted"> · {item.weight} kg</span>
                  </p>
                  {stop ? <StatusBadge status={stop.status} type="stop" /> : null}
                </div>
                <p className="mt-1 truncate text-sm text-text-primary" title={deliveryAddress}>
                  {deliveryAddress}
                </p>
                {alternateAddress ? (
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge tone="warning">Entrega alternativa</Badge>
                    <p className="text-xs text-text-muted line-through">{formatPackageAddress(item)}</p>
                  </div>
                ) : null}
                <p className="mt-1 text-xs text-text-muted">
                  <DestinationBadge destination={item.destinationType} /> · {item.city} ·{' '}
                  {PACKAGE_STATUS_LABELS[item.status]}
                </p>
                {stop?.attemptedAt && stop.status === 'delivered' ? (
                  <p className="mt-1 text-xs font-medium text-success">
                    Entregado: {formatDateTime(stop.attemptedAt)}
                  </p>
                ) : null}
                {channel !== 'courier' ? (
                  <DeliveryStopAddressFields
                    pkg={item}
                    value={override}
                    open={Boolean(openAddressEditors[item.id])}
                    locked={locked}
                    showPackageDefault={false}
                    onOpenChange={(open) => {
                      if (open) onOpenAddressEditor(item.id)
                      else onAddressEditorOpenChange(item.id, false)
                    }}
                    onLockedChange={(nextLocked) => onLockedAddressChange(item.id, nextLocked)}
                    onChange={(value) => onAddressOverrideChange(item.id, value)}
                  />
                ) : null}
              </div>
            </div>

            {isFailed && stop ? (
              <div className={cn('mt-3', sortable ? 'pl-14' : 'pl-10')}>
                <DeliveryStopFailureSummary notes={item.failureNotes} attemptedAt={stop.attemptedAt} />
              </div>
            ) : null}

            {canManageStops && stop ? (
              <DeliveryStopAdminActions
                stop={stop}
                canEdit={canManageStops}
                hasAddress={Boolean(mapsAddress)}
                extraActions={
                  <>
                    {reorderActions}
                    {removeAction}
                  </>
                }
                onMaps={() =>
                  window.open(
                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsAddress)}`,
                    '_blank',
                    'noopener,noreferrer',
                  )
                }
                onMarkDelivered={() => onMarkDelivered(stop)}
                onMarkFailed={() => onMarkFailed(stop)}
                onRescheduleTomorrow={() => onRescheduleTomorrow(stop)}
                onReschedule={() => onReschedule(stop)}
                onResetPending={() => onResetPending(stop)}
                onRemove={() => onRemove(item.id)}
              />
            ) : (
              <div className="mt-3 flex w-full items-center justify-end gap-2 border-t border-border/70 pt-3">
                {reorderActions}
                {removeAction}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
