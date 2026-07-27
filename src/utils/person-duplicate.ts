import type { Person } from '@/types'
import { formatFullName } from '@/utils/person-name'

type PersonDuplicateInput = Pick<
  Person,
  | 'firstName'
  | 'lastName'
  | 'phone'
  | 'address'
  | 'city'
  | 'province'
  | 'postalCode'
  | 'destinationType'
  | 'addressUnit'
  | 'addressBell'
  | 'addressPlaceType'
>

type PersonComparable = {
  name: string
  phone: string
  address: string
  city: string
  province: string
  postalCode: string
  destinationType: string
  addressUnit: string
  addressBell: string
  addressPlaceType: string
}

function normalizeText(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function normalizePhone(value: string | undefined): string {
  return (value ?? '').replace(/\D/g, '')
}

function toPersonComparable(input: PersonDuplicateInput): PersonComparable {
  return {
    name: normalizeText(formatFullName(input)),
    phone: normalizePhone(input.phone),
    address: normalizeText(input.address),
    city: normalizeText(input.city),
    province: normalizeText(input.province),
    postalCode: normalizeText(input.postalCode),
    destinationType: input.destinationType,
    addressUnit: normalizeText(input.addressUnit),
    addressBell: normalizeText(input.addressBell),
    addressPlaceType: input.addressPlaceType ?? '',
  }
}

function isSamePersonData(a: PersonComparable, b: PersonComparable): boolean {
  return (
    a.name === b.name &&
    a.phone === b.phone &&
    a.address === b.address &&
    a.city === b.city &&
    a.province === b.province &&
    a.postalCode === b.postalCode &&
    a.destinationType === b.destinationType &&
    a.addressUnit === b.addressUnit &&
    a.addressBell === b.addressBell &&
    a.addressPlaceType === b.addressPlaceType
  )
}

export function findDuplicatePersons(
  persons: Person[],
  input: PersonDuplicateInput,
  excludeId?: string,
): Person[] {
  const comparable = toPersonComparable(input)
  return persons.filter((person) => {
    if (excludeId && person.id === excludeId) return false
    return isSamePersonData(comparable, toPersonComparable(person))
  })
}
