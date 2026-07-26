import { Check, PackageCheck, Store, MoreHorizontal, Route } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useMemo } from 'react'
import { Textarea } from '@/components/ui/Textarea'
import { PackageDeliveryPicker } from '@/components/packages/PackageDeliveryPicker'
import type { Delivery, Driver, Package, PaymentStatus } from '@/types'
import {
  collectionDeskPaymentOptions,
  deliveryRoutePaymentOptions,
  PACKAGE_DESK_DELIVERY_OPTIONS,
  type PackageDeskDeliveryMethod,
} from '@/utils/payment-rules'
import { deliveryAssignmentOptionsForPackage } from '@/utils/package-delivery-assignment'
import { paymentIcon } from '@/utils/payment-display'
import { cn } from '@/utils/cn'

const DELIVERY_METHOD_ICONS: Record<PackageDeskDeliveryMethod, LucideIcon> = {
  delivery_route: Route,
  warehouse_pickup: PackageCheck,
  counter: Store,
  other: MoreHorizontal,
}

function OptionButton({
  selected,
  onSelect,
  icon: Icon,
  label,
  description,
}: {
  selected: boolean
  onSelect: () => void
  icon: LucideIcon
  label: string
  description: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-start gap-3 rounded-[12px] border-2 p-3 text-left transition',
        selected
          ? 'border-primary bg-primary-light/30 shadow-sm ring-2 ring-primary/20'
          : 'border-border bg-surface hover:border-primary/25 hover:bg-background',
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-light">
        <Icon className="h-4 w-4 text-secondary" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-text-primary">{label}</span>
          {selected ? <Check className="h-4 w-4 shrink-0 text-primary" /> : null}
        </span>
        <span className="mt-0.5 block text-xs leading-snug text-text-secondary">{description}</span>
      </span>
    </button>
  )
}

interface PackageDeliveredConfirmFieldsProps {
  pkg: Package
  deliveries: Delivery[]
  drivers: Driver[]
  deliveryMethod: PackageDeskDeliveryMethod
  onDeliveryMethodChange: (method: PackageDeskDeliveryMethod) => void
  selectedDeliveryId: string
  onSelectedDeliveryIdChange: (deliveryId: string) => void
  deliveryMethodNotes: string
  onDeliveryMethodNotesChange: (notes: string) => void
  paymentStatus: PaymentStatus
  onPaymentStatusChange: (status: PaymentStatus) => void
}

export function PackageDeliveredConfirmFields({
  pkg,
  deliveries,
  drivers,
  deliveryMethod,
  onDeliveryMethodChange,
  selectedDeliveryId,
  onSelectedDeliveryIdChange,
  deliveryMethodNotes,
  onDeliveryMethodNotesChange,
  paymentStatus,
  onPaymentStatusChange,
}: PackageDeliveredConfirmFieldsProps) {
  const deliveryOptions = useMemo(
    () => deliveryAssignmentOptionsForPackage(pkg, deliveries, drivers),
    [pkg, deliveries, drivers],
  )

  const paymentOptions =
    deliveryMethod === 'delivery_route'
      ? deliveryRoutePaymentOptions(pkg, deliveries, selectedDeliveryId || undefined)
      : collectionDeskPaymentOptions(pkg, deliveries)

  return (
    <div className="mt-4 space-y-5 border-t border-border pt-4">
      <div>
        <p className="text-sm font-semibold text-text-primary">¿Cómo se entregó?</p>
        <p className="mt-1 text-xs text-text-secondary">
          Elegí la forma en que el cliente recibió el paquete.
        </p>
        <div className="mt-3 space-y-2">
          {PACKAGE_DESK_DELIVERY_OPTIONS.map((option) => (
            <OptionButton
              key={option.value}
              selected={deliveryMethod === option.value}
              onSelect={() => onDeliveryMethodChange(option.value)}
              icon={DELIVERY_METHOD_ICONS[option.value]}
              label={option.label}
              description={option.description}
            />
          ))}
        </div>
        {deliveryMethod === 'delivery_route' ? (
          <div className="mt-3">
            <PackageDeliveryPicker
              options={deliveryOptions}
              selectedDeliveryId={selectedDeliveryId}
              onSelectedDeliveryIdChange={onSelectedDeliveryIdChange}
              emptyMessage="No hay repartos activos donde se pueda agregar este paquete. Creá un reparto o elegí otra forma de entrega."
              infoMessage={(option) =>
                option?.alreadyAssigned
                  ? 'El paquete ya está en este reparto. Solo se registrará la entrega y el cobro.'
                  : 'Al confirmar, el paquete se suma al reparto elegido y queda entregado.'
              }
            />
          </div>
        ) : null}
        {deliveryMethod === 'other' ? (
          <div className="mt-3">
            <Textarea
              label="Describí cómo se entregó"
              placeholder="Ej.: Lo retiró un familiar, entrega en edificio de al lado, etc."
              value={deliveryMethodNotes}
              onChange={(event) => onDeliveryMethodNotesChange(event.target.value)}
              rows={3}
            />
          </div>
        ) : null}
      </div>

      <div>
        <p className="text-sm font-semibold text-text-primary">¿Cómo quedó el cobro?</p>
        <p className="mt-1 text-xs text-text-secondary">
          Si pagó en el momento, elegí <strong className="text-text-primary">Pagado</strong>.
        </p>
        <div className="mt-3 space-y-2">
          {paymentOptions.map((option) => {
            const Icon = paymentIcon(option.value)
            return (
              <OptionButton
                key={option.value}
                selected={paymentStatus === option.value}
                onSelect={() => onPaymentStatusChange(option.value)}
                icon={Icon}
                label={option.label}
                description={option.description}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
