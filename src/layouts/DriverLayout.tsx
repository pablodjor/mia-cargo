import { LogOut, UserRound } from 'lucide-react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import logo from '@/assets/miacargo-logo.svg'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { useAuth } from '@/contexts/AuthContext'
import { formatDeliveryDateDisplay } from '@/utils/date'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { cn } from '@/utils/cn'

export function DriverLayout() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const onProfile = location.pathname.startsWith('/driver/profile')

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-secondary text-white">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-4">
          <div className="min-w-0">
            {onProfile ? (
              <Link to="/driver" className="mb-2 inline-flex text-sm text-white/80 hover:text-white">
                ← Mis repartos
              </Link>
            ) : (
              <img
                src={logo}
                alt="Miacargo"
                className="mb-2 h-9 w-auto max-w-[180px] object-contain object-left"
              />
            )}
            <p className="truncate font-semibold">{session?.name}</p>
            <p className="text-xs text-white/70">{formatDeliveryDateDisplay(new Date().toISOString())}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <IconButton
              label="Mi perfil"
              className={cn(
                'border border-white/20 text-white hover:bg-white/10 hover:text-white',
                onProfile && 'bg-white/10 text-white',
              )}
              onClick={() => navigate('/driver/profile')}
            >
              <UserRound className="h-4 w-4" />
            </IconButton>
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
    </div>
  )
}
