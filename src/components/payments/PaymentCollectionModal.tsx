import { Check, CheckCircle2, PackageCheck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { PaymentSummaryPanel } from '@/components/common/PackagePaymentInfo'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Modal } from '@/components/ui/Modal'
import { packagesService } from '@/services/packages.service'
import type { Delivery, Package, PaymentStatus } from '@/types'
import { formatArs, formatUsd } from '@/utils/money'
import { paymentIcon } from '@/utils/payment-display'
import {
  canRegisterWarehousePickup,
  collectionDeskPaymentOptions,
  isCourierPackage,
  isOnActiveDeliveryRoute,
  type CollectionDeskPaymentOption,
} from '@/utils/payment-rules'
import { cn } from '@/utils/cn'

function PaymentOptionButton({
  option,
  selected,
  onSelect,
}: {
  option: CollectionDeskPaymentOption
  selected: boolean
  onSelect: () => void
}) {
  const Icon = paymentIcon(option.value)

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
          <span className="text-sm font-semibold text-text-primary">{option.label}</span>
          {selected ? <Check className="h-4 w-4 shrink-0 text-primary" /> : null}
        </span>
        <span className="mt-0.5 block text-xs leading-snug text-text-secondary">
          {option.description}
        </span>
      </span>
    </button>
  )
}

export type PaymentCollectionMode = 'collect' | 'pickup' | 'change'

interface PaymentCollectionModalProps {
  open: boolean
  onClose: () => void
  pkg: Package | null
  deliveries: Delivery[]
  mode?: PaymentCollectionMode
  onSaved: () => void
}

export function PaymentCollectionModal({
  open,
  onClose,
  pkg,
  deliveries,
  mode = 'change',
  onSaved,
}: PaymentCollectionModalProps) {
  const [selectedPayment, setSelectedPayment] = useState<PaymentStatus>('paid')
  const [registerPickup, setRegisterPickup] = useState(false)
  const [saving, setSaving] = useState(false)

  const options = useMemo(
    () => (pkg ? collectionDeskPaymentOptions(pkg, deliveries) : []),
    [pkg, deliveries],
  )

  const pickupAvailable = pkg ? canRegisterWarehousePickup(pkg) : false
  const onActiveRoute = pkg ? isOnActiveDeliveryRoute(pkg, deliveries) : false
  const isCourier = pkg ? isCourierPackage(pkg, deliveries) : false

  useEffect(() => {
    if (!open || !pkg) return
    const allowed = collectionDeskPaymentOptions(pkg, deliveries).map((item) => item.value)
    const defaultPayment =
      mode === 'collect'
        ? allowed.includes('paid')
          ? 'paid'
          : allowed[0] ?? pkg.paymentStatus
        : pkg.paymentStatus
    setSelectedPayment(allowed.includes(defaultPayment) ? defaultPayment : allowed[0] ?? 'paid')
    setRegisterPickup(
      pickupAvailable && (mode === 'pickup' || mode === 'collect'),
    )
  }, [open, pkg, deliveries, mode, pickupAvailable])

  const shouldRegisterPickup =
    pickupAvailable && (mode === 'pickup' || registerPickup)

  const handleSave = async () => {
    if (!pkg) return
    setSaving(true)
    try {
      if (shouldRegisterPickup) {
        await packagesService.registerWarehousePickup(pkg.id, selectedPayment, {
          method: mode === 'pickup' ? 'warehouse_pickup' : 'warehouse_pickup',
        })
        toast.success('Retiro y cobro registrados')
      } else if (selectedPayment !== pkg.paymentStatus) {
        await packagesService.updatePaymentStatus(pkg.id, selectedPayment)
        toast.success('Forma de pago actualizada')
      } else {
        toast.info('No hubo cambios')
        onClose()
        return
      }
      onSaved()
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo registrar el cobro')
    } finally {
      setSaving(false)
    }
  }

  const title =
    mode === 'pickup' || shouldRegisterPickup
      ? 'Retiro en depósito'
      : mode === 'collect'
        ? 'Registrar cobro'
        : 'Cambiar forma de pago'

  const confirmLabel =
    shouldRegisterPickup ? 'Confirmar retiro y cobro' : 'Guardar cobro'

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={title}
      description={pkg ? `${pkg.shCode} · ${pkg.ownerName}` : undefined}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" className="w-full sm:w-auto" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button className="w-full sm:w-auto" onClick={() => void handleSave()} disabled={saving || !pkg}>
            <CheckCircle2 className="h-4 w-4" />
            {confirmLabel}
          </Button>
        </div>
      }
    >
      {pkg ? (
        <div className="space-y-5">
          <div className="flex items-center gap-2 rounded-[10px] bg-secondary-light/60 px-3 py-2 text-sm text-secondary">
            <PackageCheck className="h-4 w-4 shrink-0" />
            <span>
              Total:{' '}
              <strong className="text-text-primary">
                {pkg.paymentStatus === 'usd_cash' ? formatUsd(pkg.totalUsd) : formatArs(pkg.totalArs)}
              </strong>
              {pkg.paymentStatus !== 'usd_cash' ? (
                <span className="text-text-muted"> · ref. {formatUsd(pkg.totalUsd)}</span>
              ) : null}
            </span>
          </div>

          <PaymentSummaryPanel
            status={pkg.paymentStatus}
            amount={pkg.totalArs}
            amountUsd={pkg.totalUsd}
            actionLabel="Estado actual"
          />

          {pickupAvailable && mode !== 'pickup' ? (
            <div className="rounded-[10px] border border-border bg-background px-3 py-3">
              <Checkbox
                label="Cliente retiró el paquete en depósito"
                checked={registerPickup}
                onChange={(event) => setRegisterPickup(event.target.checked)}
              />
              <p className="mt-2 text-xs text-text-secondary">
                Marcá esta opción si el cliente vino a buscar el paquete. Se registrará como entregado
                y quedará el cobro que elijas abajo.
              </p>
            </div>
          ) : pickupAvailable && mode === 'pickup' ? (
            <p className="rounded-[10px] border border-success/30 bg-success-light/40 px-3 py-2 text-xs text-text-secondary">
              Se registrará como <strong className="text-text-primary">entregado</strong> al confirmar
              el retiro en depósito.
            </p>
          ) : onActiveRoute ? (
            <p className="rounded-[10px] border border-warning/30 bg-warning-light/40 px-3 py-2 text-xs text-text-secondary">
              Este paquete está en ruta. Para entregarlo usá el flujo del reparto activo.
            </p>
          ) : null}

          <div>
            <p className="text-sm font-semibold text-text-primary">
              {shouldRegisterPickup
                ? '¿Cómo quedó el cobro?'
                : isCourier
                  ? '¿Cómo quedó el pago?'
                  : '¿Cómo quedó el cobro?'}
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              {mode === 'collect' || selectedPayment === 'paid'
                ? 'Si el cliente pagó en el mostrador, elegí Pagado.'
                : 'Elegí la forma de pago que corresponda.'}
            </p>
            <div className="mt-3 space-y-2">
              {options.map((option) => (
                <PaymentOptionButton
                  key={option.value}
                  option={option}
                  selected={selectedPayment === option.value}
                  onSelect={() => setSelectedPayment(option.value)}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  )
}
