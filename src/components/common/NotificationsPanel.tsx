import { Bell } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { useAsyncData } from '@/hooks/useAsyncData'
import { notificationsService } from '@/services/notifications.service'
import { formatDateTime } from '@/utils/date'
import { getNotificationLink, getNotificationMeta } from '@/utils/notifications'
import { cn } from '@/utils/cn'

const TONE_CLASSES = {
  success: 'bg-success-light text-success',
  danger: 'bg-danger-light text-danger',
  info: 'bg-info-light text-info',
  warning: 'bg-warning-light text-warning',
  neutral: 'bg-secondary-light text-text-secondary',
} as const

export function NotificationsPanel() {
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null)
  const { data, reload } = useAsyncData(() => notificationsService.getRecent(), [])
  const entries = data ?? []

  const unreadCount = useMemo(() => {
    if (!lastSeenAt) return notificationsService.getUnreadCount(entries)
    return entries.filter((entry) => entry.createdAt > lastSeenAt).length
  }, [entries, lastSeenAt])

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!open || entries.length === 0) return
    notificationsService.markAllAsRead(entries)
    setLastSeenAt(entries[0]?.createdAt ?? new Date().toISOString())
  }, [open, entries])

  const handleToggle = () => {
    if (!open) void reload()
    setOpen((value) => !value)
  }

  return (
    <div className="relative" ref={ref}>
      <IconButton label="Notificaciones" onClick={handleToggle} className="relative">
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </IconButton>

      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-[min(92vw,380px)] overflow-hidden rounded-[14px] border border-border bg-surface shadow-xl animate-fade-in">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-text-primary">Notificaciones</p>
              <p className="text-xs text-text-muted">Entregas, repartos y actividad reciente</p>
            </div>
            <Link
              to="/history"
              className="text-xs font-medium text-primary hover:underline"
              onClick={() => setOpen(false)}
            >
              Ver historial
            </Link>
          </div>

          <div className="max-h-[min(60vh,420px)] overflow-auto">
            {entries.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-text-secondary">
                Todavía no hay movimientos registrados.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {entries.map((entry) => {
                  const meta = getNotificationMeta(entry)
                  const Icon = meta.icon
                  return (
                    <li key={entry.id}>
                      <button
                        type="button"
                        className="flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-background"
                        onClick={() => {
                          setOpen(false)
                          navigate(getNotificationLink(entry))
                        }}
                      >
                        <span
                          className={cn(
                            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                            TONE_CLASSES[meta.tone],
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm text-text-primary">{entry.description}</span>
                          <span className="mt-1 block text-xs text-text-muted">
                            {entry.userName} · {formatDateTime(entry.createdAt)}
                          </span>
                          {entry.relatedCode ? (
                            <span className="mt-1 inline-block font-mono text-[11px] text-text-secondary">
                              {entry.relatedCode}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {entries.length > 0 ? (
            <div className="border-t border-border px-4 py-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => {
                  setOpen(false)
                  navigate('/history')
                }}
              >
                Ver todo el historial
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
