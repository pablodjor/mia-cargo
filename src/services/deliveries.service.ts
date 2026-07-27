import { ACTIVE_DELIVERY_STATUSES, PAYMENT_STATUS_LABELS } from '@/constants/labels'
import type {
  DashboardMetrics,
  Delivery,
  DeliveryAddressOverride,
  DeliveryChannel,
  DeliveryStatus,
  DeliveryStop,
  DeliveryZone,
  Package,
  PaymentStatus,
} from '@/types'
import { createId } from '@/utils/id'
import { delay } from '@/utils/delay'
import { nextDeliveryCode } from '@/utils/delivery-code'
import { formatDate, isDeliveryScheduledForToday, isSameDayISO, todayISODate, formatDeliveryDateDisplay } from '@/utils/date'
import { roundMoney } from '@/utils/money'
import { assertCourierPackagePayment, assertDriverDeliveryPayment } from '@/utils/payment-rules'
import { appendPackageFailedAttempt } from '@/utils/package-attempts'
import { historyService } from './history.service'
import { packagesService } from './packages.service'
import { storageService } from './storage.service'

export interface DeliveryInput {
  date: string
  zone: DeliveryZone
  channel: DeliveryChannel
  courierId?: string
  driverId: string
  vehicleId: string
  notes?: string
  packageIds: string[]
  stopAddressOverrides?: Record<string, DeliveryAddressOverride>
  status?: Extract<DeliveryStatus, 'draft' | 'prepared'>
}

function buildStops(
  packageIds: string[],
  overrides?: Record<string, DeliveryAddressOverride>,
  existingStops?: Map<string, DeliveryStop>,
): DeliveryStop[] {
  return packageIds.map((packageId, index) => {
    const previous = existingStops?.get(packageId)
    const deliveryAddress = overrides?.[packageId]

    return {
      packageId,
      order: index + 1,
      status: previous?.status ?? 'pending',
      attemptedAt: previous?.attemptedAt,
      notes: previous?.notes,
      ...(deliveryAddress ? { deliveryAddress } : {}),
    }
  })
}

function syncPackagesForDelivery(
  deliveryId: string,
  packageIds: string[],
  packageStatus: Package['status'],
): void {
  const packages: Package[] = storageService.getPackages().map((pkg) => {
    if (packageIds.includes(pkg.id)) {
      const nextStatus: Package['status'] =
        pkg.status === 'delivered' || pkg.status === 'cancelled' ? pkg.status : packageStatus
      return {
        ...pkg,
        deliveryId,
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      }
    }
    if (pkg.deliveryId === deliveryId && !packageIds.includes(pkg.id)) {
      const nextStatus: Package['status'] =
        pkg.status === 'cancelled' || pkg.status === 'delivered' ? pkg.status : 'pending'
      return {
        ...pkg,
        deliveryId: undefined,
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      }
    }
    return pkg
  })
  storageService.setPackages(packages)
}

function getDeliveryProgress(delivery: Delivery): {
  total: number
  delivered: number
  notDelivered: number
  pending: number
  percent: number
} {
  const total = delivery.stops.length
  const delivered = delivery.stops.filter((stop) => stop.status === 'delivered').length
  const notDelivered = delivery.stops.filter((stop) => stop.status === 'not_delivered').length
  const pending = delivery.stops.filter((stop) => stop.status === 'pending').length
  const percent = total === 0 ? 0 : Math.round(((delivered + notDelivered) / total) * 100)
  return { total, delivered, notDelivered, pending, percent }
}

function assertDeliveryChannel(input: DeliveryInput): void {
  if (input.channel === 'courier' && !input.courierId) {
    throw new Error('Seleccioná el correo (Andreani, Correo Argentino, etc.)')
  }
}

function assertCourierDeliveryPackages(input: DeliveryInput): void {
  if (input.channel !== 'courier') return

  const packages = storageService.getPackages()
  for (const packageId of input.packageIds) {
    const pkg = packages.find((item) => item.id === packageId)
    if (pkg) assertCourierPackagePayment(pkg)
  }
}

export const deliveriesService = {
  getProgress: getDeliveryProgress,

  async getAll(): Promise<Delivery[]> {
    await delay()
    storageService.seedIfNeeded()
    return storageService.getDeliveries()
  },

  async getById(id: string): Promise<Delivery | null> {
    await delay()
    storageService.seedIfNeeded()
    return storageService.getDeliveries().find((delivery) => delivery.id === id) ?? null
  },

  async getByDriver(driverId: string): Promise<Delivery[]> {
    await delay()
    storageService.seedIfNeeded()
    return storageService
      .getDeliveries()
      .filter((delivery) => delivery.driverId === driverId)
      .sort((a, b) => b.date.localeCompare(a.date))
  },

  findByDriverAndDate(
    driverId: string,
    date: string,
    excludeDeliveryId?: string,
  ): Delivery[] {
    storageService.seedIfNeeded()
    return storageService
      .getDeliveries()
      .filter(
        (delivery) =>
          delivery.driverId === driverId &&
          delivery.date === date &&
          delivery.status !== 'cancelled' &&
          delivery.id !== excludeDeliveryId,
      )
      .sort((a, b) => a.code.localeCompare(b.code))
  },

  async create(input: DeliveryInput): Promise<Delivery> {
    await delay()
    storageService.seedIfNeeded()
    assertDeliveryChannel(input)
    assertCourierDeliveryPackages(input)

    for (const packageId of input.packageIds) {
      const check = packagesService.canAddToDelivery(packageId, undefined, input.channel)
      if (!check.ok) throw new Error(check.message)
    }

    const deliveries = storageService.getDeliveries()
    const now = new Date().toISOString()
    const status = input.status ?? 'draft'
    const delivery: Delivery = {
      id: createId('del'),
      code: nextDeliveryCode(deliveries, input.date),
      date: input.date,
      zone: input.zone,
      channel: input.channel,
      courierId: input.channel === 'courier' ? input.courierId : undefined,
      driverId: input.driverId,
      vehicleId: input.vehicleId,
      notes: input.notes,
      status,
      stops: buildStops(input.packageIds, input.stopAddressOverrides),
      createdAt: now,
      updatedAt: now,
    }

    storageService.setDeliveries([delivery, ...deliveries])
    syncPackagesForDelivery(
      delivery.id,
      input.packageIds,
      status === 'draft' || status === 'prepared' ? 'assigned' : 'assigned',
    )

    historyService.record({
      action: 'delivery_created',
      entity: 'delivery',
      entityId: delivery.id,
      relatedCode: delivery.code,
      newStatus: delivery.status,
      description: `Reparto ${delivery.code} creado`,
    })

    return delivery
  },

  async update(id: string, input: DeliveryInput): Promise<Delivery> {
    await delay()
    storageService.seedIfNeeded()
    assertDeliveryChannel(input)
    assertCourierDeliveryPackages(input)
    const deliveries = storageService.getDeliveries()
    const index = deliveries.findIndex((delivery) => delivery.id === id)
    if (index < 0) throw new Error('Reparto no encontrado')
    const current = deliveries[index]
    if (!current) throw new Error('Reparto no encontrado')
    if (current.status === 'completed' || current.status === 'cancelled') {
      throw new Error('No se puede editar un reparto finalizado o cancelado')
    }

    for (const packageId of input.packageIds) {
      const check = packagesService.canAddToDelivery(packageId, id, input.channel)
      if (!check.ok) throw new Error(check.message)
    }

    const existingStops = new Map(current.stops.map((stop) => [stop.packageId, stop]))
    const stops = buildStops(input.packageIds, input.stopAddressOverrides, existingStops)

    const status = input.status ?? current.status
    const updated: Delivery = {
      ...current,
      date: input.date,
      zone: input.zone,
      channel: input.channel,
      courierId: input.channel === 'courier' ? input.courierId : undefined,
      driverId: input.driverId,
      vehicleId: input.vehicleId,
      notes: input.notes,
      status: status === 'draft' || status === 'prepared' ? status : current.status,
      stops,
      updatedAt: new Date().toISOString(),
    }

    deliveries[index] = updated
    storageService.setDeliveries(deliveries)
    syncPackagesForDelivery(
      updated.id,
      input.packageIds,
      updated.status === 'in_progress' ? 'in_route' : 'assigned',
    )

    historyService.record({
      action: 'delivery_updated',
      entity: 'delivery',
      entityId: updated.id,
      relatedCode: updated.code,
      previousStatus: current.status,
      newStatus: updated.status,
      description: `Reparto ${updated.code} actualizado`,
    })

    return updated
  },

  async duplicate(id: string): Promise<Delivery> {
    await delay()
    const current = await this.getById(id)
    if (!current) throw new Error('Reparto no encontrado')

    const packageIds = current.stops
      .map((stop) => stop.packageId)
      .filter((packageId) => packagesService.canAddToDelivery(packageId).ok)

    return this.create({
      date: todayISODate(),
      zone: current.zone,
      channel: current.channel,
      courierId: current.courierId,
      driverId: current.driverId,
      vehicleId: current.vehicleId,
      notes: current.notes ? `Copia: ${current.notes}` : `Copia de ${current.code}`,
      packageIds,
      status: 'draft',
    })
  },

  async setStatus(id: string, status: DeliveryStatus): Promise<Delivery> {
    await delay()
    storageService.seedIfNeeded()
    const deliveries = storageService.getDeliveries()
    const index = deliveries.findIndex((delivery) => delivery.id === id)
    if (index < 0) throw new Error('Reparto no encontrado')
    const current = deliveries[index]
    if (!current) throw new Error('Reparto no encontrado')
    if (status === 'cancelled' && current.status === 'completed') {
      throw new Error('No se puede cancelar un reparto finalizado')
    }
    if (status === 'in_progress' && !isDeliveryScheduledForToday(current.date)) {
      throw new Error(
        `Solo podés iniciar este reparto el ${formatDate(current.date)}. Hoy es ${formatDate(todayISODate())}.`,
      )
    }

    const now = new Date().toISOString()
    const updated: Delivery = {
      ...current,
      status,
      updatedAt: now,
      startedAt: status === 'in_progress' ? current.startedAt ?? now : current.startedAt,
      completedAt: status === 'completed' ? now : current.completedAt,
    }

    deliveries[index] = updated
    storageService.setDeliveries(deliveries)

    const packageIds = updated.stops.map((stop) => stop.packageId)
    if (status === 'in_progress') {
      syncPackagesForDelivery(updated.id, packageIds, 'in_route')
    } else if (status === 'cancelled') {
      const packages = storageService.getPackages().map((pkg) => {
        if (!packageIds.includes(pkg.id)) return pkg
        if (pkg.status === 'delivered' || pkg.status === 'cancelled') return pkg
        return {
          ...pkg,
          deliveryId: undefined,
          status: 'pending' as const,
          updatedAt: now,
        }
      })
      storageService.setPackages(packages)
    } else if (status === 'prepared' || status === 'draft') {
      syncPackagesForDelivery(updated.id, packageIds, 'assigned')
    }

    historyService.record({
      action: `delivery_${status}`,
      entity: 'delivery',
      entityId: updated.id,
      relatedCode: updated.code,
      previousStatus: current.status,
      newStatus: status,
      description: `Reparto ${updated.code} pasó a ${status}`,
    })

    return updated
  },

  async cancel(id: string): Promise<Delivery> {
    const current = await this.getById(id)
    if (!current) throw new Error('Reparto no encontrado')
    if (current.status === 'completed') {
      throw new Error('No se puede cancelar un reparto finalizado')
    }
    if (current.status === 'cancelled') {
      throw new Error('El reparto ya está cancelado')
    }
    return this.setStatus(id, 'cancelled')
  },

  async addPackage(deliveryId: string, packageId: string): Promise<Delivery> {
    const delivery = await this.getById(deliveryId)
    if (!delivery) throw new Error('Reparto no encontrado')
    if (!ACTIVE_DELIVERY_STATUSES.includes(delivery.status)) {
      throw new Error('Solo se pueden agregar paquetes a repartos activos')
    }
    const check = packagesService.canAddToDelivery(packageId, deliveryId)
    if (!check.ok) throw new Error(check.message)

    const packageIds = [...delivery.stops.map((stop) => stop.packageId), packageId]
    return this.update(deliveryId, {
      date: delivery.date,
      zone: delivery.zone,
      channel: delivery.channel,
      courierId: delivery.courierId,
      driverId: delivery.driverId,
      vehicleId: delivery.vehicleId,
      notes: delivery.notes,
      packageIds,
      status: delivery.status === 'in_progress' ? undefined : delivery.status === 'prepared' ? 'prepared' : 'draft',
    })
  },

  async removePackage(deliveryId: string, packageId: string): Promise<Delivery> {
    const delivery = await this.getById(deliveryId)
    if (!delivery) throw new Error('Reparto no encontrado')
    const packageIds = delivery.stops
      .map((stop) => stop.packageId)
      .filter((id) => id !== packageId)

    return this.update(deliveryId, {
      date: delivery.date,
      zone: delivery.zone,
      channel: delivery.channel,
      courierId: delivery.courierId,
      driverId: delivery.driverId,
      vehicleId: delivery.vehicleId,
      notes: delivery.notes,
      packageIds,
      status: delivery.status === 'prepared' ? 'prepared' : delivery.status === 'draft' ? 'draft' : undefined,
    })
  },

  async markStop(
    deliveryId: string,
    packageId: string,
    result: 'delivered' | 'not_delivered',
    extras?: {
      failureReasonId?: string
      failureNotes?: string
      notes?: string
      paymentStatus?: PaymentStatus
    },
  ): Promise<Delivery> {
    await delay()
    storageService.seedIfNeeded()

    if (result === 'not_delivered' && !extras?.failureNotes?.trim() && !extras?.failureReasonId) {
      throw new Error('La observación es obligatoria')
    }

    const failureReasonId =
      result === 'not_delivered'
        ? extras?.failureReasonId ?? (extras?.failureNotes?.trim() ? 'fr_1' : undefined)
        : extras?.failureReasonId

    const deliveries = storageService.getDeliveries()
    const index = deliveries.findIndex((delivery) => delivery.id === deliveryId)
    if (index < 0) throw new Error('Reparto no encontrado')
    const current = deliveries[index]
    if (!current) throw new Error('Reparto no encontrado')

    const now = new Date().toISOString()
    const updated: Delivery = {
      ...current,
      stops: current.stops.map((stop) =>
        stop.packageId === packageId
          ? {
              ...stop,
              status: result,
              attemptedAt: now,
              notes: extras?.notes ?? stop.notes,
            }
          : stop,
      ),
      updatedAt: now,
    }
    deliveries[index] = updated
    storageService.setDeliveries(deliveries)

    const packages = storageService.getPackages()
    const pkgIndex = packages.findIndex((pkg) => pkg.id === packageId)
    const pkg = packages[pkgIndex]
    if (!pkg) throw new Error('Paquete no encontrado')

    let nextPaymentStatus = pkg.paymentStatus
    if (result === 'delivered' && extras?.paymentStatus) {
      assertDriverDeliveryPayment(current.channel, extras.paymentStatus)
      nextPaymentStatus = extras.paymentStatus
    }

    packages[pkgIndex] = {
      ...pkg,
      status: result,
      paymentStatus: nextPaymentStatus,
      failureReasonId,
      failureNotes: extras?.failureNotes,
      failedAttempts:
        result === 'not_delivered'
          ? appendPackageFailedAttempt(pkg, {
              attemptedAt: now,
              outcome: 'not_delivered',
              failureReasonId,
              failureNotes: extras?.failureNotes,
              userName: storageService.getSession()?.name,
              deliveryCode: current.code,
            })
          : pkg.failedAttempts,
      lastAttemptAt: now,
      notes: extras?.notes ?? pkg.notes,
      updatedAt: now,
    }
    storageService.setPackages(packages)

    historyService.record({
      action: result === 'delivered' ? 'package_delivered' : 'package_not_delivered',
      entity: 'package',
      entityId: pkg.id,
      relatedCode: pkg.shCode,
      previousStatus: pkg.status,
      newStatus: result,
      description:
        result === 'delivered'
          ? nextPaymentStatus !== pkg.paymentStatus
            ? `Paquete ${pkg.shCode} entregado · pago: ${PAYMENT_STATUS_LABELS[nextPaymentStatus]}`
            : `Paquete ${pkg.shCode} entregado`
          : extras?.failureNotes?.trim()
            ? `Paquete ${pkg.shCode} no entregado: ${extras.failureNotes.trim()}`
            : `Paquete ${pkg.shCode} no entregado`,
    })

    return updated
  },

  async resetStopToPending(deliveryId: string, packageId: string): Promise<Delivery> {
    await delay()
    storageService.seedIfNeeded()

    const deliveries = storageService.getDeliveries()
    const index = deliveries.findIndex((delivery) => delivery.id === deliveryId)
    if (index < 0) throw new Error('Reparto no encontrado')
    const current = deliveries[index]
    if (!current) throw new Error('Reparto no encontrado')
    if (current.status === 'completed' || current.status === 'cancelled') {
      throw new Error('No se puede modificar paradas en un reparto cerrado')
    }

    const stop = current.stops.find((item) => item.packageId === packageId)
    if (!stop) throw new Error('El paquete no está en este reparto')
    if (stop.status === 'pending') throw new Error('La parada ya está pendiente')

    const now = new Date().toISOString()
    const updated: Delivery = {
      ...current,
      stops: current.stops.map((item) =>
        item.packageId === packageId
          ? {
              ...item,
              status: 'pending',
              attemptedAt: undefined,
              notes: undefined,
            }
          : item,
      ),
      updatedAt: now,
    }
    deliveries[index] = updated
    storageService.setDeliveries(deliveries)

    const packages = storageService.getPackages()
    const pkgIndex = packages.findIndex((pkg) => pkg.id === packageId)
    const pkg = packages[pkgIndex]
    if (!pkg) throw new Error('Paquete no encontrado')

    packages[pkgIndex] = {
      ...pkg,
      status: 'assigned',
      deliveryId,
      failureReasonId: undefined,
      failureNotes: undefined,
      lastAttemptAt: undefined,
      updatedAt: now,
    }
    storageService.setPackages(packages)

    historyService.record({
      action: 'package_status_reset',
      entity: 'package',
      entityId: pkg.id,
      relatedCode: pkg.shCode,
      previousStatus: stop.status,
      newStatus: 'assigned',
      description: `Administración revirtió ${pkg.shCode} a pendiente en el reparto`,
    })

    return updated
  },

  async rescheduleStop(
    deliveryId: string,
    packageId: string,
    extras: { failureReasonId: string; failureNotes?: string; dateISO: string },
  ): Promise<Delivery> {
    await delay()
    storageService.seedIfNeeded()

    if (!extras.failureReasonId) {
      throw new Error('El motivo es obligatorio')
    }

    const delivery = storageService.getDeliveries().find((item) => item.id === deliveryId)
    if (!delivery) throw new Error('Reparto no encontrado')
    if (!delivery.stops.some((stop) => stop.packageId === packageId)) {
      throw new Error('El paquete no está en este reparto')
    }

    const dateLabel = formatDeliveryDateDisplay(extras.dateISO)
    await packagesService.reschedule(packageId, dateLabel, {
      failureReasonId: extras.failureReasonId,
      failureNotes: extras.failureNotes,
      deliveryCode: delivery.code,
    })

    const refreshed = storageService.getDeliveries().find((item) => item.id === deliveryId)
    if (!refreshed) throw new Error('Reparto no encontrado')
    return refreshed
  },

  async rescheduleFromIncident(input: {
    packageId: string
    deliveryId: string
    dateISO: string
    failureNotes?: string
    failureReasonId?: string
  }): Promise<Delivery> {
    const { packageId, deliveryId, dateISO } = input
    const pkg = storageService.getPackages().find((item) => item.id === packageId)
    if (!pkg) throw new Error('Paquete no encontrado')

    const failureReasonId = input.failureReasonId ?? pkg.failureReasonId ?? 'fr_1'
    const trimmedNotes = (input.failureNotes ?? pkg.failureNotes ?? '').trim()
    if (!trimmedNotes) {
      throw new Error('El paquete no tiene observación registrada del intento fallido')
    }

    const delivery = storageService.getDeliveries().find((item) => item.id === deliveryId)
    if (!delivery) throw new Error('Reparto no encontrado')

    const onThisInProgress =
      delivery.status === 'in_progress' &&
      delivery.stops.some((stop) => stop.packageId === packageId)

    if (onThisInProgress) {
      return this.rescheduleStop(deliveryId, packageId, {
        failureReasonId,
        failureNotes: trimmedNotes,
        dateISO,
      })
    }

    const dateLabel = formatDeliveryDateDisplay(dateISO)
    await packagesService.reschedule(packageId, dateLabel, {
      failureReasonId,
      failureNotes: trimmedNotes,
      deliveryCode: delivery.code,
    })
    return this.addPackage(deliveryId, packageId)
  },

  getTotalWeight(delivery: Delivery): number {
    const packages = storageService.getPackages()
    return delivery.stops.reduce((sum, stop) => {
      const pkg = packages.find((item) => item.id === stop.packageId)
      return sum + (pkg?.weight ?? 0)
    }, 0)
  },

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    await delay()
    storageService.seedIfNeeded()
    const packages = storageService.getPackages()
    const deliveries = storageService.getDeliveries()
    const today = todayISODate()

    const activeDeliveries = deliveries.filter((delivery) =>
      ACTIVE_DELIVERY_STATUSES.includes(delivery.status),
    )
    const inRouteIds = new Set(
      activeDeliveries
        .filter((delivery) => delivery.status === 'in_progress')
        .flatMap((delivery) => delivery.stops.map((stop) => stop.packageId)),
    )

    return {
      pendingPackages: packages.filter((pkg) => pkg.status === 'pending').length,
      assignedPackages: packages.filter((pkg) => pkg.status === 'assigned').length,
      activeDeliveries: activeDeliveries.filter((delivery) => delivery.status === 'in_progress').length,
      deliveredToday: packages.filter(
        (pkg) => pkg.status === 'delivered' && pkg.updatedAt && isSameDayISO(pkg.updatedAt, today),
      ).length,
      notDeliveredToday: packages.filter(
        (pkg) => pkg.status === 'not_delivered' && pkg.updatedAt && isSameDayISO(pkg.updatedAt, today),
      ).length,
      totalWeightInRoute: roundMoney(
        packages
          .filter((pkg) => inRouteIds.has(pkg.id))
          .reduce((sum, pkg) => sum + pkg.weight, 0),
        2,
      ),
    }
  },
}
