import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  Bike,
  Building2,
  Calendar,
  CircleDollarSign,
  ClipboardList,
  History,
  LayoutDashboard,
  Package,
  Route,
  ScanBarcode,
  Settings,
  Truck,
  UserCog,
  Users,
} from 'lucide-react'
import type { UserRole } from '@/types'

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
  roles: UserRole[]
}

export const adminNavItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'operator', 'reader'] },
  { label: 'Paquetes', path: '/packages', icon: Package, roles: ['admin', 'operator', 'reader'] },
  { label: 'Buscar paquete', path: '/scanner', icon: ScanBarcode, roles: ['admin', 'operator', 'reader'] },
  { label: 'Repartos', path: '/deliveries', icon: Route, roles: ['admin', 'operator', 'reader'] },
  { label: 'Calendario', path: '/deliveries/calendar', icon: Calendar, roles: ['admin', 'operator', 'reader'] },
  { label: 'Cobranzas', path: '/payments', icon: CircleDollarSign, roles: ['admin', 'operator', 'reader'] },
  { label: 'Clientes', path: '/persons', icon: Users, roles: ['admin', 'operator', 'reader'] },
  { label: 'Incidencias', path: '/incidents', icon: AlertTriangle, roles: ['admin', 'operator', 'reader'] },
  { label: 'Historial', path: '/history', icon: History, roles: ['admin', 'operator', 'reader'] },
  { label: 'Choferes', path: '/drivers', icon: Bike, roles: ['admin'] },
  { label: 'Vehículos', path: '/vehicles', icon: Truck, roles: ['admin'] },
  { label: 'Correos', path: '/couriers', icon: Building2, roles: ['admin'] },
  { label: 'Usuarios', path: '/users', icon: UserCog, roles: ['admin'] },
  { label: 'Configuración', path: '/settings', icon: Settings, roles: ['admin'] },
]

export const driverNavItems: NavItem[] = [
  { label: 'Mis repartos', path: '/driver', icon: ClipboardList, roles: ['driver'] },
  { label: 'Perfil', path: '/driver/profile', icon: Bike, roles: ['driver'] },
]

export function getHomePath(role: UserRole): string {
  if (role === 'driver') return '/driver'
  return '/dashboard'
}

export function canAccess(path: string, role: UserRole): boolean {
  if (path.startsWith('/design-system')) return role === 'admin'
  if (path.startsWith('/driver')) return role === 'driver' || role === 'admin'
  const item = [...adminNavItems, ...driverNavItems].find(
    (nav) => path === nav.path || path.startsWith(`${nav.path}/`),
  )
  if (!item) return role === 'admin'
  return item.roles.includes(role)
}

/** Evita marcar un ítem padre (ej. /deliveries) cuando hay otro ítem del menú en una ruta hija (ej. /deliveries/calendar). */
export function isNavItemActive(pathname: string, itemPath: string, items: NavItem[]): boolean {
  if (pathname === itemPath) return true

  const nestedNavPaths = items
    .filter((item) => item.path !== itemPath && item.path.startsWith(`${itemPath}/`))
    .map((item) => item.path)

  if (
    nestedNavPaths.some(
      (nestedPath) => pathname === nestedPath || pathname.startsWith(`${nestedPath}/`),
    )
  ) {
    return false
  }

  return pathname.startsWith(`${itemPath}/`)
}
