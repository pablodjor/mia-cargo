import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo } from 'react'
import type { Delivery, DeliveryStatus } from '@/types'
import { formatMonthYear, toISODate, todayISODate } from '@/utils/date'
import { cn } from '@/utils/cn'

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const STATUS_DOT: Record<DeliveryStatus, string> = {
  draft: 'bg-text-muted',
  prepared: 'bg-info',
  in_progress: 'bg-primary',
  completed: 'bg-success',
  cancelled: 'bg-danger/60',
}

interface DeliveryCalendarProps {
  month: Date
  deliveriesByDate: Map<string, Delivery[]>
  selectedDate: string | null
  onMonthChange: (month: Date) => void
  onSelectDate: (isoDate: string) => void
  onSelectDelivery: (delivery: Delivery) => void
}

export function DeliveryCalendar({
  month,
  deliveriesByDate,
  selectedDate,
  onMonthChange,
  onSelectDate,
  onSelectDelivery,
}: DeliveryCalendarProps) {
  const days = useMemo(() => {
    const monthStart = startOfMonth(month)
    const monthEnd = endOfMonth(month)
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: gridStart, end: gridEnd })
  }, [month])

  const today = todayISODate()

  return (
    <div className="rounded-[14px] border border-border bg-surface p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold capitalize text-text-primary">{formatMonthYear(month)}</h2>
          <p className="text-xs text-text-muted">Hacé clic en un día para ver los repartos</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Mes anterior"
            className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-border text-text-secondary transition-colors hover:bg-background"
            onClick={() => onMonthChange(addMonths(month, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-[10px] border border-border px-3 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-background"
            onClick={() => {
              const now = new Date()
              onMonthChange(now)
              onSelectDate(today)
            }}
          >
            Hoy
          </button>
          <button
            type="button"
            aria-label="Mes siguiente"
            className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-border text-text-secondary transition-colors hover:bg-background"
            onClick={() => onMonthChange(addMonths(month, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold tracking-wide text-text-muted uppercase">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const isoDate = toISODate(day)
          const dayDeliveries = deliveriesByDate.get(isoDate) ?? []
          const isCurrentMonth = isSameMonth(day, month)
          const isSelected = selectedDate === isoDate
          const isToday = isoDate === today

          return (
            <button
              key={isoDate}
              type="button"
              onClick={() => onSelectDate(isoDate)}
              className={cn(
                'min-h-[92px] rounded-[10px] border p-1.5 text-left transition-colors sm:min-h-[104px] sm:p-2',
                isCurrentMonth ? 'bg-surface' : 'bg-background/70',
                isSelected
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-border hover:border-primary/30 hover:bg-primary-light/20',
                isToday && !isSelected && 'border-primary/40 bg-primary-light/15',
              )}
            >
              <div className="mb-1 flex items-center justify-between gap-1">
                <span
                  className={cn(
                    'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                    isToday ? 'bg-primary text-white' : 'text-text-primary',
                    !isCurrentMonth && 'text-text-muted',
                  )}
                >
                  {format(day, 'd')}
                </span>
                {dayDeliveries.length > 0 ? (
                  <span className="rounded-full bg-secondary-light px-1.5 py-0.5 text-[10px] font-bold text-secondary">
                    {dayDeliveries.length}
                  </span>
                ) : null}
              </div>

              <div className="space-y-1">
                {dayDeliveries.slice(0, 2).map((delivery) => (
                  <div
                    key={delivery.id}
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation()
                      onSelectDate(isoDate)
                      onSelectDelivery(delivery)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        event.stopPropagation()
                        onSelectDate(isoDate)
                        onSelectDelivery(delivery)
                      }
                    }}
                    className={cn(
                      'flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-colors hover:bg-surface',
                      delivery.status === 'cancelled' && 'opacity-60 line-through',
                    )}
                  >
                    <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', STATUS_DOT[delivery.status])} />
                    <span className="truncate font-mono text-text-primary">{delivery.code}</span>
                  </div>
                ))}
                {dayDeliveries.length > 2 ? (
                  <p className="px-1 text-[10px] text-text-muted">+{dayDeliveries.length - 2} más</p>
                ) : null}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function groupDeliveriesByDate(
  deliveries: Delivery[],
  includeCancelled: boolean,
): Map<string, Delivery[]> {
  const map = new Map<string, Delivery[]>()

  for (const delivery of deliveries) {
    if (!includeCancelled && delivery.status === 'cancelled') continue
    const list = map.get(delivery.date) ?? []
    list.push(delivery)
    map.set(delivery.date, list)
  }

  for (const [date, list] of map.entries()) {
    map.set(
      date,
      list.sort((a, b) => {
        const aLive = a.status === 'in_progress' ? 0 : 1
        const bLive = b.status === 'in_progress' ? 0 : 1
        if (aLive !== bLive) return aLive - bLive
        return a.code.localeCompare(b.code)
      }),
    )
  }

  return map
}
