import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { isNavItemActive, type NavItem } from '@/constants/navigation'

export function SidebarNav({
  items,
  collapsed,
  onNavigate,
}: {
  items: NavItem[]
  collapsed?: boolean
  onNavigate?: () => void
}) {
  const location = useLocation()

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const Icon = item.icon
        const active = isNavItemActive(location.pathname, item.path, items)
        return (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'bg-primary text-white'
                : 'text-white/75 hover:bg-white/10 hover:text-white',
              collapsed && 'justify-center px-2',
            )}
            title={item.label}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed ? <span>{item.label}</span> : null}
          </NavLink>
        )
      })}
    </nav>
  )
}
