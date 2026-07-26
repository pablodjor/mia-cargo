import { Search } from 'lucide-react'
import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <div className={cn('relative w-full', className)}>
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          ref={ref}
          className="h-10 w-full rounded-[10px] border border-border bg-surface pr-3 pl-9 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          {...props}
        />
      </div>
    )
  },
)

SearchInput.displayName = 'SearchInput'
