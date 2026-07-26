import { ScanBarcode } from 'lucide-react'
import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

interface ScannerInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export const ScannerInput = forwardRef<HTMLInputElement, ScannerInputProps>(
  ({ className, label = 'Escaneá o ingresá el código SH', ...props }, ref) => {
    return (
      <div className="w-full">
        <p className="mb-3 text-center text-sm font-medium text-text-secondary">{label}</p>
        <div className="relative">
          <ScanBarcode className="pointer-events-none absolute top-1/2 left-4 h-6 w-6 -translate-y-1/2 text-primary" />
          <input
            ref={ref}
            className={cn(
              'h-16 w-full rounded-[14px] border-2 border-primary/30 bg-surface pr-4 pl-14 font-mono text-xl font-semibold tracking-wide outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15',
              className,
            )}
            {...props}
          />
        </div>
      </div>
    )
  },
)

ScannerInput.displayName = 'ScannerInput'
