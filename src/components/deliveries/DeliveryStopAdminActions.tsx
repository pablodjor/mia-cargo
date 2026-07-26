import {
  MapPin,
  SlidersHorizontal,
  CheckCircle2,
  PackageX,
  RotateCcw,
  CalendarPlus,
  Calendar,
  Trash2,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { DropdownMenu } from '@/components/ui/DropdownMenu'
import type { DeliveryStop } from '@/types'

interface DeliveryStopAdminActionsProps {
  stop: DeliveryStop
  canEdit: boolean
  hasAddress: boolean
  extraActions?: ReactNode
  onMaps: () => void
  onMarkDelivered: () => void
  onMarkFailed: () => void
  onRescheduleTomorrow: () => void
  onReschedule: () => void
  onResetPending: () => void
  onRemove: () => void
}

export function DeliveryStopAdminActions({
  stop,
  canEdit,
  hasAddress,
  extraActions,
  onMaps,
  onMarkDelivered,
  onMarkFailed,
  onRescheduleTomorrow,
  onReschedule,
  onResetPending,
  onRemove,
}: DeliveryStopAdminActionsProps) {
  if (!canEdit && !hasAddress) return null

  const isPending = stop.status === 'pending'
  const isDelivered = stop.status === 'delivered'
  const isFailed = stop.status === 'not_delivered'

  const menuItems = canEdit
    ? [
        ...(isDelivered || isFailed
          ? [{ label: 'Volver a pendiente', icon: RotateCcw, onClick: onResetPending }]
          : []),
        { label: 'Reprogramar para mañana', icon: CalendarPlus, onClick: onRescheduleTomorrow },
        { label: 'Reprogramar otra fecha', icon: Calendar, onClick: onReschedule },
        ...(isPending
          ? [
              { separator: true as const },
              {
                label: 'Quitar del reparto',
                icon: Trash2,
                onClick: onRemove,
                tone: 'danger' as const,
              },
            ]
          : []),
      ]
    : []

  return (
    <div className="mt-3 flex w-full flex-wrap items-center gap-2 border-t border-border/70 pt-3">
      <div className="flex flex-wrap items-center gap-2">
        {canEdit && (isPending || isFailed || isDelivered) ? (
          <>
            {isPending || isFailed ? (
              <Button type="button" size="sm" className="gap-1.5" onClick={onMarkDelivered}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Marcar entregado
              </Button>
            ) : null}
            {isPending || isDelivered ? (
              <Button
                type="button"
                size="sm"
                variant="danger"
                className="gap-1.5"
                onClick={onMarkFailed}
              >
                <PackageX className="h-3.5 w-3.5" />
                {isDelivered ? 'Corregir: no entregado' : 'No se pudo entregar'}
              </Button>
            ) : null}
          </>
        ) : null}

        {hasAddress ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 shrink-0 gap-1.5 px-3 text-xs"
            onClick={onMaps}
          >
            <MapPin className="h-3.5 w-3.5" />
            Maps
          </Button>
        ) : null}

        {canEdit && menuItems.length > 0 ? (
          <DropdownMenu
            items={menuItems}
            trigger={
              <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 px-3 text-xs">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Más acciones
              </Button>
            }
          />
        ) : null}
      </div>

      {extraActions ? (
        <div className="ml-auto flex shrink-0 items-center gap-2">{extraActions}</div>
      ) : null}
    </div>
  )
}
