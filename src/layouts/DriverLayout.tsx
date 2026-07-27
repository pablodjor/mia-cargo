import { LogOut } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import logo from '@/assets/miacargo-logo.svg'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { driverNavItems } from '@/constants/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { formatDeliveryDateDisplay } from '@/utils/date'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'

export function DriverLayout() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-20 border-b border-border bg-secondary text-white">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-4">
          <div className="min-w-0">
            <img
              src={logo}
              alt="Miacargo"
              className="mb-2 h-9 w-auto max-w-[180px] object-contain object-left"
            />
            <p className="truncate font-semibold">{session?.name}</p>
            <p className="text-xs text-white/70">{formatDeliveryDateDisplay(new Date().toISOString())}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle className="border border-white/20 text-white hover:bg-white/10" />
            <Button
              variant="outline"
              size="sm"
              className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
              onClick={async () => {
                await logout()
                navigate('/login')
              }}
            >
              <LogOut className="h-4 w-4" />
              Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-4">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface">
        <div className="mx-auto grid max-w-lg grid-cols-2 gap-1 px-2 py-2">
          {driverNavItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/driver'}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center gap-1 rounded-[10px] px-3 py-2 text-xs font-semibold transition-colors',
                    isActive
                      ? 'bg-primary-light text-primary'
                      : 'text-text-secondary hover:bg-secondary-light hover:text-text-primary',
                  )
                }
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
