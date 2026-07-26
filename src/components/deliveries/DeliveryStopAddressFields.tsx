import { CheckCircle2, MapPin, Pencil, RotateCcw } from 'lucide-react'
import {
  PackageAddressExtrasFields,
  type PackageAddressExtrasValues,
} from '@/components/packages/PackageAddressExtrasFields'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { DeliveryAddressOverride, Package } from '@/types'
import { formatAddressExtrasSummary, formatAddressLine } from '@/utils/address-details'
import { formatPackageAddress, isCompleteDeliveryAddress } from '@/utils/delivery-address'
import { cn } from '@/utils/cn'

interface DeliveryStopAddressFieldsProps {
  pkg: Package
  value?: DeliveryAddressOverride
  open: boolean
  locked: boolean
  showPackageDefault?: boolean
  onOpenChange: (open: boolean) => void
  onLockedChange: (locked: boolean) => void
  onChange: (value: DeliveryAddressOverride | undefined) => void
}

function toExtras(value?: DeliveryAddressOverride): PackageAddressExtrasValues {
  return {
    addressUnit: value?.unit ?? '',
    addressBell: value?.bell ?? '',
    addressPlaceType: value?.placeType ?? '',
  }
}

function mergeExtras(
  value: DeliveryAddressOverride | undefined,
  extras: Partial<PackageAddressExtrasValues>,
): DeliveryAddressOverride | undefined {
  if (!value) return value
  return {
    ...value,
    unit: extras.addressUnit?.trim() || undefined,
    bell: extras.addressBell?.trim() || undefined,
    placeType: extras.addressPlaceType || undefined,
  }
}

export function DeliveryStopAddressFields({
  pkg,
  value,
  open,
  locked,
  showPackageDefault = true,
  onOpenChange,
  onLockedChange,
  onChange,
}: DeliveryStopAddressFieldsProps) {
  const defaultAddress = formatPackageAddress(pkg)
  const hasOverride = Boolean(value)
  const deliveryPreview = value ? formatAddressLine(value) : ''
  const extrasSummary = value
    ? formatAddressExtrasSummary({
        unit: value.unit,
        bell: value.bell,
        placeType: value.placeType,
      })
    : ''

  const showEditor = open
  const showLockedOverride = hasOverride && locked && !showEditor

  const patchOverride = (patch: Partial<DeliveryAddressOverride>) => {
    onChange({
      address: patch.address ?? value?.address ?? '',
      city: patch.city ?? value?.city ?? pkg.city,
      province: patch.province ?? value?.province ?? pkg.province,
      postalCode: patch.postalCode ?? value?.postalCode ?? pkg.postalCode,
      unit: patch.unit ?? value?.unit,
      bell: patch.bell ?? value?.bell,
      placeType: patch.placeType ?? value?.placeType,
    })
  }

  const confirmOverride = () => {
    if (!isCompleteDeliveryAddress(value)) return
    onLockedChange(true)
    onOpenChange(false)
  }

  const usePackageAddress = () => {
    onChange(undefined)
    onLockedChange(false)
    onOpenChange(false)
  }

  const startAlternateAddress = () => {
    onLockedChange(false)
    onOpenChange(true)
    if (!value) {
      onChange({
        address: '',
        city: pkg.city,
        province: pkg.province,
        postalCode: pkg.postalCode,
      })
    }
  }

  return (
    <div className="mt-2 space-y-2 border-t border-border/80 pt-2">
      {showPackageDefault ? (
        <div className="space-y-1">
          <p className="text-[11px] font-semibold tracking-wide text-text-muted uppercase">
            Dirección del paquete
          </p>
          <p className="text-xs text-text-secondary">{defaultAddress}</p>
        </div>
      ) : null}

      {showLockedOverride ? (
        <div
          className={cn(
            showPackageDefault
              ? 'rounded-[8px] border border-warning/30 bg-warning-light/40 px-2.5 py-2'
              : 'flex items-center gap-2',
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            {showPackageDefault ? <Badge tone="warning">Entrega en otra dirección</Badge> : null}
            {showPackageDefault ? <CheckCircle2 className="h-4 w-4 text-success" aria-hidden /> : null}
            <Button
              type="button"
              size="sm"
              variant={showPackageDefault ? 'ghost' : 'outline'}
              className={showPackageDefault ? 'h-7 px-2' : 'h-8'}
              onClick={() => {
                onLockedChange(false)
                onOpenChange(true)
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
              Cambiar dirección
            </Button>
          </div>
          {showPackageDefault ? (
            <>
              <p className="mt-1 text-xs font-medium text-text-primary">{deliveryPreview}</p>
              {extrasSummary ? (
                <p className="mt-1 text-[11px] text-text-secondary">{extrasSummary}</p>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}

      {!showEditor && !hasOverride ? (
        <Button type="button" size="sm" variant="outline" className="h-8" onClick={startAlternateAddress}>
          <MapPin className="h-3.5 w-3.5" />
          Entregar en otra dirección
        </Button>
      ) : null}

      {showEditor ? (
        <div className={cn('space-y-2 rounded-[8px] border border-warning/25 bg-warning-light/20 p-2.5')}>
          <p className="text-xs font-semibold text-warning">Completar dirección de entrega</p>
          <Input
            label="Dirección"
            value={value?.address ?? ''}
            onChange={(event) => patchOverride({ address: event.target.value })}
          />
          <div className="grid gap-2 sm:grid-cols-3">
            <Input
              label="Localidad"
              value={value?.city ?? ''}
              onChange={(event) => patchOverride({ city: event.target.value })}
            />
            <Input
              label="Provincia"
              value={value?.province ?? ''}
              onChange={(event) => patchOverride({ province: event.target.value })}
            />
            <Input
              label="CP"
              value={value?.postalCode ?? ''}
              onChange={(event) => patchOverride({ postalCode: event.target.value })}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="ghost" className="h-8" onClick={usePackageAddress}>
              <RotateCcw className="h-3.5 w-3.5" />
              Usar dirección del paquete
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8"
              disabled={!isCompleteDeliveryAddress(value)}
              onClick={confirmOverride}
            >
              Listo
            </Button>
          </div>
        </div>
      ) : null}

      {showLockedOverride ? (
        <PackageAddressExtrasFields
          values={toExtras(value)}
          onChange={(extras) => onChange(mergeExtras(value, extras))}
        />
      ) : null}
    </div>
  )
}
