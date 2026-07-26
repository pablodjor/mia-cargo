import { cn } from '@/utils/cn'
import logo from '@/assets/miacargo-logo.svg'

interface BrandLogoProps {
  collapsed?: boolean
  className?: string
}

export function BrandLogo({ collapsed = false, className }: BrandLogoProps) {
  if (collapsed) {
    return (
      <div className={cn('flex h-12 w-full items-center justify-center', className)}>
        <img src={logo} alt="Miacargo" className="h-8 w-auto max-w-[72px] object-contain" />
      </div>
    )
  }

  return (
    <div className={cn('flex w-full flex-col items-center text-center', className)}>
      <div className="flex h-14 w-full items-center justify-center px-2">
        <img src={logo} alt="Miacargo" className="h-10 w-full max-w-[220px] object-contain" />
      </div>
      <p className="mt-2 text-[11px] tracking-wide text-white/60">Logística interna</p>
    </div>
  )
}
