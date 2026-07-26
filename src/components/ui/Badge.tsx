import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface BadgeProps {
  children: ReactNode
  className?: string
  tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
}

const tones: Record<NonNullable<BadgeProps['tone']>, string> = {
  neutral: 'bg-secondary-light text-secondary',
  primary: 'bg-primary-light text-primary-hover',
  success: 'bg-success-light text-success',
  warning: 'bg-warning-light text-warning',
  danger: 'bg-danger-light text-danger',
  info: 'bg-info-light text-info',
  purple: 'bg-purple-light text-purple',
}

export function Badge({ children, className, tone = 'neutral' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
