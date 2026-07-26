import { PackageX } from 'lucide-react'
import { formatDateTime } from '@/utils/date'

interface DeliveryStopFailureSummaryProps {
  notes?: string
  attemptedAt?: string
  fallback?: string
}

export function DeliveryStopFailureSummary({
  notes,
  attemptedAt,
  fallback = 'Sin detalle registrado',
}: DeliveryStopFailureSummaryProps) {
  return (
    <div className="max-w-lg rounded-[10px] border border-danger/25 bg-danger-light/50 px-3 py-2 text-sm">
      <p className="flex items-start gap-1.5 font-semibold text-danger">
        <PackageX className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{notes?.trim() || fallback}</span>
      </p>
      {attemptedAt ? (
        <p className="mt-1 text-xs text-text-muted">Registrado: {formatDateTime(attemptedAt)}</p>
      ) : null}
    </div>
  )
}
