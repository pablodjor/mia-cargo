import { LogOut, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { GlobalSearchModal } from '@/components/common/GlobalSearchModal'
import { DemoRemoteBanner } from '@/components/common/DemoRemoteBanner'
import { NotificationsPanel } from '@/components/common/NotificationsPanel'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { adminNavItems } from '@/constants/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_LABELS } from '@/constants/labels'
import { BrandLogo } from '@/components/common/BrandLogo'
import { SidebarNav } from '@/components/common/SidebarNav'
import { Drawer } from '@/components/ui/Drawer'
import { DropdownMenu } from '@/components/ui/DropdownMenu'
import { IconButton } from '@/components/ui/IconButton'
import { SearchInput } from '@/components/ui/SearchInput'
import { cn } from '@/utils/cn'

const titles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/scanner': 'Buscar paquete',
  '/packages': 'Paquetes',
  '/payments': 'Cobranzas',
  '/persons': 'Clientes',
  '/deliveries/calendar': 'Calendario de repartos',
  '/deliveries': 'Repartos',
  '/incidents': 'Incidencias',
  '/drivers': 'Choferes',
  '/vehicles': 'Vehículos',
  '/couriers': 'Correos',
  '/users': 'Usuarios',
  '/history': 'Historial',
  '/settings': 'Configuración',
  '/design-system': 'Design System',
}

export function AppLayout() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const items = useMemo(
    () => adminNavItems.filter((item) => session && item.roles.includes(session.role)),
    [session],
  )

  const title =
    Object.entries(titles)
      .sort(([a], [b]) => b.length - a.length)
      .find(([path]) => location.pathname.startsWith(path))?.[1] ?? 'Miacargo'

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden flex-col bg-secondary text-white transition-all duration-200 lg:flex',
          collapsed ? 'w-[92px]' : 'w-[280px]',
        )}
      >
        <div className={cn('border-b border-white/10 px-4 py-5', collapsed && 'px-2 py-5')}>
          <BrandLogo collapsed={collapsed} />
        </div>
        <div className="scrollbar-dark flex-1 overflow-auto p-3">
          <SidebarNav items={items} collapsed={collapsed} />
        </div>
        <div className="border-t border-white/10 p-3">
          <IconButton
            label={collapsed ? 'Expandir' : 'Colapsar'}
            className="w-full text-white hover:bg-white/10"
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </IconButton>
        </div>
      </aside>

      <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} title="Miacargo">
        <SidebarNav items={items} onNavigate={() => setMobileOpen(false)} />
      </Drawer>

      <div className={cn('transition-all duration-200', collapsed ? 'lg:pl-[92px]' : 'lg:pl-[280px]')}>
        <DemoRemoteBanner />
        <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 lg:px-6">
            <IconButton label="Menú" className="lg:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </IconButton>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-semibold text-text-primary">{title}</h1>
            </div>
            <div className="hidden max-w-md flex-1 md:block">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="relative w-full text-left"
              >
                <SearchInput
                  placeholder="Buscar en el sistema..."
                  readOnly
                  className="cursor-pointer [&_input]:pr-14"
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
                  ⌘K
                </span>
              </button>
            </div>
            <NotificationsPanel />
            <ThemeToggle />
            <DropdownMenu
              items={[
                {
                  label: 'Design System',
                  onClick: () => navigate('/design-system'),
                  disabled: session?.role !== 'admin',
                },
                {
                  label: 'Cerrar sesión',
                  tone: 'danger',
                  onClick: async () => {
                    await logout()
                    navigate('/login')
                  },
                },
              ]}
              trigger={
                <div className="flex items-center gap-2 rounded-[10px] border border-border px-2 py-1.5 hover:bg-secondary-light">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary">
                    {session?.name
                      .split(' ')
                      .map((part) => part[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="hidden text-left sm:block">
                    <p className="text-sm font-semibold text-text-primary">{session?.name}</p>
                    <p className="text-xs text-text-muted">
                      {session ? ROLE_LABELS[session.role] : ''}
                    </p>
                  </div>
                  <LogOut className="hidden h-4 w-4 text-text-muted sm:block" />
                </div>
              }
            />
          </div>
        </header>
        <main className="px-4 py-6 lg:px-6">
          <Outlet />
        </main>
      </div>

      <GlobalSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}
