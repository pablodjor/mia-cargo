import { Bell, X } from 'lucide-react'
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { createPortal } from 'react-dom'
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

const PANEL_WIDTH = 380
const DESKTOP_MAX_HEIGHT = 420
const MOBILE_MEDIA = '(max-width: 767px)'

interface PanelCoords {
  top: number
  left: number
  maxHeight: number
}

function getDesktopPanelCoords(trigger: DOMRect, panelWidth: number): PanelCoords {
  const gap = 8
  const left = Math.max(gap, Math.min(trigger.right - panelWidth, window.innerWidth - panelWidth - gap))
  const spaceBelow = window.innerHeight - trigger.bottom - gap
  const spaceAbove = trigger.top - gap
  const openUp = spaceBelow < 280 && spaceAbove > spaceBelow
  const maxHeight = Math.min(
    DESKTOP_MAX_HEIGHT,
    openUp ? Math.max(160, spaceAbove) : Math.max(160, spaceBelow),
  )
  const top = openUp ? trigger.top - maxHeight - gap : trigger.bottom + gap

  return { top, left, maxHeight }
}

export function NotificationsPanel() {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null)
  const [coords, setCoords] = useState<PanelCoords | null>(null)
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_MEDIA).matches : false,
  )
  const { data, reload } = useAsyncData(() => notificationsService.getRecent(), [])
  const entries = data ?? []

  const unreadCount = useMemo(() => {
    if (!lastSeenAt) return notificationsService.getUnreadCount(entries)
    return entries.filter((entry) => entry.createdAt > lastSeenAt).length
  }, [entries, lastSeenAt])

  useEffect(() => {
    const media = window.matchMedia(MOBILE_MEDIA)
    const sync = () => setIsMobile(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  useLayoutEffect(() => {
    if (!open || isMobile) {
      setCoords(null)
      return
    }

    const updatePosition = () => {
      const trigger = triggerRef.current
      const panel = panelRef.current
      if (!trigger || !panel) return

      const panelWidth = Math.min(PANEL_WIDTH, window.innerWidth - 16)
      setCoords(getDesktopPanelCoords(trigger.getBoundingClientRect(), panelWidth))
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, isMobile, entries.length])

  useEffect(() => {
    if (!open) return

    const handler = (event: MouseEvent) => {
      const target = event.target as Node
      if (containerRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      setOpen(false)
    }

    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (!open || !isMobile) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open, isMobile])

  useEffect(() => {
    if (!open || entries.length === 0) return
    notificationsService.markAllAsRead(entries)
    setLastSeenAt(entries[0]?.createdAt ?? new Date().toISOString())
  }, [open, entries])

  const handleToggle = () => {
    if (!open) void reload()
    setOpen((value) => !value)
  }

  const panelWidth = typeof window !== 'undefined' ? Math.min(PANEL_WIDTH, window.innerWidth - 16) : PANEL_WIDTH

  const desktopStyle: CSSProperties | undefined =
    !isMobile && coords
      ? {
          top: coords.top,
          left: coords.left,
          width: panelWidth,
          maxHeight: coords.maxHeight,
        }
      : undefined

  const panel = open ? (
    <div
      className={cn(
        'fixed z-50 flex flex-col overflow-hidden border border-border bg-surface shadow-xl animate-fade-in',
        isMobile
          ? 'inset-x-0 bottom-0 max-h-[min(85dvh,560px)] rounded-t-[16px] border-b-0 pb-[env(safe-area-inset-bottom)]'
          : cn('rounded-[14px]', !coords && 'invisible'),
      )}
      ref={panelRef}
      style={desktopStyle}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text-primary">Notificaciones</p>
          <p className="text-xs text-text-muted">Entregas, repartos y actividad reciente</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            to="/history"
            className="text-xs font-medium text-primary hover:underline"
            onClick={() => setOpen(false)}
          >
            Ver historial
          </Link>
          {isMobile ? (
            <IconButton label="Cerrar notificaciones" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </IconButton>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
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
        <div className="border-t border-border px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
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
  ) : null

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <IconButton
        ref={triggerRef}
        label="Notificaciones"
        onClick={handleToggle}
        className="relative"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </IconButton>

      {panel
        ? createPortal(
            <>
              {isMobile ? (
                <button
                  type="button"
                  aria-label="Cerrar notificaciones"
                  className="fixed inset-0 z-40 bg-secondary/50 animate-fade-in md:hidden"
                  onClick={() => setOpen(false)}
                />
              ) : null}
              {panel}
            </>,
            document.body,
          )
        : null}
    </div>
  )
}
