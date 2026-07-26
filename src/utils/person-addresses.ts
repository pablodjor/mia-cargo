import type { AddressPlaceType, DestinationType, Package, Person } from '@/types'
import { formatAddressLine } from '@/utils/address-details'
import { getPackagesForPerson } from '@/utils/person-stats'

export const PERSON_DEFAULT_ADDRESS_KEY = 'person-default'
export const CUSTOM_ADDRESS_KEY = 'custom'

export type PersonAddressOptionSource = 'default' | 'saved'

export interface PersonAddressBase {
  address: string
  city: string
  province: string
  postalCode: string
  destinationType: DestinationType
}

export interface PersonAddressOption extends PersonAddressBase {
  key: string
  source: PersonAddressOptionSource
  label: string
  formatted: string
  packageCount: number
  shCodes: string[]
  usageSummary?: string
  lastUsedAt?: string
  addressUnit?: string
  addressBell?: string
  addressPlaceType?: AddressPlaceType
}

export function personAddressKey(values: PersonAddressBase): string {
  return [values.address, values.city, values.province, values.postalCode, values.destinationType]
    .map((value) => value.trim().toLowerCase())
    .join('|')
}

export function personAddressMatches(
  left: PersonAddressBase,
  right: PersonAddressBase,
): boolean {
  return personAddressKey(left) === personAddressKey(right)
}

function toAddressBase(
  source: Person | Package | PersonAddressBase,
): PersonAddressBase {
  return {
    address: source.address,
    city: source.city,
    province: source.province,
    postalCode: source.postalCode,
    destinationType: source.destinationType,
  }
}

function buildSavedLabel(shCodes: string[], packageCount: number): string {
  if (packageCount <= 0) return 'Guardada en paquetes'
  if (shCodes.length === 1) return `Usada en ${shCodes[0]}`
  if (shCodes.length === 2) return `Usada en ${shCodes[0]} y ${shCodes[1]}`
  return `Usada en ${packageCount} paquetes`
}

export function getPersonAddressOptions(
  person: Person,
  packages: Package[],
  excludePackageId?: string,
): PersonAddressOption[] {
  const defaultBase = toAddressBase(person)
  const defaultKey = personAddressKey(defaultBase)

  const defaultOption: PersonAddressOption = {
    key: PERSON_DEFAULT_ADDRESS_KEY,
    source: 'default',
    label: 'Por defecto',
    ...defaultBase,
    formatted: formatAddressLine({
      ...defaultBase,
      unit: person.addressUnit,
      bell: person.addressBell,
      placeType: person.addressPlaceType,
    }),
    packageCount: 0,
    shCodes: [],
    addressUnit: person.addressUnit,
    addressBell: person.addressBell,
    addressPlaceType: person.addressPlaceType,
  }

  const savedByKey = new Map<string, PersonAddressOption>()

  const personPackages = getPackagesForPerson(person, packages)
    .filter((pkg) => pkg.id !== excludePackageId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  for (const pkg of personPackages) {
    const base = toAddressBase(pkg)
    const key = personAddressKey(base)

    if (key === defaultKey) {
      defaultOption.packageCount += 1
      defaultOption.shCodes.push(pkg.shCode)
      if (!defaultOption.lastUsedAt || pkg.updatedAt.localeCompare(defaultOption.lastUsedAt) > 0) {
        defaultOption.lastUsedAt = pkg.updatedAt
        defaultOption.addressUnit = pkg.addressUnit
        defaultOption.addressBell = pkg.addressBell
        defaultOption.addressPlaceType = pkg.addressPlaceType
      }
      continue
    }

    const existing = savedByKey.get(key)
    if (existing) {
      existing.packageCount += 1
      existing.shCodes.push(pkg.shCode)
      if (!existing.lastUsedAt || pkg.updatedAt.localeCompare(existing.lastUsedAt) > 0) {
        existing.lastUsedAt = pkg.updatedAt
        existing.addressUnit = pkg.addressUnit
        existing.addressBell = pkg.addressBell
        existing.addressPlaceType = pkg.addressPlaceType
      }
      continue
    }

    savedByKey.set(key, {
      key: `saved-${key}`,
      source: 'saved',
      label: buildSavedLabel([pkg.shCode], 1),
      ...base,
      formatted: formatAddressLine(base),
      packageCount: 1,
      shCodes: [pkg.shCode],
      lastUsedAt: pkg.updatedAt,
      addressUnit: pkg.addressUnit,
      addressBell: pkg.addressBell,
      addressPlaceType: pkg.addressPlaceType,
    })
  }

  if (defaultOption.packageCount > 0) {
    defaultOption.usageSummary = buildSavedLabel(defaultOption.shCodes, defaultOption.packageCount)
  }

  for (const option of savedByKey.values()) {
    if (option.packageCount > 0) {
      option.usageSummary = buildSavedLabel(option.shCodes, option.packageCount)
    }
  }

  const savedOptions = Array.from(savedByKey.values()).sort((a, b) =>
    (b.lastUsedAt ?? '').localeCompare(a.lastUsedAt ?? ''),
  )

  return [defaultOption, ...savedOptions]
}

export function resolvePersonAddressKey(
  person: Person,
  values: PersonAddressBase,
  options: PersonAddressOption[],
): string {
  const match = options.find((option) => personAddressMatches(option, values))
  if (match) return match.key
  if (personAddressMatches(person, values)) return PERSON_DEFAULT_ADDRESS_KEY
  return CUSTOM_ADDRESS_KEY
}

export function findPersonAddressOption(
  options: PersonAddressOption[],
  key: string,
): PersonAddressOption | undefined {
  return options.find((option) => option.key === key)
}

export function applyPersonAddressOption(option: PersonAddressOption): {
  address: string
  city: string
  province: string
  postalCode: string
  destinationType: DestinationType
  addressUnit: string
  addressBell: string
  addressPlaceType?: AddressPlaceType
} {
  return {
    address: option.address,
    city: option.city,
    province: option.province,
    postalCode: option.postalCode,
    destinationType: option.destinationType,
    addressUnit: option.addressUnit ?? '',
    addressBell: option.addressBell ?? '',
    addressPlaceType: option.addressPlaceType,
  }
}
