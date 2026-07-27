import { useMemo } from 'react'
import { PackageTimelineItem } from '@/components/packages/PackageTimelineItem'
import { useAsyncData } from '@/hooks/useAsyncData'
import { historyService } from '@/services/history.service'
import { settingsService } from '@/services/settings.service'
import type { Package } from '@/types'
import { buildPackageTimeline } from '@/utils/package-timeline'
import { cn } from '@/utils/cn'

interface PackageDeliveryAttemptsListProps {
  pkg: Package
  className?: string
  title?: string
  reasonById?: Map<string, string>
}

export function PackageDeliveryAttemptsList({
  pkg,
  className,
  title = 'Intentos de entrega',
  reasonById: reasonByIdProp,
}: PackageDeliveryAttemptsListProps) {
  const { data: failureReasons = [] } = useAsyncData(
    () => (reasonByIdProp ? Promise.resolve([]) : settingsService.getFailureReasons()),
    [reasonByIdProp],
  )
  const { data: history = [] } = useAsyncData(() => historyService.getAll(), [])

  const reasonById = useMemo(() => {
    if (reasonByIdProp) return reasonByIdProp
    return new Map((failureReasons ?? []).map((reason) => [reason.id, reason.label]))
  }, [reasonByIdProp, failureReasons])

  const attempts = useMemo(() => {
    return buildPackageTimeline(pkg, history ?? [], reasonById).filter((event) => event.attemptNumber)
  }, [pkg, history, reasonById])

  if (attempts.length === 0) return null

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      <ol className="m-0 list-none space-y-3 p-0">
        {attempts.map((event, index) => (
          <PackageTimelineItem
            key={event.id}
            event={event}
            isLast={index === attempts.length - 1}
            currentStatus={pkg.status}
          />
        ))}
      </ol>
    </div>
  )
}
