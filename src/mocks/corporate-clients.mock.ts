import type { DestinationType, Package, PaymentStatus, Person } from '@/types'
import { calculatePackageTotals } from '@/utils/money'

const createdAt = '2025-05-15T10:00:00.000Z'

export const corporateClientsMock: Person[] = [
  {
    id: 'per_021',
    name: 'Fravega S.A.',
    phone: '+54 11 4000-0800',
    address: 'Avenida Córdoba 4501',
    city: 'Buenos Aires',
    province: 'CABA',
    postalCode: '1188',
    destinationType: 'caba',
    notes: 'Cliente corporativo · cadena retail · entregas en depósito y sucursales',
    status: 'active',
    createdAt,
    updatedAt: createdAt,
  },
  {
    id: 'per_022',
    name: 'CompraGamer',
    phone: '+54 11 4951-6000',
    address: 'Avenida Caseros 3039',
    city: 'Buenos Aires',
    province: 'CABA',
    postalCode: '1264',
    destinationType: 'caba',
    notes: 'Cliente corporativo · tecnología · recepción depósito Parque Patricios',
    status: 'active',
    createdAt,
    updatedAt: createdAt,
  },
  {
    id: 'per_023',
    name: 'Garbarino',
    phone: '+54 11 4009-0100',
    address: 'Avenida Corrientes 3247',
    city: 'Buenos Aires',
    province: 'CABA',
    postalCode: '1193',
    destinationType: 'caba',
    notes: 'Cliente corporativo · retail · múltiples sucursales CABA',
    status: 'active',
    createdAt,
    updatedAt: createdAt,
  },
  {
    id: 'per_024',
    name: 'Musimundo',
    phone: '+54 11 4000-0800',
    address: 'Avenida Rivadavia 5861',
    city: 'Buenos Aires',
    province: 'CABA',
    postalCode: '1424',
    destinationType: 'caba',
    notes: 'Cliente corporativo · electro · flota propia de recepción',
    status: 'active',
    createdAt,
    updatedAt: createdAt,
  },
  {
    id: 'per_025',
    name: 'Mercado Libre',
    phone: '+54 11 5354-8000',
    address: 'Ruta Panamericana Km 37,5',
    city: 'Garín',
    province: 'Buenos Aires',
    postalCode: '1619',
    destinationType: 'gba',
    notes: 'Cliente corporativo · fulfillment · alto volumen diario',
    status: 'active',
    createdAt,
    updatedAt: createdAt,
  },
  {
    id: 'per_026',
    name: 'Falabella Argentina',
    phone: '+54 11 4000-5200',
    address: 'Avenida Juan B. Justo 8000',
    city: 'Villa Lynch',
    province: 'Buenos Aires',
    postalCode: '1676',
    destinationType: 'gba',
    notes: 'Cliente corporativo · retail · cross-docking GBA oeste',
    status: 'active',
    createdAt,
    updatedAt: createdAt,
  },
]

interface ClientAddress {
  address: string
  city: string
  province: string
  postalCode: string
  destinationType: DestinationType
}

interface CorporatePackageSeed {
  personId: string
  ownerName: string
  ownerPhone: string
  address: ClientAddress
  weight: number
  paymentStatus: PaymentStatus
  daysAgo: number
  notes?: string
}

const fravega = corporateClientsMock[0]!
const compragamer = corporateClientsMock[1]!
const garbarino = corporateClientsMock[2]!
const musimundo = corporateClientsMock[3]!
const mercadolibre = corporateClientsMock[4]!
const falabella = corporateClientsMock[5]!

const fravegaAddresses: ClientAddress[] = [
  { address: 'Avenida Córdoba 4501', city: 'Buenos Aires', province: 'CABA', postalCode: '1188', destinationType: 'caba' },
  { address: 'Avenida Santa Fe 3200', city: 'Buenos Aires', province: 'CABA', postalCode: '1425', destinationType: 'caba' },
  { address: 'Avenida Cabildo 2500', city: 'Buenos Aires', province: 'CABA', postalCode: '1428', destinationType: 'caba' },
  { address: 'Avenida Rivadavia 6402', city: 'Buenos Aires', province: 'CABA', postalCode: '1406', destinationType: 'caba' },
]

const compragamerAddresses: ClientAddress[] = [
  { address: 'Avenida Caseros 3039', city: 'Buenos Aires', province: 'CABA', postalCode: '1264', destinationType: 'caba' },
  { address: 'Avenida Caseros 3039, Depósito B', city: 'Buenos Aires', province: 'CABA', postalCode: '1264', destinationType: 'caba' },
]

const garbarinoAddresses: ClientAddress[] = [
  { address: 'Avenida Corrientes 3247', city: 'Buenos Aires', province: 'CABA', postalCode: '1193', destinationType: 'caba' },
  { address: 'Avenida Cabildo 1800', city: 'Buenos Aires', province: 'CABA', postalCode: '1428', destinationType: 'caba' },
  { address: 'Avenida Scalabrini Ortiz 900', city: 'Buenos Aires', province: 'CABA', postalCode: '1414', destinationType: 'caba' },
]

const musimundoAddresses: ClientAddress[] = [
  { address: 'Avenida Rivadavia 5861', city: 'Buenos Aires', province: 'CABA', postalCode: '1424', destinationType: 'caba' },
  { address: 'Avenida Corrientes 5500', city: 'Buenos Aires', province: 'CABA', postalCode: '1414', destinationType: 'caba' },
]

const mlAddresses: ClientAddress[] = [
  { address: 'Ruta Panamericana Km 37,5', city: 'Garín', province: 'Buenos Aires', postalCode: '1619', destinationType: 'gba' },
  { address: 'Colectora Panamericana 36600', city: 'Tortuguitas', province: 'Buenos Aires', postalCode: '1667', destinationType: 'gba' },
  { address: 'Avenida General Paz 12500', city: 'San Martín', province: 'Buenos Aires', postalCode: '1650', destinationType: 'gba' },
]

const falabellaAddresses: ClientAddress[] = [
  { address: 'Avenida Juan B. Justo 8000', city: 'Villa Lynch', province: 'Buenos Aires', postalCode: '1676', destinationType: 'gba' },
  { address: 'Avenida Juan B. Justo 8000, Muelle 3', city: 'Villa Lynch', province: 'Buenos Aires', postalCode: '1676', destinationType: 'gba' },
]

/** Paquetes entregados por cliente corporativo (IDs pkg_081 en adelante). */
const corporatePackageSeeds: CorporatePackageSeed[] = [
  // Fravega — 12 entregados
  ...Array.from({ length: 12 }, (_, i) => ({
    personId: fravega.id,
    ownerName: fravega.name,
    ownerPhone: fravega.phone,
    address: fravegaAddresses[i % fravegaAddresses.length]!,
    weight: Number((3.5 + (i % 5) * 2.2).toFixed(2)),
    paymentStatus: (i % 3 === 0 ? 'transfer' : 'paid') as PaymentStatus,
    daysAgo: 45 - i * 3,
    notes: i % 4 === 0 ? 'Recepción depósito · factura A' : undefined,
  })),
  // CompraGamer — 10 entregados
  ...Array.from({ length: 10 }, (_, i) => ({
    personId: compragamer.id,
    ownerName: compragamer.name,
    ownerPhone: compragamer.phone,
    address: compragamerAddresses[i % compragamerAddresses.length]!,
    weight: Number((1.2 + (i % 4) * 0.8).toFixed(2)),
    paymentStatus: 'paid' as PaymentStatus,
    daysAgo: 38 - i * 2,
    notes: i % 3 === 0 ? 'Hardware · frágil' : undefined,
  })),
  // Garbarino — 8 entregados
  ...Array.from({ length: 8 }, (_, i) => ({
    personId: garbarino.id,
    ownerName: garbarino.name,
    ownerPhone: garbarino.phone,
    address: garbarinoAddresses[i % garbarinoAddresses.length]!,
    weight: Number((2 + (i % 6) * 1.5).toFixed(2)),
    paymentStatus: (i % 2 === 0 ? 'paid' : 'transfer') as PaymentStatus,
    daysAgo: 52 - i * 4,
  })),
  // Musimundo — 8 entregados
  ...Array.from({ length: 8 }, (_, i) => ({
    personId: musimundo.id,
    ownerName: musimundo.name,
    ownerPhone: musimundo.phone,
    address: musimundoAddresses[i % musimundoAddresses.length]!,
    weight: Number((4 + (i % 4) * 2.5).toFixed(2)),
    paymentStatus: 'transfer' as PaymentStatus,
    daysAgo: 41 - i * 3,
    notes: i === 0 ? 'Electrodomésticos · doble bulto' : undefined,
  })),
  // Mercado Libre — 14 entregados + 1 pendiente (activo)
  ...Array.from({ length: 15 }, (_, i) => ({
    personId: mercadolibre.id,
    ownerName: mercadolibre.name,
    ownerPhone: mercadolibre.phone,
    address: mlAddresses[i % mlAddresses.length]!,
    weight: Number((0.8 + (i % 8) * 0.6).toFixed(2)),
    paymentStatus: 'paid' as PaymentStatus,
    daysAgo: i === 14 ? 1 : 60 - i * 3,
    notes: i % 5 === 0 ? 'Fulfillment · lote consolidado' : undefined,
  })),
  // Falabella — 6 entregados
  ...Array.from({ length: 6 }, (_, i) => ({
    personId: falabella.id,
    ownerName: falabella.name,
    ownerPhone: falabella.phone,
    address: falabellaAddresses[i % falabellaAddresses.length]!,
    weight: Number((2.5 + (i % 3) * 1.8).toFixed(2)),
    paymentStatus: (i % 2 === 0 ? 'transfer' : 'paid') as PaymentStatus,
    daysAgo: 28 - i * 2,
  })),
]

const CORPORATE_PACKAGE_START = 81

export function createCorporateClientPackages(): Package[] {
  const now = new Date()

  return corporatePackageSeeds.map((seed, index) => {
    const n = CORPORATE_PACKAGE_START + index
    const isPending = n === 133

    const deliveredAt = new Date(now)
    deliveredAt.setDate(deliveredAt.getDate() - seed.daysAgo)
    deliveredAt.setHours(10 + (index % 6), (index * 7) % 60, 0, 0)

    const created = new Date(deliveredAt)
    created.setDate(created.getDate() - 2)

    const pricePerKgUsd = Number((4.2 + (index % 6) * 0.5).toFixed(2))
    const usdRate = 1501
    const totals = calculatePackageTotals(seed.weight, pricePerKgUsd, usdRate)

    return {
      id: `pkg_${String(n).padStart(3, '0')}`,
      shCode: `SH${10000 + n}`,
      personId: seed.personId,
      ownerName: seed.ownerName,
      ownerPhone: seed.ownerPhone,
      weight: seed.weight,
      address: seed.address.address,
      city: seed.address.city,
      province: seed.address.province,
      postalCode: seed.address.postalCode,
      destinationType: seed.address.destinationType,
      status: isPending ? 'pending' : 'delivered',
      pricePerKgUsd,
      usdRate,
      totalUsd: totals.totalUsd,
      totalArs: totals.totalArs,
      paymentStatus: seed.paymentStatus,
      notes: seed.notes,
      createdAt: created.toISOString(),
      updatedAt: deliveredAt.toISOString(),
    }
  })
}

/** Repartos históricos completados para paquetes corporativos. */
export const corporateDeliveryPackageIds = {
  fravegaBatch1: ['pkg_081', 'pkg_082', 'pkg_083', 'pkg_084', 'pkg_085', 'pkg_086'],
  fravegaBatch2: ['pkg_087', 'pkg_088', 'pkg_089', 'pkg_090', 'pkg_091', 'pkg_092'],
  compragamer: ['pkg_093', 'pkg_094', 'pkg_095', 'pkg_096', 'pkg_097', 'pkg_098', 'pkg_099', 'pkg_100', 'pkg_101', 'pkg_102'],
  garbarino: ['pkg_103', 'pkg_104', 'pkg_105', 'pkg_106', 'pkg_107', 'pkg_108', 'pkg_109', 'pkg_110'],
  musimundo: ['pkg_111', 'pkg_112', 'pkg_113', 'pkg_114', 'pkg_115', 'pkg_116', 'pkg_117', 'pkg_118'],
  mercadolibreBatch1: ['pkg_119', 'pkg_120', 'pkg_121', 'pkg_122', 'pkg_123', 'pkg_124', 'pkg_125', 'pkg_126'],
  mercadolibreBatch2: ['pkg_127', 'pkg_128', 'pkg_129', 'pkg_130', 'pkg_131', 'pkg_132'],
  falabella: ['pkg_134', 'pkg_135', 'pkg_136', 'pkg_137', 'pkg_138', 'pkg_139'],
} as const
