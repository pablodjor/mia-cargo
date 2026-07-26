import * as XLSX from 'xlsx'
import {
  DESTINATION_LABELS,
  PACKAGE_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from '@/constants/labels'
import type { Package } from '@/types'
import { formatDateTime } from '@/utils/date'
import { formatArs, formatUsd } from '@/utils/money'
import { formatFullAddress } from '@/utils/maps'
import {
  computePaymentReportStats,
  paymentSummaryAmountLabel,
  type PaymentReportStats,
} from '@/utils/payment-stats'

function sanitizeFileName(value: string): string {
  return value.replace(/[^\w.-]+/g, '_')
}

function buildSummaryRows(stats: PaymentReportStats): string[][] {
  const rows: string[][] = [
    ['Reporte de cobranzas', ''],
    ['Total paquetes', String(stats.totalPackages)],
    ['A cobrar ARS (efectivo + sin definir + transferencia)', formatArs(stats.toCollectArs)],
    ['A cobrar USD billete', formatUsd(stats.toCollectUsd)],
    ['', ''],
    ['Forma de pago', 'Cantidad', 'Total ARS', 'Total USD'],
  ]

  for (const item of stats.byStatus) {
    rows.push([
      PAYMENT_STATUS_LABELS[item.status],
      String(item.count),
      item.count > 0 ? formatArs(item.totalArs) : '—',
      item.status === 'usd_cash' && item.count > 0
        ? formatUsd(item.totalUsd)
        : item.count > 0
          ? formatUsd(item.totalUsd)
          : '—',
    ])
  }

  rows.push(['Generado', formatDateTime(new Date().toISOString())])
  return rows
}

function buildDetailRows(packages: Package[]) {
  return packages.map((pkg) => [
    pkg.shCode,
    pkg.ownerName,
    pkg.ownerPhone,
    PACKAGE_STATUS_LABELS[pkg.status],
    PAYMENT_STATUS_LABELS[pkg.paymentStatus],
    formatUsd(pkg.totalUsd),
    formatArs(pkg.totalArs),
    DESTINATION_LABELS[pkg.destinationType],
    formatFullAddress(pkg),
    pkg.city,
    pkg.province,
    formatDateTime(pkg.updatedAt),
  ])
}

export function downloadPaymentsReportExcel(packages: Package[]): void {
  const stats = computePaymentReportStats(packages)
  const workbook = XLSX.utils.book_new()

  const summarySheet = XLSX.utils.aoa_to_sheet(buildSummaryRows(stats))
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen')

  const detailSheet = XLSX.utils.aoa_to_sheet([
    [
      'Código SH',
      'Destinatario',
      'Teléfono',
      'Estado paquete',
      'Forma de pago',
      'Total USD',
      'Total ARS',
      'Zona',
      'Dirección',
      'Localidad',
      'Provincia',
      'Última actualización',
    ],
    ...buildDetailRows(packages),
  ])
  XLSX.utils.book_append_sheet(workbook, detailSheet, 'Detalle')

  const stamp = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(workbook, sanitizeFileName(`cobranzas_${stamp}.xlsx`))
}

export { paymentSummaryAmountLabel }
