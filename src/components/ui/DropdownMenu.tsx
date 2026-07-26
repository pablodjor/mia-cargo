import { MoreHorizontal, type LucideIcon } from 'lucide-react'
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Link, type To } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { IconButton } from './IconButton'

export interface DropdownMenuItem {
  label?: string
  onClick?: () => void
  to?: To
  icon?: LucideIcon
  tone?: 'default' | 'danger'
  disabled?: boolean
  separator?: boolean
}

interface DropdownMenuProps {
  items: DropdownMenuItem[]
  trigger?: ReactNode
  label?: string
}

interface MenuCoords {
  top: number
  left: number
}

function DropdownMenuItemContent({
  icon: Icon,
  label,
  tone = 'default',
}: {
  icon?: LucideIcon
  label: string
  tone?: 'default' | 'danger'
}) {
  return (
    <span className="flex items-center gap-2.5">
      {Icon ? (
        <Icon
          className={cn(
            'h-4 w-4 shrink-0',
            tone === 'danger' ? 'text-danger' : 'text-text-muted',
          )}
        />
      ) : null}
      <span>{label}</span>
    </span>
  )
}

const itemClassName = (tone: DropdownMenuItem['tone'] = 'default') =>
  cn(
    'flex w-full items-center px-3 py-2 text-left text-sm transition-colors hover:bg-secondary-light disabled:cursor-not-allowed disabled:opacity-40',
    tone === 'danger' ? 'text-danger' : 'text-text-primary',
  )

function getTriggerElement(container: HTMLDivElement | null): HTMLElement | null {
  return container?.querySelector('button') ?? null
}

export function DropdownMenu({ items, trigger, label = 'Acciones' }: DropdownMenuProps) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<MenuCoords | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const updatePosition = () => {
    const triggerEl = getTriggerElement(containerRef.current)
    const menuEl = menuRef.current
    if (!triggerEl || !menuEl) return

    const rect = triggerEl.getBoundingClientRect()
    const menuHeight = menuEl.offsetHeight
    const menuWidth = menuEl.offsetWidth
    const gap = 4

    const spaceBelow = window.innerHeight - rect.bottom - gap
    const spaceAbove = rect.top - gap
    const openUp = spaceBelow < menuHeight && spaceAbove > spaceBelow

    const top = openUp ? rect.top - menuHeight - gap : rect.bottom + gap
    const left = Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8))

    setCoords({ top, left })
  }

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null)
      return
    }

    updatePosition()

    const handleReposition = () => updatePosition()
    window.addEventListener('resize', handleReposition)
    window.addEventListener('scroll', handleReposition, true)

    return () => {
      window.removeEventListener('resize', handleReposition)
      window.removeEventListener('scroll', handleReposition, true)
    }
  }, [open, items])

  useEffect(() => {
    if (!open) return

    const handler = (event: MouseEvent) => {
      const target = event.target as Node
      if (containerRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
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

  const menuPanel = open ? (
    <div
      ref={menuRef}
      className={cn(
        'fixed z-50 min-w-52 overflow-hidden rounded-[12px] border border-border bg-surface py-1 shadow-lg animate-fade-in',
        !coords && 'invisible',
      )}
      style={coords ? { top: coords.top, left: coords.left } : { top: 0, left: 0 }}
    >
      {items.map((item, index) => {
        if (item.separator) {
          return (
            <div key={`sep-${index}`} className="my-1 border-t border-border" role="separator" />
          )
        }

        if (!item.label) return null

        if (item.to) {
          return (
            <Link
              key={`${item.label}-${index}`}
              to={item.to}
              className={itemClassName(item.tone)}
              onClick={() => setOpen(false)}
            >
              <DropdownMenuItemContent icon={item.icon} label={item.label} tone={item.tone} />
            </Link>
          )
        }

        return (
          <button
            key={`${item.label}-${index}`}
            type="button"
            disabled={item.disabled}
            className={itemClassName(item.tone)}
            onClick={() => {
              item.onClick?.()
              setOpen(false)
            }}
          >
            <DropdownMenuItemContent icon={item.icon} label={item.label} tone={item.tone} />
          </button>
        )
      })}
    </div>
  ) : null

  return (
    <div className="relative inline-flex" ref={containerRef}>
      {trigger ? (
        <button type="button" onClick={() => setOpen((value) => !value)}>
          {trigger}
        </button>
      ) : (
        <IconButton
          label={label}
          variant="outline"
          className="h-8 w-8"
          onClick={() => setOpen((value) => !value)}
        >
          <MoreHorizontal className="h-4 w-4" />
        </IconButton>
      )}
      {menuPanel ? createPortal(menuPanel, document.body) : null}
    </div>
  )
}
