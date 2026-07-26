import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface AlertProps {
  title?: string
  children?: ReactNode
  tone?: 'info' | 'success' | 'warning' | 'danger'
}

const config = {
  info: { icon: Info, className: 'border-info/20 bg-info-light text-info' },
  success: { icon: CheckCircle2, className: 'border-success/20 bg-success-light text-success' },
  warning: { icon: TriangleAlert, className: 'border-warning/20 bg-warning-light text-warning' },
  danger: { icon: AlertCircle, className: 'border-danger/20 bg-danger-light text-danger' },
}

export function Alert({ title, children, tone = 'info' }: AlertProps) {
  const { icon: Icon, className } = config[tone]
  return (
    <div className={cn('flex gap-3 rounded-[12px] border px-4 py-3', className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        {title ? <p className="text-sm font-semibold">{title}</p> : null}
        {children ? <div className={cn('text-sm opacity-90', title && 'mt-1')}>{children}</div> : null}
      </div>
    </div>
  )
}
