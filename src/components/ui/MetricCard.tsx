import { BarChart3, type LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Card } from './Card'

interface MetricCardProps {
  title?: string
  label?: string
  value: string | number
  hint?: string
  icon?: LucideIcon
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'secondary'
}

const tones = {
  primary: 'bg-primary-light text-primary',
  success: 'bg-success-light text-success',
  warning: 'bg-warning-light text-warning',
  danger: 'bg-danger-light text-danger',
  info: 'bg-info-light text-info',
  secondary: 'bg-secondary-light text-secondary',
}

export function MetricCard({ title, label, value, hint, icon: Icon = BarChart3, tone = 'primary' }: MetricCardProps) {
  return (
    <Card className="animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-text-secondary">{title ?? label}</p>
          <p className="mt-2 text-2xl font-bold text-text-primary">{value}</p>
          {hint ? <p className="mt-1 text-xs text-text-muted">{hint}</p> : null}
        </div>
        <div className={cn('rounded-[12px] p-2.5', tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  )
}
