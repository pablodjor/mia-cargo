import { CheckCircle2, MapPin, Pencil } from 'lucide-react'
import { DestinationBadge } from '@/components/common/DestinationBadge'
import {
  PackageAddressExtrasFields,
  type PackageAddressExtrasValues,
} from '@/components/packages/PackageAddressExtrasFields'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import type { Person } from '@/types'
import { getDestinationLocationDefaults } from '@/utils/destination-location'
import { formatAddressExtrasSummary, formatAddressLine } from '@/utils/address-details'
import {
  CUSTOM_ADDRESS_KEY,
  type PersonAddressOption,
} from '@/utils/person-addresses'
import { cn } from '@/utils/cn'

interface PackageAddressValues {
  address: string
  city: string
  province: string
  postalCode: string
  destinationType: Person['destinationType']
}

interface PackagePersonAddressSectionProps {
  person: Person
  values: PackageAddressValues
  extras: PackageAddressExtrasValues
  savedAddresses: PersonAddressOption[]
  selectedAddressKey: string
  editorOpen: boolean
  destinationOptions: Array<{ value: string; label: string }>
  errors?: Partial<Record<keyof PackageAddressValues, string>>
  onSelectAddress: (key: string) => void
  onUseCustomAddress: () => void
  onEditorOpenChange: (open: boolean) => void
  onChange: (values: Partial<PackageAddressValues>) => void
  onExtrasChange: (values: Partial<PackageAddressExtrasValues>) => void
}

export function PackagePersonAddressSection({
  person,
  values,
  extras,
  savedAddresses,
  selectedAddressKey,
  editorOpen,
  destinationOptions,
  errors,
  onSelectAddress,
  onUseCustomAddress,
  onEditorOpenChange,
  onChange,
  onExtrasChange,
}: PackagePersonAddressSectionProps) {
  const isCustom = selectedAddressKey === CUSTOM_ADDRESS_KEY
  const selectedSummary = formatAddressLine({
    ...values,
    unit: extras.addressUnit,
    bell: extras.addressBell,
    placeType: extras.addressPlaceType,
  })
  const selectedExtrasSummary = formatAddressExtrasSummary({
    unit: extras.addressUnit,
    bell: extras.addressBell,
    placeType: extras.addressPlaceType,
  })

  const handleSelectAddress = (key: string) => {
    onSelectAddress(key)
    onEditorOpenChange(false)
  }

  return (
    <div className="space-y-3 rounded-[12px] border border-primary/20 bg-primary-light/25 p-4">
      <div>
        <p className="text-sm font-semibold text-text-primary">{person.name}</p>
        <p className="text-sm text-text-secondary">{person.phone}</p>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold tracking-wide text-text-muted uppercase">
          Elegí dirección de entrega
        </p>

        <div className="space-y-2">
          {savedAddresses.map((option) => {
            const selected = selectedAddressKey === option.key && !isCustom
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => handleSelectAddress(option.key)}
                className={cn(
                  'w-full rounded-[10px] border p-3 text-left transition',
                  selected
                    ? 'border-primary bg-surface shadow-sm ring-2 ring-primary/20'
                    : 'border-border bg-surface/70 hover:border-primary/40',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <Badge tone={option.source === 'default' ? 'primary' : 'neutral'}>
                        {option.source === 'default' ? 'Por defecto' : 'Guardada'}
                      </Badge>
                      <DestinationBadge destination={option.destinationType} />
                      {option.usageSummary ? (
                        <span className="text-[11px] text-text-muted">{option.usageSummary}</span>
                      ) : null}
                    </div>
                    <p className="text-sm font-medium text-text-primary">{option.formatted}</p>
                    {option.addressUnit || option.addressBell || option.addressPlaceType ? (
                      <p className="mt-1 text-xs text-text-secondary">
                        {formatAddressExtrasSummary({
                          unit: option.addressUnit,
                          bell: option.addressBell,
                          placeType: option.addressPlaceType,
                        })}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {selected ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          aria-label="Editar dirección"
                          onClick={(event) => {
                            event.stopPropagation()
                            onEditorOpenChange(true)
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden />
                      </>
                    ) : (
                      <span
                        className="mt-0.5 h-5 w-5 rounded-full border-2 border-border bg-surface"
                        aria-hidden
                      />
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {isCustom && !editorOpen ? (
          <div className="rounded-[10px] border border-warning/30 bg-warning-light/40 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <Badge tone="warning">Nueva dirección</Badge>
                  <DestinationBadge destination={values.destinationType} />
                </div>
                <p className="text-sm font-medium text-text-primary">{selectedSummary}</p>
                {selectedExtrasSummary ? (
                  <p className="mt-1 text-xs text-text-secondary">{selectedExtrasSummary}</p>
                ) : null}
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 w-8 shrink-0 p-0"
                aria-label="Editar dirección"
                onClick={() => onEditorOpenChange(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : null}

        <Button
          type="button"
          size="sm"
          variant="outline"
          className={cn('h-8', isCustom && 'border-warning/40 bg-warning-light/30')}
          onClick={onUseCustomAddress}
        >
          <MapPin className="h-3.5 w-3.5" />
          Cargar otra dirección
        </Button>

        {editorOpen ? (
          <div className="space-y-2 rounded-[10px] border border-border bg-surface p-3">
            <p className="text-xs font-semibold text-text-secondary">
              {isCustom ? 'Nueva dirección' : 'Editar dirección seleccionada'}
            </p>
            <Input
              label="Dirección"
              error={errors?.address}
              value={values.address}
              onChange={(event) => onChange({ address: event.target.value })}
            />
            <div className="grid gap-2 sm:grid-cols-3">
              <Input
                label="Localidad"
                error={errors?.city}
                value={values.city}
                onChange={(event) => onChange({ city: event.target.value })}
              />
              <Input
                label="Provincia"
                error={errors?.province}
                value={values.province}
                onChange={(event) => onChange({ province: event.target.value })}
              />
              <Input
                label="CP"
                error={errors?.postalCode}
                value={values.postalCode}
                onChange={(event) => onChange({ postalCode: event.target.value })}
              />
            </div>
            <Select
              label="Zona de destino"
              options={destinationOptions}
              value={values.destinationType}
              onChange={(event) => {
                const nextType = event.target.value as Person['destinationType']
                const defaults = getDestinationLocationDefaults(nextType, values.destinationType)
                onChange({ destinationType: nextType, ...defaults })
              }}
              error={errors?.destinationType}
            />
            <PackageAddressExtrasFields values={extras} onChange={onExtrasChange} />
            <div className="flex justify-end">
              <Button type="button" size="sm" variant="ghost" className="h-8" onClick={() => onEditorOpenChange(false)}>
                Listo
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export { personAddressMatches as packageAddressMatchesPerson } from '@/utils/person-addresses'
