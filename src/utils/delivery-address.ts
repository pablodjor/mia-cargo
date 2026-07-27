import type { DeliveryAddressOverride, DeliveryStop, Package } from '@/types'
import { formatAddressLine, streetAddressWithUnit } from '@/utils/address-details'
import { formatMapsAddress } from '@/utils/maps'

export function getStopAddressParts(
  pkg: Package,
  stop: DeliveryStop,
): DeliveryAddressOverride {
  if (stop.deliveryAddress) return stop.deliveryAddress
  return {
    address: pkg.address,
    city: pkg.city,
    province: pkg.province,
    postalCode: pkg.postalCode,
    unit: pkg.addressUnit,
    bell: pkg.addressBell,
    placeType: pkg.addressPlaceType,
  }
}

export function formatStopAddress(pkg: Package, stop: DeliveryStop): string {
  return formatAddressLine(getStopAddressParts(pkg, stop))
}

export function formatPackageAddress(pkg: Package): string {
  return formatAddressLine({
    address: pkg.address,
    city: pkg.city,
    province: pkg.province,
    postalCode: pkg.postalCode,
    unit: pkg.addressUnit,
    bell: pkg.addressBell,
    placeType: pkg.addressPlaceType,
  })
}

export function formatPackageMapsAddress(pkg: Package): string {
  return formatMapsAddress({
    address: streetAddressWithUnit(pkg.address, pkg.addressUnit, pkg.addressBell),
    city: pkg.city,
    province: pkg.province,
    postalCode: pkg.postalCode,
    destinationType: pkg.destinationType,
  })
}

export function formatOverrideMapsAddress(
  override: DeliveryAddressOverride,
  destinationType?: Package['destinationType'],
): string {
  return formatMapsAddress({
    address: streetAddressWithUnit(override.address, override.unit, override.bell),
    city: override.city,
    province: override.province,
    postalCode: override.postalCode,
    destinationType,
  })
}

export function formatStopMapsAddress(pkg: Package, stop: DeliveryStop): string {
  const parts = getStopAddressParts(pkg, stop)
  return formatMapsAddress({
    address: streetAddressWithUnit(parts.address, parts.unit, parts.bell),
    city: parts.city,
    province: parts.province,
    postalCode: parts.postalCode,
    destinationType: pkg.destinationType,
  })
}

export function hasAlternateDeliveryAddress(pkg: Package, stop: DeliveryStop): boolean {
  if (!stop.deliveryAddress) return false
  return formatPackageAddress(pkg).toLowerCase() !== formatStopAddress(pkg, stop).toLowerCase()
}

export function isCompleteDeliveryAddress(
  value: Partial<DeliveryAddressOverride> | undefined,
): value is DeliveryAddressOverride {
  return Boolean(
    value?.address?.trim() &&
      value.city?.trim() &&
      value.province?.trim() &&
      value.postalCode?.trim(),
  )
}

export const EMPTY_DELIVERY_ADDRESS: DeliveryAddressOverride = {
  address: '',
  city: '',
  province: '',
  postalCode: '',
}
