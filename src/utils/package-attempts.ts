import type { Package, PackageFailedAttempt } from '@/types'
import { createId } from '@/utils/id'

export function appendPackageFailedAttempt(
  pkg: Package,
  input: Omit<PackageFailedAttempt, 'id' | 'attemptedAt'> & { attemptedAt?: string },
): PackageFailedAttempt[] {
  const attempt: PackageFailedAttempt = {
    id: createId('attempt'),
    attemptedAt: input.attemptedAt ?? new Date().toISOString(),
    outcome: input.outcome,
    failureReasonId: input.failureReasonId,
    failureNotes: input.failureNotes,
    userName: input.userName,
    deliveryCode: input.deliveryCode,
  }
  return [attempt, ...(pkg.failedAttempts ?? [])]
}

export function migratePackageFailedAttempts(pkg: Package): PackageFailedAttempt[] {
  if (pkg.failedAttempts?.length) return pkg.failedAttempts

  if (
    pkg.lastAttemptAt &&
    (pkg.failureNotes || pkg.failureReasonId) &&
    (pkg.status === 'not_delivered' || pkg.status === 'rescheduled')
  ) {
    return [
      {
        id: `attempt_legacy_${pkg.id}`,
        attemptedAt: pkg.lastAttemptAt,
        outcome: pkg.status === 'rescheduled' ? 'rescheduled' : 'not_delivered',
        failureReasonId: pkg.failureReasonId,
        failureNotes: pkg.failureNotes,
      },
    ]
  }

  return []
}

export function getPackageFailedAttempts(pkg: Package): PackageFailedAttempt[] {
  return migratePackageFailedAttempts(pkg)
}

export function resolveAttemptReason(
  attempt: PackageFailedAttempt,
  reasonById: Map<string, string>,
): string {
  if (attempt.failureNotes?.trim()) return attempt.failureNotes.trim()
  if (attempt.failureReasonId) {
    return reasonById.get(attempt.failureReasonId) ?? 'Sin detalle registrado'
  }
  return 'Sin detalle registrado'
}
