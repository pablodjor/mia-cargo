import { Alert } from '@/components/ui/Alert'
import { Select } from '@/components/ui/Select'
import type { DeliveryAssignmentOption } from '@/utils/package-delivery-assignment'

interface PackageDeliveryPickerProps {
  options: DeliveryAssignmentOption[]
  selectedDeliveryId: string
  onSelectedDeliveryIdChange: (deliveryId: string) => void
  emptyTitle?: string
  emptyMessage?: string
  infoMessage?: (option: DeliveryAssignmentOption | undefined) => string
}

export function PackageDeliveryPicker({
  options,
  selectedDeliveryId,
  onSelectedDeliveryIdChange,
  emptyTitle = 'Sin repartos disponibles',
  emptyMessage = 'No hay repartos activos donde se pueda agregar este paquete.',
  infoMessage,
}: PackageDeliveryPickerProps) {
  const selectedOption = options.find((item) => item.deliveryId === selectedDeliveryId)

  if (options.length === 0) {
    return (
      <Alert title={emptyTitle} tone="warning">
        {emptyMessage}
      </Alert>
    )
  }

  return (
    <div className="space-y-3">
      <Select
        label="Reparto"
        options={options.map((item) => ({
          value: item.deliveryId,
          label: item.label,
        }))}
        value={selectedDeliveryId}
        onChange={(event) => onSelectedDeliveryIdChange(event.target.value)}
      />
      {selectedOption ? (
        <p className="text-xs text-text-secondary">{selectedOption.hint}</p>
      ) : null}
      {infoMessage ? (
        <Alert title="Asignación" tone="info">
          {infoMessage(selectedOption)}
        </Alert>
      ) : null}
    </div>
  )
}
