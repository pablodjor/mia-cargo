import type { LucideIcon } from 'lucide-react'
import {
  CheckCircle2,
  Package,
  PackageX,
  Route,
  RotateCcw,
  UserPlus,
  XCircle,
} from 'lucide-react'
import type { HistoryEntry } from '@/types'

export interface NotificationMeta {
  icon: LucideIcon
  tone: 'success' | 'danger' | 'info' | 'warning' | 'neutral'
}

const ACTION_META: Record<string, NotificationMeta> = {
  package_delivered: { icon: CheckCircle2, tone: 'success' },
  package_not_delivered: { icon: PackageX, tone: 'danger' },
  package_rescheduled: { icon: RotateCcw, tone: 'warning' },
  package_status_changed: { icon: Package, tone: 'info' },
  package_created: { icon: Package, tone: 'info' },
  package_updated: { icon: Package, tone: 'neutral' },
  package_payment_changed: { icon: Package, tone: 'info' },
  package_pickup_registered: { icon: CheckCircle2, tone: 'success' },
  package_deleted: { icon: PackageX, tone: 'danger' },
  package_status_reset: { icon: RotateCcw, tone: 'warning' },
  delivery_created: { icon: Route, tone: 'info' },
  delivery_updated: { icon: Route, tone: 'neutral' },
  delivery_prepared: { icon: Route, tone: 'info' },
  delivery_in_progress: { icon: Route, tone: 'warning' },
  delivery_completed: { icon: CheckCircle2, tone: 'success' },
  delivery_cancelled: { icon: XCircle, tone: 'danger' },
  delivery_draft: { icon: Route, tone: 'neutral' },
  user_created: { icon: UserPlus, tone: 'info' },
  user_updated: { icon: UserPlus, tone: 'neutral' },
}

export function isNotificationEntry(entry: HistoryEntry): boolean {
  if (entry.action.startsWith('package_')) return true
  if (entry.action.startsWith('delivery_')) return true
  if (entry.action === 'user_created') return true
  if (entry.action === 'user_updated') return true
  return false
}

export function getNotificationMeta(entry: HistoryEntry): NotificationMeta {
  return ACTION_META[entry.action] ?? { icon: Package, tone: 'neutral' }
}

export function getNotificationLink(entry: HistoryEntry): string {
  switch (entry.entity) {
    case 'delivery':
      return `/deliveries/${entry.entityId}`
    case 'package':
      return `/history?entityId=${entry.entityId}`
    case 'user':
      return '/users'
    default:
      return '/history'
  }
}
