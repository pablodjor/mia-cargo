import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, type To } from 'react-router-dom'
import { DropdownMenu, type DropdownMenuItem } from '@/components/ui/DropdownMenu'
import { cn } from '@/utils/cn'

export type TableRowMenuItem =
  | { separator: true }
  | { label: string; to: To; icon?: LucideIcon }
  | {
      label: string
      onClick: () => void
      icon?: LucideIcon
      tone?: 'default' | 'danger'
      disabled?: boolean
    }

export function TableRowMenu({
  items,
  label = 'Más acciones',
}: {
  items: TableRowMenuItem[]
  label?: string
}) {
  const dropdownItems: DropdownMenuItem[] = items.map((item) => {
    if ('separator' in item) return { separator: true }
    if ('to' in item) return { label: item.label, to: item.to, icon: item.icon }
    return {
      label: item.label,
      onClick: item.onClick,
      icon: item.icon,
      tone: item.tone,
      disabled: item.disabled,
    }
  })

  return <DropdownMenu items={dropdownItems} label={label} />
}

/** Enlace compacto para celdas que no usan el menú de tres puntos. */
export function TableActionLink({ to, children }: { to: To; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex h-8 items-center justify-center whitespace-nowrap rounded-[10px] border border-border bg-surface px-2.5 text-xs font-semibold text-text-primary shadow-sm transition-colors hover:border-primary hover:bg-primary-light hover:text-primary-hover"
    >
      {children}
    </Link>
  )
}

/** @deprecated Usar TableRowMenu */
export function TableActions({
  children,
  className,
  layout = 'inline',
}: {
  children: ReactNode
  className?: string
  layout?: 'inline' | 'double'
}) {
  if (layout === 'double') {
    const childArray = Array.isArray(children) ? children : [children]
    const splitAt = Math.ceil(childArray.length / 2)
    return (
      <div className={cn('flex flex-col gap-1.5', className)}>
        <div className="flex flex-wrap items-center gap-1.5">{childArray.slice(0, splitAt)}</div>
        <div className="flex flex-wrap items-center gap-1.5">{childArray.slice(splitAt)}</div>
      </div>
    )
  }

  return (
    <div className={cn('flex min-w-max flex-wrap items-center gap-1.5', className)}>
      {children}
    </div>
  )
}
