import { StickyNote } from 'lucide-react'
import { cn } from '@/utils/cn'

interface PackageDeliveryNoteProps {
  note: string
  compact?: boolean
  className?: string
}

export function PackageDeliveryNote({ note, compact = false, className }: PackageDeliveryNoteProps) {
  if (compact) {
    return (
      <p
        className={cn(
          'mt-1.5 flex items-start gap-1.5 text-xs leading-snug text-text-secondary',
          className,
        )}
      >
        <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary" />
        <span className="line-clamp-2">{note}</span>
      </p>
    )
  }

  return (
    <div
      className={cn(
        'flex gap-3 rounded-[12px] border border-secondary/15 bg-secondary-light/50 p-3',
        className,
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-secondary shadow-sm ring-1 ring-secondary/10">
        <StickyNote className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold tracking-wide text-secondary uppercase">
          Indicación de entrega
        </p>
        <p className="mt-1 text-sm font-medium leading-snug text-text-primary">{note}</p>
      </div>
    </div>
  )
}
