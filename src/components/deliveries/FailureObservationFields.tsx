import { PredefinedObservationBadges } from '@/components/driver/PredefinedObservationBadges'
import { Textarea } from '@/components/ui/Textarea'

interface FailureObservationFieldsProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: string
  compact?: boolean
}

export function FailureObservationFields({
  value,
  onChange,
  placeholder = 'Tocá una observación rápida o escribí acá',
  error,
  compact = false,
}: FailureObservationFieldsProps) {
  return (
    <div className="space-y-3">
      <PredefinedObservationBadges value={value} onSelect={onChange} />
      <Textarea
        label="Observación"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        error={error}
        rows={compact ? 2 : 3}
        className={compact ? 'min-h-16' : undefined}
      />
    </div>
  )
}
