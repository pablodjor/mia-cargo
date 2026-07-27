import {
  ACTIVE_DELIVERY_STATUSES,
  PACKAGE_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from '@/constants/labels'
import type { DeliveryChannel, DestinationType, Package, PackageStatus, PaymentStatus } from '@/types'
import { createId } from '@/utils/id'
import { delay } from '@/utils/delay'
import { calculatePackageTotals } from '@/utils/money'
import { appendPackageFailedAttempt } from '@/utils/package-attempts'
import { findDuplicatePersons } from '@/utils/person-duplicate'
import {
  assertCourierPackagePayment,
  deskDeliveryMethodLabel,
  isOnActiveDeliveryRoute,
  isCourierPackage,
} from '@/utils/payment-rules'
import { historyService } from './history.service'
import { personsService } from './persons.service'
import { storageService } from './storage.service'

/** Estados que se pueden meter en un reparto nuevo. */
export const PACKAGE_AVAILABLE_FOR_DELIVERY: PackageStatus[] = [
  'pending',
  'rescheduled',
  'not_delivered',
]

export type PackageInput = Omit<Package, 'id' | 'createdAt' | 'updatedAt' | 'deliveryId' | 'totalUsd' | 'totalArs'> & {
  totalUsd?: number
  totalArs?: number
}

function withTotals(input: PackageInput): Pick<Package, 'totalUsd' | 'totalArs' | 'pricePerKgUsd' | 'usdRate' | 'paymentStatus'> {
  const pricePerKgUsd = input.pricePerKgUsd
  const usdRate = input.usdRate
  const totals = calculatePackageTotals(input.weight, pricePerKgUsd, usdRate)
  return {
    pricePerKgUsd,
    usdRate,
    paymentStatus: input.paymentStatus,
    totalUsd: totals.totalUsd,
    totalArs: totals.totalArs,
  }
}

function nextShCode(packages: Package[]): string {
  const numbers = packages.map((pkg) => Number(pkg.shCode.replace('SH', ''))).filter((n) => Number.isFinite(n))
  const max = numbers.length > 0 ? Math.max(...numbers) : 10000
  return `SH${max + 1}`
}

async function ensurePackagePersonLink(input: PackageInput): Promise<string | undefined> {
  if (input.personId) return input.personId

  const personData = {
    name: input.ownerName,
    phone: input.ownerPhone,
    address: input.address,
    city: input.city,
    province: input.province,
    postalCode: input.postalCode,
    destinationType: input.destinationType,
    addressUnit: input.addressUnit,
    addressBell: input.addressBell,
    addressPlaceType: input.addressPlaceType,
  }

  const existing = findDuplicatePersons(storageService.getPersons(), personData)[0]
  if (existing) return existing.id

  const created = await personsService.create({
    ...personData,
    status: 'active',
    notes: input.notes,
  })
  return created.id
}

export const packagesService = {
  async getAll(): Promise<Package[]> {
    await delay()
    storageService.seedIfNeeded()
    return storageService.getPackages()
  },

  async getById(id: string): Promise<Package | null> {
    await delay()
    storageService.seedIfNeeded()
    return storageService.getPackages().find((pkg) => pkg.id === id) ?? null
  },

  async findByCode(code: string): Promise<Package | null> {
    await delay()
    storageService.seedIfNeeded()
    const normalized = code.trim().toUpperCase()
    return (
      storageService
        .getPackages()
        .find((pkg) => pkg.shCode.toUpperCase() === normalized) ?? null
    )
  },

  async create(input: PackageInput): Promise<Package> {
    await delay()
    storageService.seedIfNeeded()
    const packages = storageService.getPackages()
    const personId = await ensurePackagePersonLink(input)
    const now = new Date().toISOString()
    const pkg: Package = {
      ...input,
      personId,
      ...withTotals(input),
      id: createId('pkg'),
      shCode: input.shCode || nextShCode(packages),
      createdAt: now,
      updatedAt: now,
    }
    storageService.setPackages([pkg, ...packages])
    historyService.record({
      action: 'package_created',
      entity: 'package',
      entityId: pkg.id,
      relatedCode: pkg.shCode,
      newStatus: pkg.status,
      description: `Paquete ${pkg.shCode} creado`,
    })
    return pkg
  },

  async update(id: string, data: Partial<PackageInput>): Promise<Package> {
    await delay()
    storageService.seedIfNeeded()
    const packages = storageService.getPackages()
    const index = packages.findIndex((pkg) => pkg.id === id)
    if (index < 0) throw new Error('Paquete no encontrado')

    const current = packages[index]
    if (!current) throw new Error('Paquete no encontrado')

    if (data.paymentStatus && isCourierPackage(current, storageService.getDeliveries())) {
      assertCourierPackagePayment({ ...current, paymentStatus: data.paymentStatus })
    }

    const merged: PackageInput = {
      ...current,
      ...data,
      weight: data.weight ?? current.weight,
      pricePerKgUsd: data.pricePerKgUsd ?? current.pricePerKgUsd,
      usdRate: data.usdRate ?? current.usdRate,
      paymentStatus: data.paymentStatus ?? current.paymentStatus,
    }
    const personId = await ensurePackagePersonLink(merged)

    const updated: Package = {
      ...current,
      ...data,
      personId,
      ...withTotals(merged),
      id: current.id,
      updatedAt: new Date().toISOString(),
    }
    packages[index] = updated
    storageService.setPackages(packages)
    historyService.record({
      action: 'package_updated',
      entity: 'package',
      entityId: updated.id,
      relatedCode: updated.shCode,
      previousStatus: current.status,
      newStatus: updated.status,
      description: `Paquete ${updated.shCode} actualizado`,
    })
    return updated
  },

  async updateStatus(
    id: string,
    status: PackageStatus,
    extras?: Partial<Pick<Package, 'failureReasonId' | 'failureNotes' | 'lastAttemptAt' | 'notes'>>,
  ): Promise<Package> {
    await delay()
    storageService.seedIfNeeded()
    const packages = storageService.getPackages()
    const index = packages.findIndex((pkg) => pkg.id === id)
    if (index < 0) throw new Error('Paquete no encontrado')
    const current = packages[index]
    if (!current) throw new Error('Paquete no encontrado')

    const updated: Package = {
      ...current,
      ...extras,
      status,
      updatedAt: new Date().toISOString(),
    }
    packages[index] = updated
    storageService.setPackages(packages)
    historyService.record({
      action: 'package_status_changed',
      entity: 'package',
      entityId: updated.id,
      relatedCode: updated.shCode,
      previousStatus: current.status,
      newStatus: status,
      description: `Estado de ${updated.shCode} cambiado a ${status}`,
    })
    return updated
  },

  async cancel(id: string): Promise<Package> {
    return this.updateStatus(id, 'cancelled')
  },

  async updatePaymentStatus(id: string, paymentStatus: PaymentStatus): Promise<Package> {
    await delay()
    storageService.seedIfNeeded()
    const packages = storageService.getPackages()
    const index = packages.findIndex((pkg) => pkg.id === id)
    if (index < 0) throw new Error('Paquete no encontrado')
    const current = packages[index]
    if (!current) throw new Error('Paquete no encontrado')
    if (current.status === 'cancelled') throw new Error('El paquete está cancelado')

    if (current.paymentStatus === paymentStatus) return current

    if (isCourierPackage(current, storageService.getDeliveries())) {
      assertCourierPackagePayment({ ...current, paymentStatus })
    }

    const updated: Package = {
      ...current,
      paymentStatus,
      updatedAt: new Date().toISOString(),
    }
    packages[index] = updated
    storageService.setPackages(packages)
    historyService.record({
      action: 'package_payment_changed',
      entity: 'package',
      entityId: updated.id,
      relatedCode: updated.shCode,
      previousStatus: current.paymentStatus,
      newStatus: paymentStatus,
      description: `Cobro de ${updated.shCode}: ${PAYMENT_STATUS_LABELS[current.paymentStatus]} → ${PAYMENT_STATUS_LABELS[paymentStatus]}`,
    })
    return updated
  },

  async registerWarehousePickup(
    id: string,
    paymentStatus: PaymentStatus,
    options?: { method?: 'warehouse_pickup' | 'counter' },
  ): Promise<Package> {
    await delay()
    storageService.seedIfNeeded()

    const deliveries = storageService.getDeliveries()
    const packages = storageService.getPackages()
    const index = packages.findIndex((pkg) => pkg.id === id)
    if (index < 0) throw new Error('Paquete no encontrado')
    const current = packages[index]
    if (!current) throw new Error('Paquete no encontrado')
    if (current.status === 'cancelled') throw new Error('El paquete está cancelado')

    if (isOnActiveDeliveryRoute(current, deliveries)) {
      throw new Error('El paquete está en ruta. Confirmá la entrega desde el reparto.')
    }

    if (isCourierPackage(current, deliveries)) {
      assertCourierPackagePayment({ ...current, paymentStatus })
    }

    const now = new Date().toISOString()
    let deliveryUpdated = false

    if (current.deliveryId) {
      const deliveryIndex = deliveries.findIndex((delivery) => delivery.id === current.deliveryId)
      if (deliveryIndex >= 0) {
        const delivery = deliveries[deliveryIndex]
        if (!delivery) throw new Error('Reparto no encontrado')
        const stop = delivery.stops.find((item) => item.packageId === id)
        if (stop?.status === 'pending') {
          deliveries[deliveryIndex] = {
            ...delivery,
            stops: delivery.stops.map((item) =>
              item.packageId === id
                ? { ...item, status: 'delivered' as const, attemptedAt: now }
                : item,
            ),
            updatedAt: now,
          }
          deliveryUpdated = true
        }
      }
    }

    if (deliveryUpdated) {
      storageService.setDeliveries(deliveries)
    }

    const previousPayment = current.paymentStatus
    const previousStatus = current.status
    const updated: Package = {
      ...current,
      status: 'delivered',
      paymentStatus,
      updatedAt: now,
    }
    packages[index] = updated
    storageService.setPackages(packages)

    const paymentNote =
      previousPayment !== paymentStatus
        ? ` · pago: ${PAYMENT_STATUS_LABELS[paymentStatus]}`
        : ''
    const methodLabel = deskDeliveryMethodLabel(options?.method ?? 'warehouse_pickup')
    historyService.record({
      action: 'package_pickup_registered',
      entity: 'package',
      entityId: updated.id,
      relatedCode: updated.shCode,
      previousStatus,
      newStatus: 'delivered',
      description:
        previousStatus === 'delivered'
          ? `Cobro de ${updated.shCode}: ${PAYMENT_STATUS_LABELS[previousPayment]} → ${PAYMENT_STATUS_LABELS[paymentStatus]}`
          : `${methodLabel} · ${updated.shCode}${paymentNote}`,
    })
    return updated
  },

  async registerOtherDelivery(
    id: string,
    paymentStatus: PaymentStatus,
    deliveryNotes: string,
  ): Promise<Package> {
    await delay()
    storageService.seedIfNeeded()

    const notes = deliveryNotes.trim()
    if (!notes) throw new Error('Describí cómo se entregó el paquete')

    const deliveries = storageService.getDeliveries()
    const packages = storageService.getPackages()
    const index = packages.findIndex((pkg) => pkg.id === id)
    if (index < 0) throw new Error('Paquete no encontrado')
    const current = packages[index]
    if (!current) throw new Error('Paquete no encontrado')
    if (current.status === 'cancelled') throw new Error('El paquete está cancelado')

    if (isOnActiveDeliveryRoute(current, deliveries)) {
      throw new Error('El paquete está en ruta. Confirmá la entrega desde el reparto.')
    }

    if (isCourierPackage(current, deliveries)) {
      assertCourierPackagePayment({ ...current, paymentStatus })
    }

    const now = new Date().toISOString()
    const previousPayment = current.paymentStatus
    const previousStatus = current.status
    const updated: Package = {
      ...current,
      status: 'delivered',
      paymentStatus,
      notes: current.notes?.trim()
        ? `${current.notes.trim()}\nEntrega: ${notes}`
        : `Entrega: ${notes}`,
      updatedAt: now,
    }
    packages[index] = updated
    storageService.setPackages(packages)

    const paymentNote =
      previousPayment !== paymentStatus
        ? ` · pago: ${PAYMENT_STATUS_LABELS[paymentStatus]}`
        : ''
    historyService.record({
      action: 'package_pickup_registered',
      entity: 'package',
      entityId: updated.id,
      relatedCode: updated.shCode,
      previousStatus,
      newStatus: 'delivered',
      description: `Otra forma · ${updated.shCode}: ${notes}${paymentNote}`,
    })
    return updated
  },

  async reschedule(id: string, dateLabel: string, extras?: {
    failureReasonId?: string
    failureNotes?: string
    deliveryCode?: string
    userName?: string
  }): Promise<Package> {
    await delay()
    storageService.seedIfNeeded()
    const packages = storageService.getPackages()
    const index = packages.findIndex((pkg) => pkg.id === id)
    if (index < 0) throw new Error('Paquete no encontrado')
    const current = packages[index]
    if (!current) throw new Error('Paquete no encontrado')

    const delivery = current.deliveryId
      ? storageService.getDeliveries().find((item) => item.id === current.deliveryId)
      : undefined
    const session = storageService.getSession()
    const now = new Date().toISOString()
    const failedAttempts = appendPackageFailedAttempt(current, {
      attemptedAt: now,
      outcome: 'rescheduled',
      failureReasonId: extras?.failureReasonId ?? current.failureReasonId,
      failureNotes: extras?.failureNotes ?? current.failureNotes,
      userName: extras?.userName ?? session?.name,
      deliveryCode: extras?.deliveryCode ?? delivery?.code,
    })

    const updated: Package = {
      ...current,
      status: 'rescheduled',
      notes: `Reprogramado para ${dateLabel}`,
      failureReasonId: extras?.failureReasonId ?? current.failureReasonId,
      failureNotes: extras?.failureNotes ?? current.failureNotes,
      failedAttempts,
      lastAttemptAt: now,
      deliveryId: undefined,
      updatedAt: now,
    }
    packages[index] = updated
    storageService.setPackages(packages)

    const deliveries = storageService.getDeliveries()
    storageService.setDeliveries(
      deliveries.map((delivery) => {
        if (delivery.id !== current.deliveryId) return delivery
        return {
          ...delivery,
          stops: delivery.stops.filter((stop) => stop.packageId !== id),
          updatedAt: now,
        }
      }),
    )

    historyService.record({
      action: 'package_rescheduled',
      entity: 'package',
      entityId: id,
      relatedCode: updated.shCode,
      previousStatus: current.status,
      newStatus: 'rescheduled',
      description: extras?.failureNotes?.trim()
        ? `Paquete ${updated.shCode} reprogramado para ${dateLabel}: ${extras.failureNotes.trim()}`
        : `Paquete ${updated.shCode} reprogramado para ${dateLabel}`,
    })

    return updated
  },

  canAddToDelivery(
    packageId: string,
    deliveryId?: string,
    channel?: DeliveryChannel,
  ): { ok: boolean; message?: string } {
    storageService.seedIfNeeded()
    const pkg = storageService.getPackages().find((item) => item.id === packageId)
    if (!pkg) return { ok: false, message: 'Paquete no encontrado' }

    const alreadyOnThis = Boolean(
      deliveryId &&
        storageService
          .getDeliveries()
          .find((delivery) => delivery.id === deliveryId)
          ?.stops.some((stop) => stop.packageId === packageId),
    )
    if (alreadyOnThis) {
      // Ya está en este reparto: permitir guardar aunque tenga resultado (entregado / no entregado).
      if (pkg.status === 'cancelled') {
        return { ok: false, message: 'El paquete está cancelado' }
      }
      return { ok: true }
    }

    if (pkg.status === 'delivered') {
      return { ok: false, message: 'El paquete ya fue entregado y no se puede asignar a un reparto' }
    }
    if (pkg.status === 'cancelled') {
      return { ok: false, message: 'El paquete está cancelado' }
    }

    if (!PACKAGE_AVAILABLE_FOR_DELIVERY.includes(pkg.status)) {
      return {
        ok: false,
        message: `No disponible: ${PACKAGE_STATUS_LABELS[pkg.status].toLowerCase()}`,
      }
    }

    const active = storageService
      .getDeliveries()
      .filter((delivery) => ACTIVE_DELIVERY_STATUSES.includes(delivery.status))
      .find((delivery) => delivery.stops.some((stop) => stop.packageId === packageId))

    if (active && active.id !== deliveryId) {
      return { ok: false, message: `El paquete ya está en el reparto activo ${active.code}` }
    }

    const targetDelivery = deliveryId
      ? storageService.getDeliveries().find((delivery) => delivery.id === deliveryId)
      : undefined
    const targetChannel = targetDelivery?.channel ?? channel
    if (targetChannel === 'courier') {
      if (pkg.paymentStatus === 'cash') {
        return {
          ok: false,
          message: `${pkg.shCode}: en correo solo se permite pago por transferencia`,
        }
      }
      if (pkg.paymentStatus === 'usd_cash') {
        return {
          ok: false,
          message: `${pkg.shCode}: en correo no se admite pago en dólares billete`,
        }
      }
      if (pkg.paymentStatus === 'pending') {
        return {
          ok: false,
          message: `${pkg.shCode}: cambiá el pago a transferencia antes de agregarlo a correo`,
        }
      }
    }

    return { ok: true }
  },

  /** Paquetes que se pueden sumar a un reparto (no salieron / no están asignados a otro). */
  listAvailableForDelivery(deliveryId?: string, excludeIds: string[] = []): Package[] {
    storageService.seedIfNeeded()
    const excluded = new Set(excludeIds)
    return storageService
      .getPackages()
      .filter((pkg) => !excluded.has(pkg.id) && this.canAddToDelivery(pkg.id, deliveryId).ok)
      .sort((a, b) => a.shCode.localeCompare(b.shCode))
  },

  getMetricsByDestination(): Record<DestinationType, number> {
    storageService.seedIfNeeded()
    const packages = storageService.getPackages()
    return {
      caba: packages.filter((pkg) => pkg.destinationType === 'caba').length,
      gba: packages.filter((pkg) => pkg.destinationType === 'gba').length,
      interior: packages.filter((pkg) => pkg.destinationType === 'interior').length,
    }
  },

  getMetricsByStatus(): Record<PackageStatus, number> {
    storageService.seedIfNeeded()
    const packages = storageService.getPackages()
    const result: Record<PackageStatus, number> = {
      pending: 0,
      assigned: 0,
      in_route: 0,
      delivered: 0,
      not_delivered: 0,
      rescheduled: 0,
      cancelled: 0,
    }
    for (const pkg of packages) {
      result[pkg.status] += 1
    }
    return result
  },
}
