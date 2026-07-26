import * as XLSX from 'xlsx'
import {
  DELIVERY_CHANNEL_LABELS,
  DELIVERY_STATUS_LABELS,
  DELIVERY_ZONE_LABELS,
  DESTINATION_LABELS,
  PAYMENT_STATUS_LABELS,
} from '@/constants/labels'
import type { Courier, Delivery, Driver, Package, Vehicle } from '@/types'
import { getStopAddressParts } from '@/utils/delivery-address'
import { formatDateTime, formatDeliveryDateDisplay } from '@/utils/date'
import { formatArs } from '@/utils/money'
import { formatFullAddress } from '@/utils/maps'

const STOP_STATUS_LABELS: Record<Delivery['stops'][number]['status'], string> = {
  pending: 'Pendiente',
  delivered: 'Entregado',
  not_delivered: 'No entregado',
  skipped: 'Omitido',
}

export interface DeliveryReportContext {
  delivery: Delivery
  packagesById: Map<string, Package>
  driver?: Partial<Pick<Driver, 'name' | 'phone' | 'email'>>
  courier?: Pick<Courier, 'name' | 'branchName' | 'address' | 'city' | 'province' | 'postalCode'>
  vehicle?: Pick<Vehicle, 'name' | 'plate'>
  failureReasons?: Map<string, string>
}

function sanitizeFileName(value: string): string {
  return value.replace(/[^\w.-]+/g, '_')
}

function stopObservation(
  stop: Delivery['stops'][number],
  pkg: Package | undefined,
  failureReasons: Map<string, string>,
): string {
  if (stop.status === 'not_delivered') {
    if (pkg?.failureNotes?.trim()) return pkg.failureNotes.trim()
    if (pkg?.failureReasonId) {
      return failureReasons.get(pkg.failureReasonId) ?? pkg.failureReasonId
    }
    return stop.notes ?? ''
  }
  if (stop.status === 'delivered' && stop.notes?.trim()) return stop.notes.trim()
  if (pkg?.notes && !pkg.notes.toLowerCase().startsWith('reprogramado para')) return pkg.notes
  return stop.notes ?? ''
}

function buildSummaryRows(context: DeliveryReportContext) {
  const { delivery, driver, courier, vehicle } = context
  const stops = delivery.stops.slice().sort((a, b) => a.order - b.order)
  const delivered = stops.filter((stop) => stop.status === 'delivered').length
  const notDelivered = stops.filter((stop) => stop.status === 'not_delivered').length
  const pending = stops.filter((stop) => stop.status === 'pending').length
  const skipped = stops.filter((stop) => stop.status === 'skipped').length

  const rows: Array<[string, string]> = [
    ['Reporte de reparto', ''],
    ['Código', delivery.code],
    ['Fecha', formatDeliveryDateDisplay(delivery.date)],
    ['Estado', DELIVERY_STATUS_LABELS[delivery.status]],
    ['Canal', DELIVERY_CHANNEL_LABELS[delivery.channel]],
    ['Zona', DELIVERY_ZONE_LABELS[delivery.zone]],
    ['Chofer', driver?.name ?? '—'],
    ['Teléfono chofer', driver?.phone ?? '—'],
    ['Vehículo', vehicle ? `${vehicle.name} (${vehicle.plate})` : '—'],
  ]

  if (courier) {
    rows.push(
      ['Correo', courier.name],
      ['Sucursal', courier.branchName],
      ['Dirección correo', formatFullAddress(courier)],
    )
  }

  rows.push(
    ['Total paradas', String(stops.length)],
    ['Entregados', String(delivered)],
    ['No entregados', String(notDelivered)],
    ['Pendientes', String(pending)],
    ['Omitidos', String(skipped)],
    ['Generado', formatDateTime(new Date().toISOString())],
  )

  if (delivery.notes?.trim()) {
    rows.push(['Notas del reparto', delivery.notes.trim()])
  }

  return rows
}

function buildStopsRows(context: DeliveryReportContext) {
  const { delivery, packagesById, failureReasons = new Map() } = context
  const header = [
    'Orden',
    'Código SH',
    'Destinatario',
    'Teléfono',
    'Dirección',
    'Localidad',
    'Provincia',
    'CP',
    'Destino',
    'Estado',
    'Fecha / hora',
    'Pago',
    'Importe ARS',
    'Peso (kg)',
    'Observación',
  ]

  const rows = delivery.stops
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((stop) => {
      const pkg = packagesById.get(stop.packageId)
      const addressParts = pkg ? getStopAddressParts(pkg, stop) : null
      const attemptedAt = stop.attemptedAt
        ? formatDateTime(stop.attemptedAt)
        : stop.status === 'pending'
          ? ''
          : pkg?.lastAttemptAt
            ? formatDateTime(pkg.lastAttemptAt)
            : ''

      return [
        stop.order,
        pkg?.shCode ?? stop.packageId,
        pkg?.ownerName ?? '—',
        pkg?.ownerPhone ?? '—',
        addressParts?.address ?? '—',
        addressParts?.city ?? '—',
        addressParts?.province ?? '—',
        addressParts?.postalCode ?? '—',
        pkg ? DESTINATION_LABELS[pkg.destinationType] : '—',
        STOP_STATUS_LABELS[stop.status],
        attemptedAt,
        pkg ? PAYMENT_STATUS_LABELS[pkg.paymentStatus] : '—',
        pkg ? formatArs(pkg.totalArs) : '—',
        pkg?.weight ?? '—',
        pkg ? stopObservation(stop, pkg, failureReasons) : '',
      ]
    })

  return [header, ...rows]
}

export function downloadDeliveryReportExcel(context: DeliveryReportContext): void {
  const workbook = XLSX.utils.book_new()

  const summarySheet = XLSX.utils.aoa_to_sheet(buildSummaryRows(context))
  summarySheet['!cols'] = [{ wch: 22 }, { wch: 48 }]
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen')

  const stopsSheet = XLSX.utils.aoa_to_sheet(buildStopsRows(context))
  stopsSheet['!cols'] = [
    { wch: 8 },
    { wch: 12 },
    { wch: 24 },
    { wch: 16 },
    { wch: 36 },
    { wch: 18 },
    { wch: 16 },
    { wch: 10 },
    { wch: 10 },
    { wch: 14 },
    { wch: 18 },
    { wch: 22 },
    { wch: 14 },
    { wch: 10 },
    { wch: 32 },
  ]
  XLSX.utils.book_append_sheet(workbook, stopsSheet, 'Entregas')

  const fileName = sanitizeFileName(
    `reparto-${context.delivery.code}-${context.delivery.date}.xlsx`,
  )
  XLSX.writeFile(workbook, fileName)
}

export function canDownloadDeliveryReport(delivery: Delivery): boolean {
  return delivery.stops.length > 0
}

export function canEditDelivery(delivery: Delivery): boolean {
  return delivery.status !== 'completed' && delivery.status !== 'cancelled'
}

export function buildDeliveryReportContext(input: {
  delivery: Delivery
  packagesById: Map<string, Package>
  driver?: Partial<Pick<Driver, 'name' | 'phone' | 'email'>>
  courier?: Pick<Courier, 'name' | 'branchName' | 'address' | 'city' | 'province' | 'postalCode'>
  vehicle?: Pick<Vehicle, 'name' | 'plate'>
  failureReasons?: Map<string, string>
}): DeliveryReportContext {
  return input
}
