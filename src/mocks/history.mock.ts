import type { HistoryEntry, Package } from '@/types'
import { normalizePackageDeliveryLink } from '@/utils/package-delivery-info'
import { deliveriesMock } from './deliveries.mock'
import { packagesMock } from './packages.mock'
import { addDaysISODate, todayISODate } from '@/utils/date'

function deliveryCode(id: string): string {
  return deliveriesMock.find((delivery) => delivery.id === id)?.code ?? id
}

function syncPackagesWithDeliveries(packages: Package[]): Package[] {
  const byId = new Map(packages.map((pkg) => [pkg.id, { ...pkg }]))
  const packagesInDeliveries = new Set<string>()

  for (const delivery of deliveriesMock) {
    for (const stop of delivery.stops) {
      const pkg = byId.get(stop.packageId)
      if (!pkg) continue

      packagesInDeliveries.add(stop.packageId)

      if (delivery.status === 'cancelled') {
        if (pkg.status !== 'cancelled' && pkg.status !== 'delivered') {
          pkg.status = 'pending'
          pkg.deliveryId = undefined
        }
        continue
      }

      if (
        (pkg.status === 'delivered' || pkg.status === 'cancelled') &&
        stop.status !== 'delivered'
      ) {
        continue
      }

      pkg.deliveryId = delivery.id

      if (delivery.channel === 'courier') {
        if (pkg.paymentStatus === 'cash' || pkg.paymentStatus === 'usd_cash' || pkg.paymentStatus === 'pending') {
          pkg.paymentStatus = 'transfer'
        }
      }

      if (stop.status === 'delivered') {
        pkg.status = 'delivered'
      } else if (stop.status === 'not_delivered') {
        pkg.status = 'not_delivered'
        pkg.failureReasonId = pkg.failureReasonId ?? 'fr_1'
        pkg.lastAttemptAt = stop.attemptedAt
      } else if (delivery.status === 'in_progress') {
        pkg.status = 'in_route'
      } else if (delivery.status === 'prepared' || delivery.status === 'draft') {
        pkg.status = 'assigned'
      } else if (delivery.status === 'completed' && stop.status === 'pending') {
        pkg.status = 'rescheduled'
      }
    }
  }

  for (const pkg of byId.values()) {
    if (!packagesInDeliveries.has(pkg.id)) {
      const normalized = normalizePackageDeliveryLink(pkg)
      byId.set(pkg.id, normalized)
    }
  }

  const activeDeliveryCode = deliveryCode('del_1')
  const pkg005 = byId.get('pkg_005')
  if (pkg005?.failedAttempts) {
    pkg005.failedAttempts = pkg005.failedAttempts.map((attempt) => ({
      ...attempt,
      deliveryCode: activeDeliveryCode,
    }))
  }

  return Array.from(byId.values()).map(normalizePackageDeliveryLink)
}

export const seededPackagesMock: Package[] = syncPackagesWithDeliveries(packagesMock)

const today = todayISODate()
const yesterday = addDaysISODate(-1)
const oldDate = addDaysISODate(-12)

export const historyMock: HistoryEntry[] = [
  {
    id: 'hist_1',
    createdAt: `${yesterday}T08:00:00.000Z`,
    userId: 'usr_op1',
    userName: 'Diego Soto',
    action: 'delivery_created',
    entity: 'delivery',
    entityId: 'del_3',
    relatedCode: deliveryCode('del_3'),
    newStatus: 'prepared',
    description: `Se creó el reparto ${deliveryCode('del_3')}`,
  },
  {
    id: 'hist_2',
    createdAt: `${yesterday}T17:45:00.000Z`,
    userId: 'usr_drv3',
    userName: 'Martín Rivas',
    action: 'delivery_completed',
    entity: 'delivery',
    entityId: 'del_3',
    relatedCode: deliveryCode('del_3'),
    previousStatus: 'in_progress',
    newStatus: 'completed',
    description: 'Reparto finalizado',
  },
  {
    id: 'hist_3',
    createdAt: `${today}T07:10:00.000Z`,
    userId: 'usr_op1',
    userName: 'Diego Soto',
    action: 'delivery_created',
    entity: 'delivery',
    entityId: 'del_1',
    relatedCode: deliveryCode('del_1'),
    newStatus: 'prepared',
    description: 'Se preparó el reparto activo de CABA',
  },
  {
    id: 'hist_4',
    createdAt: `${today}T09:00:00.000Z`,
    userId: 'usr_drv1',
    userName: 'Carlos Méndez',
    action: 'delivery_started',
    entity: 'delivery',
    entityId: 'del_1',
    relatedCode: deliveryCode('del_1'),
    previousStatus: 'prepared',
    newStatus: 'in_progress',
    description: 'Chofer inició el reparto',
  },
  {
    id: 'hist_5',
    createdAt: `${today}T11:10:00.000Z`,
    userId: 'usr_drv1',
    userName: 'Carlos Méndez',
    action: 'package_delivered',
    entity: 'package',
    entityId: 'pkg_003',
    relatedCode: 'SH10003',
    previousStatus: 'in_route',
    newStatus: 'delivered',
    description: 'Paquete marcado como entregado',
  },
  {
    id: 'hist_6',
    createdAt: `${today}T11:20:00.000Z`,
    userId: 'usr_drv1',
    userName: 'Carlos Méndez',
    action: 'package_not_delivered',
    entity: 'package',
    entityId: 'pkg_005',
    relatedCode: 'SH10005',
    previousStatus: 'in_route',
    newStatus: 'not_delivered',
    description: 'No se pudo entregar: destinatario ausente',
  },
  {
    id: 'hist_7',
    createdAt: `${oldDate}T10:00:00.000Z`,
    userId: 'usr_admin',
    userName: 'Ana Martínez',
    action: 'delivery_cancelled',
    entity: 'delivery',
    entityId: 'del_5',
    relatedCode: deliveryCode('del_5'),
    previousStatus: 'prepared',
    newStatus: 'cancelled',
    description: 'Reparto cancelado por falta de unidad',
  },
  {
    id: 'hist_8',
    createdAt: `${today}T08:00:00.000Z`,
    userId: 'usr_op2',
    userName: 'Valentina Ruiz',
    action: 'delivery_prepared',
    entity: 'delivery',
    entityId: 'del_2',
    relatedCode: deliveryCode('del_2'),
    previousStatus: 'draft',
    newStatus: 'prepared',
    description: 'Reparto GBA marcado como preparado',
  },
]
