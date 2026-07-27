import { Box, StickyNote } from 'lucide-react'
import type { Package } from '@/types'
import { getPackageDisplayNotes } from '@/utils/package-timeline'
import { cn } from '@/utils/cn'

interface PackageExtraDetailsProps {
  pkg: Pick<Package, 'contents' | 'notes'>
  compact?: boolean
  className?: string
  hidden?: boolean
}

export function PackageExtraDetails({
  pkg,
  compact = false,
  className,
  hidden = false,
}: PackageExtraDetailsProps) {
  const contents = pkg.contents?.trim()
  const notes = getPackageDisplayNotes(pkg.notes)

  if (hidden || (!contents && !notes)) return null

  if (compact) {
    return (
      <div className={cn('space-y-1', className)}>
        {contents ? (
          <p className="flex items-start gap-1.5 text-xs leading-snug text-text-secondary">
            <Box className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-muted" />
            <span>
              <span className="font-medium text-text-muted">Contenido: </span>
              {contents}
            </span>
          </p>
        ) : null}
        {notes ? (
          <p className="flex items-start gap-1.5 text-xs leading-snug text-text-secondary">
            <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary" />
            <span>
              <span className="font-medium text-text-muted">Observaciones: </span>
              {notes}
            </span>
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'space-y-3 rounded-[12px] border border-border bg-surface/80 px-4 py-3',
        className,
      )}
    >
      {contents ? (
        <div>
          <p className="text-xs font-semibold tracking-wide text-text-muted uppercase">Contenido</p>
          <p className="mt-1 text-sm whitespace-pre-wrap text-text-primary">{contents}</p>
        </div>
      ) : null}
      {notes ? (
        <div>
          <p className="text-xs font-semibold tracking-wide text-text-muted uppercase">
            Observaciones
          </p>
          <p className="mt-1 text-sm whitespace-pre-wrap text-text-primary">{notes}</p>
        </div>
      ) : null}
    </div>
  )
}
