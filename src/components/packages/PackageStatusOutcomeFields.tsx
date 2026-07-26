import { DateField } from '@/components/ui/DateField'
import { FailureObservationFields } from '@/components/deliveries/FailureObservationFields'
import { PackageDeliveryPicker } from '@/components/packages/PackageDeliveryPicker'
import type { DeliveryAssignmentOption } from '@/utils/package-delivery-assignment'
import type { PackageStatus } from '@/types'
import { addDaysISODate } from '@/utils/date'

interface PackageStatusOutcomeFieldsProps {
  status: 'not_delivered' | 'rescheduled'
  deliveryOptions: DeliveryAssignmentOption[]
  selectedDeliveryId: string
  onSelectedDeliveryIdChange: (deliveryId: string) => void
  failureNotes: string
  onFailureNotesChange: (notes: string) => void
  rescheduleDate: string
  onRescheduleDateChange: (date: string) => void
}

export function PackageStatusOutcomeFields({
  status,
  deliveryOptions,
  selectedDeliveryId,
  onSelectedDeliveryIdChange,
  failureNotes,
  onFailureNotesChange,
  rescheduleDate,
  onRescheduleDateChange,
}: PackageStatusOutcomeFieldsProps) {
  return (
    <div className="mt-4 space-y-4 border-t border-border pt-4">
      <div>
        <p className="text-sm font-semibold text-text-primary">
          {status === 'rescheduled' ? '¿En qué reparto se intentó?' : '¿En qué reparto falló?'}
        </p>
        <p className="mt-1 text-xs text-text-secondary">
          {deliveryOptions.length > 0
            ? 'Se listan repartos en curso donde está este paquete.'
            : 'No está en un reparto en curso. Se registrará como corrección en mostrador.'}
        </p>
        {deliveryOptions.length > 0 ? (
          <div className="mt-3">
            <PackageDeliveryPicker
              options={deliveryOptions}
              selectedDeliveryId={selectedDeliveryId}
              onSelectedDeliveryIdChange={onSelectedDeliveryIdChange}
              emptyTitle="Sin reparto en curso"
              emptyMessage="No hay repartos en curso con este paquete."
              infoMessage={() =>
                status === 'rescheduled'
                  ? 'Al confirmar, se saca del reparto y queda reprogramado para la fecha elegida.'
                  : 'Al confirmar, queda marcado como no entregado en ese reparto.'
              }
            />
          </div>
        ) : null}
      </div>

      {status === 'rescheduled' ? (
        <DateField
          label="Nueva fecha de entrega"
          value={rescheduleDate}
          onChange={onRescheduleDateChange}
        />
      ) : null}

      <FailureObservationFields
        value={failureNotes}
        onChange={onFailureNotesChange}
        placeholder={
          status === 'rescheduled'
            ? 'Ej.: Cliente pidió entregar mañana por la tarde'
            : 'Ej.: No había nadie en el domicilio'
        }
      />
    </div>
  )
}

export function defaultRescheduleDate(): string {
  return addDaysISODate(1)
}

export function statusOutcomeRequiresDelivery(
  status: PackageStatus,
  deliveryOptions: DeliveryAssignmentOption[],
): boolean {
  return (
    (status === 'not_delivered' || status === 'rescheduled') && deliveryOptions.length > 0
  )
}
