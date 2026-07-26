import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import type { AddressPlaceType } from '@/types'
import { ADDRESS_PLACE_TYPE_OPTIONS } from '@/utils/address-details'

export interface PackageAddressExtrasValues {
  addressUnit?: string
  addressBell?: string
  addressPlaceType?: AddressPlaceType | ''
}

interface PackageAddressExtrasFieldsProps {
  values: PackageAddressExtrasValues
  onChange: (values: Partial<PackageAddressExtrasValues>) => void
}

export function PackageAddressExtrasFields({ values, onChange }: PackageAddressExtrasFieldsProps) {
  return (
    <div className="space-y-3 rounded-[10px] border border-border bg-surface p-3">
      <div>
        <p className="text-xs font-semibold tracking-wide text-text-muted uppercase">
          Detalles de entrega
        </p>
        <p className="mt-0.5 text-xs text-text-secondary">
          Opcional: departamento, timbre o si es casa/trabajo.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Input
          label="Depto / Piso"
          placeholder="Ej: 4 B"
          value={values.addressUnit ?? ''}
          onChange={(event) => onChange({ addressUnit: event.target.value })}
        />
        <Input
          label="Timbre"
          placeholder="Ej: 1234"
          value={values.addressBell ?? ''}
          onChange={(event) => onChange({ addressBell: event.target.value })}
        />
        <Select
          label="Tipo de lugar"
          placeholder="Seleccionar"
          options={ADDRESS_PLACE_TYPE_OPTIONS}
          value={values.addressPlaceType ?? ''}
          onChange={(event) =>
            onChange({ addressPlaceType: (event.target.value || '') as AddressPlaceType | '' })
          }
        />
      </div>
    </div>
  )
}
