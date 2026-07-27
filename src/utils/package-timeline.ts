import type { HistoryEntry, Package, PackageFailedAttempt } from '@/types'
import { translateHistoryStatus } from '@/constants/labels'
import { formatHistoryDescription } from '@/utils/history-display'
import { resolveAttemptReason } from '@/utils/package-attempts'

export type PackageTimelineKind =
  | 'created'
  | 'updated'
  | 'status'
  | 'delivered'
  | 'failed'
  | 'rescheduled'
  | 'reset'
  | 'other'

export interface PackageTimelineEvent {
  id: string
  at: string
  kind: PackageTimelineKind
  title: string
  detail?: string
  userName?: string
  deliveryCode?: string
  statusFrom?: string
  statusTo?: string
  attemptNumber?: number
}

const ACTION_KIND: Record<string, PackageTimelineKind> = {
  package_created: 'created',
  package_updated: 'updated',
  package_status_changed: 'status',
  package_delivered: 'delivered',
  package_not_delivered: 'failed',
  package_rescheduled: 'rescheduled',
  package_status_reset: 'reset',
  package_payment_changed: 'updated',
  package_pickup_registered: 'delivered',
  package_deleted: 'other',
}

function titleForKind(kind: PackageTimelineKind, entry: HistoryEntry): string {
  switch (kind) {
    case 'created':
      return 'Paquete ingresado'
    case 'updated':
      return 'Datos modificados'
    case 'delivered':
      return 'Entrega confirmada'
    case 'failed':
      return 'No se pudo entregar'
    case 'rescheduled':
      return 'Entrega reprogramada'
    case 'reset':
      return 'Vuelto a pendiente'
    case 'other':
      return entry.action === 'package_deleted' ? 'Paquete eliminado' : 'Movimiento registrado'
    case 'status': {
      const to = translateHistoryStatus(entry.newStatus)
      return to ? `Estado actualizado · ${to}` : 'Cambio de estado'
    }
    default:
      return 'Movimiento registrado'
  }
}

function historyToEvent(entry: HistoryEntry): PackageTimelineEvent {
  const kind = ACTION_KIND[entry.action] ?? 'other'
  return {
    id: entry.id,
    at: entry.createdAt,
    kind,
    title: titleForKind(kind, entry),
    detail: formatHistoryDescription(entry),
    userName: entry.userName,
    statusFrom: entry.previousStatus,
    statusTo: entry.newStatus,
  }
}

function attemptToEvent(
  attempt: PackageFailedAttempt,
  reasonById: Map<string, string>,
): PackageTimelineEvent {
  return {
    id: attempt.id,
    at: attempt.attemptedAt,
    kind: attempt.outcome === 'rescheduled' ? 'rescheduled' : 'failed',
    title: attempt.outcome === 'rescheduled' ? 'Entrega reprogramada' : 'No se pudo entregar',
    detail: resolveAttemptReason(attempt, reasonById),
    userName: attempt.userName,
    deliveryCode: attempt.deliveryCode,
  }
}

function sameMoment(a: string, b: string, toleranceMs = 120_000): boolean {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) <= toleranceMs
}

export function isOperationalPackageNote(notes?: string): boolean {
  if (!notes?.trim()) return false
  return !notes.trim().toLowerCase().startsWith('reprogramado para')
}

function assignAttemptNumbers(events: PackageTimelineEvent[]): PackageTimelineEvent[] {
  const attempts = events
    .filter((event) => event.kind === 'failed' || event.kind === 'rescheduled')
    .sort((a, b) => a.at.localeCompare(b.at))

  const numberById = new Map(attempts.map((event, index) => [event.id, index + 1]))

  return events.map((event) => ({
    ...event,
    attemptNumber: numberById.get(event.id),
  }))
}

export function buildPackageTimeline(
  pkg: Package,
  history: HistoryEntry[],
  reasonById: Map<string, string>,
): PackageTimelineEvent[] {
  const packageHistory = history
    .filter((entry) => entry.entity === 'package' && entry.entityId === pkg.id)
    .map(historyToEvent)

  const attempts = (pkg.failedAttempts ?? []).map((attempt) => attemptToEvent(attempt, reasonById))
  const merged = [...packageHistory]

  for (const attempt of attempts) {
    const matchIndex = merged.findIndex(
      (event) =>
        (event.kind === 'failed' || event.kind === 'rescheduled') && sameMoment(event.at, attempt.at),
    )

    if (matchIndex >= 0) {
      const current = merged[matchIndex]
      if (current) {
        merged[matchIndex] = {
          ...current,
          detail: attempt.detail || current.detail,
          deliveryCode: attempt.deliveryCode ?? current.deliveryCode,
          userName: attempt.userName ?? current.userName,
        }
      }
    } else {
      merged.push(attempt)
    }
  }

  return assignAttemptNumbers(merged.sort((a, b) => b.at.localeCompare(a.at)))
}

export function getPackageDeliveredAt(pkg: Package): string | null {
  if (pkg.status !== 'delivered') return null
  return pkg.lastAttemptAt ?? pkg.updatedAt
}
