import * as XLSX from 'xlsx'
import {
  DESTINATION_LABELS,
  PACKAGE_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from '@/constants/labels'
import type { Package, Person, PersonPackageStats } from '@/types'
import { formatAddressLine } from '@/utils/address-details'
import { formatDateTime } from '@/utils/date'
import { formatArs, formatUsd } from '@/utils/money'

export interface PersonReportContext {
  person: Person
  stats: PersonPackageStats
  packages: Package[]
}

function sanitizeFileName(value: string): string {
  return value.replace(/[^\w.-]+/g, '_')
}

function buildSummaryRows(context: PersonReportContext) {
  const { person, stats } = context

  const rows: Array<[string, string]> = [
    ['Reporte de cliente', ''],
    ['Nombre', person.name],
    ['Teléfono', person.phone],
    [
      'Dirección',
      formatAddressLine({
        address: person.address,
        city: person.city,
        province: person.province,
        postalCode: person.postalCode,
        unit: person.addressUnit,
        bell: person.addressBell,
        placeType: person.addressPlaceType,
      }),
    ],
    ['Zona', DESTINATION_LABELS[person.destinationType]],
    ['Estado', person.status === 'active' ? 'Activo' : 'Inactivo'],
    ['', ''],
    ['Resumen de paquetes', ''],
    ['Total paquetes', String(stats.packageCount)],
    ['Entregados', String(stats.deliveredCount)],
    ['Activos', String(stats.activeCount)],
    ['Pagos pendientes', String(stats.pendingPaymentCount)],
    ['Total USD', formatUsd(stats.totalUsd)],
    ['Total ARS', formatArs(stats.totalArs)],
    ['Cobrado (pagado)', formatArs(stats.paidArs)],
    ['A cobrar (efectivo)', formatArs(stats.cashArs)],
    ['Pendiente de pago', formatArs(stats.pendingArs)],
    ['Transferencia', formatArs(stats.transferArs)],
    ['Dólares billete', formatUsd(stats.usdCashUsd)],
    ['Último movimiento', stats.lastPackageAt ? formatDateTime(stats.lastPackageAt) : '—'],
    ['Generado', formatDateTime(new Date().toISOString())],
  ]

  if (person.notes?.trim()) {
    rows.push(['Notas', person.notes.trim()])
  }

  return rows
}

function buildPackagesRows(packages: Package[]) {
  const header = [
    'Código SH',
    'Estado',
    'Pago',
    'Peso (kg)',
    'Total USD',
    'Total ARS',
    'Dirección',
    'Localidad',
    'Provincia',
    'CP',
    'Zona',
    'Creado',
    'Actualizado',
    'Notas',
  ]

  const rows = packages.map((pkg) => [
    pkg.shCode,
    PACKAGE_STATUS_LABELS[pkg.status],
    PAYMENT_STATUS_LABELS[pkg.paymentStatus],
    pkg.weight,
    pkg.totalUsd,
    pkg.totalArs,
    pkg.address,
    pkg.city,
    pkg.province,
    pkg.postalCode,
    DESTINATION_LABELS[pkg.destinationType],
    formatDateTime(pkg.createdAt),
    formatDateTime(pkg.updatedAt),
    pkg.notes ?? '',
  ])

  return [header, ...rows]
}

export function downloadPersonReportExcel(context: PersonReportContext) {
  const workbook = XLSX.utils.book_new()
  const summarySheet = XLSX.utils.aoa_to_sheet(buildSummaryRows(context))
  const packagesSheet = XLSX.utils.aoa_to_sheet(buildPackagesRows(context.packages))

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen')
  XLSX.utils.book_append_sheet(workbook, packagesSheet, 'Paquetes')

  const fileName = sanitizeFileName(`cliente_${context.person.name}_${new Date().toISOString().slice(0, 10)}.xlsx`)
  XLSX.writeFile(workbook, fileName)
}

export function downloadAllPersonsReportExcel(items: PersonReportContext[]) {
  const workbook = XLSX.utils.book_new()
  const header = [
    'Cliente',
    'Teléfono',
    'Zona',
    'Paquetes',
    'Entregados',
    'Activos',
    'Total USD',
    'Total ARS',
    'Cobrado',
    'Efectivo',
    'Pendiente',
    'Transferencia',
  ]

  const rows = items.map(({ person, stats }) => [
    person.name,
    person.phone,
    DESTINATION_LABELS[person.destinationType],
    stats.packageCount,
    stats.deliveredCount,
    stats.activeCount,
    stats.totalUsd,
    stats.totalArs,
    stats.paidArs,
    stats.cashArs,
    stats.pendingArs,
    stats.transferArs,
  ])

  const sheet = XLSX.utils.aoa_to_sheet([header, ...rows])
  XLSX.utils.book_append_sheet(workbook, sheet, 'Clientes')
  XLSX.writeFile(workbook, sanitizeFileName(`clientes_${new Date().toISOString().slice(0, 10)}.xlsx`))
}
