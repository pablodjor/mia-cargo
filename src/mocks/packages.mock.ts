import type { DestinationType, Package, PackageStatus, PaymentStatus } from '@/types'
import { calculatePackageTotals } from '@/utils/money'
import { formatFullName } from '@/utils/person-name'
import { createCorporateClientPackages } from './corporate-clients.mock'
import { withPackageOwner } from './legacy-name'
import { personsMock } from './persons.mock'

interface SeedAddress {
  address: string
  city: string
  province: string
  postalCode: string
  destinationType: DestinationType
}

/** Direcciones reales y geocodificables en Google Maps (sin piso/depto en la calle). */
const cabaAddresses: SeedAddress[] = [
  {
    address: 'Avenida Corrientes 3247',
    city: 'Buenos Aires',
    province: 'CABA',
    postalCode: '1193',
    destinationType: 'caba',
  },
  {
    address: 'Avenida Santa Fe 1860',
    city: 'Buenos Aires',
    province: 'CABA',
    postalCode: '1123',
    destinationType: 'caba',
  },
  {
    address: 'Calle Florida 100',
    city: 'Buenos Aires',
    province: 'CABA',
    postalCode: '1005',
    destinationType: 'caba',
  },
  {
    address: 'Avenida Rivadavia 4830',
    city: 'Buenos Aires',
    province: 'CABA',
    postalCode: '1424',
    destinationType: 'caba',
  },
  {
    address: 'Avenida Cabildo 2202',
    city: 'Buenos Aires',
    province: 'CABA',
    postalCode: '1428',
    destinationType: 'caba',
  },
  {
    address: 'Calle Thames 1785',
    city: 'Buenos Aires',
    province: 'CABA',
    postalCode: '1414',
    destinationType: 'caba',
  },
  {
    address: 'Avenida Callao 1156',
    city: 'Buenos Aires',
    province: 'CABA',
    postalCode: '1023',
    destinationType: 'caba',
  },
  {
    address: 'Avenida Córdoba 3200',
    city: 'Buenos Aires',
    province: 'CABA',
    postalCode: '1187',
    destinationType: 'caba',
  },
  {
    address: 'Avenida Scalabrini Ortiz 1702',
    city: 'Buenos Aires',
    province: 'CABA',
    postalCode: '1414',
    destinationType: 'caba',
  },
  {
    address: 'Avenida del Libertador 4980',
    city: 'Buenos Aires',
    province: 'CABA',
    postalCode: '1426',
    destinationType: 'caba',
  },
  {
    address: 'Calle Honduras 5602',
    city: 'Buenos Aires',
    province: 'CABA',
    postalCode: '1414',
    destinationType: 'caba',
  },
  {
    address: 'Avenida Independencia 1802',
    city: 'Buenos Aires',
    province: 'CABA',
    postalCode: '1225',
    destinationType: 'caba',
  },
  {
    address: 'Calle Defensa 756',
    city: 'Buenos Aires',
    province: 'CABA',
    postalCode: '1065',
    destinationType: 'caba',
  },
  {
    address: 'Avenida Belgrano 1670',
    city: 'Buenos Aires',
    province: 'CABA',
    postalCode: '1093',
    destinationType: 'caba',
  },
  {
    address: 'Calle Billinghurst 1695',
    city: 'Buenos Aires',
    province: 'CABA',
    postalCode: '1425',
    destinationType: 'caba',
  },
]

const gbaAddresses: SeedAddress[] = [
  {
    address: 'Avenida Maipú 2502',
    city: 'Olivos',
    province: 'Buenos Aires',
    postalCode: '1636',
    destinationType: 'gba',
  },
  {
    address: 'Avenida Centenario 589',
    city: 'San Isidro',
    province: 'Buenos Aires',
    postalCode: '1642',
    destinationType: 'gba',
  },
  {
    address: 'Avenida Pres. Perón 2400',
    city: 'San Miguel',
    province: 'Buenos Aires',
    postalCode: '1663',
    destinationType: 'gba',
  },
  {
    address: 'Avenida Rivadavia 17800',
    city: 'Morón',
    province: 'Buenos Aires',
    postalCode: '1708',
    destinationType: 'gba',
  },
  {
    address: 'Avenida Rivadavia 16700',
    city: 'Haedo',
    province: 'Buenos Aires',
    postalCode: '1706',
    destinationType: 'gba',
  },
  {
    address: 'Avenida Calchaquí 3650',
    city: 'Quilmes',
    province: 'Buenos Aires',
    postalCode: '1878',
    destinationType: 'gba',
  },
  {
    address: 'Avenida Hipólito Yrigoyen 8902',
    city: 'Lomas de Zamora',
    province: 'Buenos Aires',
    postalCode: '1832',
    destinationType: 'gba',
  },
  {
    address: 'Calle 50 720',
    city: 'La Plata',
    province: 'Buenos Aires',
    postalCode: '1900',
    destinationType: 'gba',
  },
  {
    address: 'Avenida Mitre 750',
    city: 'Avellaneda',
    province: 'Buenos Aires',
    postalCode: '1870',
    destinationType: 'gba',
  },
  {
    address: 'Avenida San Martín 2150',
    city: 'San Martín',
    province: 'Buenos Aires',
    postalCode: '1650',
    destinationType: 'gba',
  },
  {
    address: 'Avenida Cazón 850',
    city: 'Tigre',
    province: 'Buenos Aires',
    postalCode: '1648',
    destinationType: 'gba',
  },
  {
    address: 'Avenida Santa Fe 2400',
    city: 'Martínez',
    province: 'Buenos Aires',
    postalCode: '1640',
    destinationType: 'gba',
  },
  {
    address: 'Avenida Hipólito Yrigoyen 14400',
    city: 'Banfield',
    province: 'Buenos Aires',
    postalCode: '1828',
    destinationType: 'gba',
  },
  {
    address: 'Avenida 9 de Julio 1500',
    city: 'Lanús',
    province: 'Buenos Aires',
    postalCode: '1824',
    destinationType: 'gba',
  },
  {
    address: 'Avenida Vergara 1900',
    city: 'Villa Ballester',
    province: 'Buenos Aires',
    postalCode: '1653',
    destinationType: 'gba',
  },
]

const interiorAddresses: SeedAddress[] = [
  {
    address: 'Avenida Colón 550',
    city: 'Córdoba',
    province: 'Córdoba',
    postalCode: '5000',
    destinationType: 'interior',
  },
  {
    address: 'Calle Córdoba 1450',
    city: 'Rosario',
    province: 'Santa Fe',
    postalCode: '2000',
    destinationType: 'interior',
  },
  {
    address: 'Avenida Pellegrini 1500',
    city: 'Rosario',
    province: 'Santa Fe',
    postalCode: '2000',
    destinationType: 'interior',
  },
  {
    address: 'Avenida San Martín 1143',
    city: 'Mendoza',
    province: 'Mendoza',
    postalCode: '5500',
    destinationType: 'interior',
  },
  {
    address: 'Calle España 750',
    city: 'Salta',
    province: 'Salta',
    postalCode: '4400',
    destinationType: 'interior',
  },
  {
    address: 'Calle 25 de Mayo 400',
    city: 'San Miguel de Tucumán',
    province: 'Tucumán',
    postalCode: '4000',
    destinationType: 'interior',
  },
  {
    address: 'Avenida Colón 2500',
    city: 'Mar del Plata',
    province: 'Buenos Aires',
    postalCode: '7600',
    destinationType: 'interior',
  },
  {
    address: 'Avenida Colón 150',
    city: 'Bahía Blanca',
    province: 'Buenos Aires',
    postalCode: '8000',
    destinationType: 'interior',
  },
  {
    address: 'Avenida Argentina 250',
    city: 'Neuquén',
    province: 'Neuquén',
    postalCode: '8300',
    destinationType: 'interior',
  },
  {
    address: 'Calle San Martín 800',
    city: 'Paraná',
    province: 'Entre Ríos',
    postalCode: '3100',
    destinationType: 'interior',
  },
]

const owners = [
  'Juan Pérez',
  'María Gómez',
  'Pedro Álvarez',
  'Sofía Benítez',
  'Nicolás Castro',
  'Camila Duarte',
  'Federico Molina',
  'Julieta Paredes',
  'Sebastián Acosta',
  'Florencia Vega',
  'Andrés Quiroga',
  'Paula Herrera',
  'Tomás Blanco',
  'Agustina Navarro',
  'Gonzalo Ibarra',
  'Romina Salas',
  'Matías Ortega',
  'Carolina Méndez',
  'Leandro Silva',
  'Daniela Romero',
]

const phones = [
  '+54 11 5123-4501',
  '+54 11 5234-5602',
  '+54 11 5345-6703',
  '+54 11 5456-7804',
  '+54 11 5567-8905',
  '+54 11 5678-9016',
  '+54 11 5789-0127',
  '+54 11 5890-1238',
  '+54 11 5901-2349',
  '+54 11 5012-3450',
]

function packageSeedStatus(index: number): PackageStatus {
  return index % 23 === 0 ? 'cancelled' : 'pending'
}

function buildAddresses(): SeedAddress[] {
  const list: SeedAddress[] = []
  for (let i = 0; i < 30; i += 1) {
    const base = cabaAddresses[i % cabaAddresses.length]
    if (base) list.push({ ...base })
  }
  for (let i = 0; i < 30; i += 1) {
    const base = gbaAddresses[i % gbaAddresses.length]
    if (base) list.push({ ...base })
  }
  for (let i = 0; i < 20; i += 1) {
    const base = interiorAddresses[i % interiorAddresses.length]
    if (base) list.push({ ...base })
  }
  return list
}

function createPackages(): Package[] {
  const addresses = buildAddresses()
  const now = new Date()

  return addresses.map((addr, index) => {
    const n = index + 1
    const status = packageSeedStatus(index)
    const created = new Date(now)
    created.setDate(created.getDate() - ((index % 20) + 1))
    const updated = new Date(created)
    updated.setHours(updated.getHours() + (index % 48))

    const paymentCycle: PaymentStatus[] = [
      'paid',
      'cash',
      'usd_cash',
      'transfer',
      'pending',
      'paid',
      'cash',
      'usd_cash',
    ]
    const pricePerKgUsd = Number((5.5 + (index % 8) * 0.85).toFixed(2))
    const usdRate = 1501
    const weight = Number((0.5 + (index % 15) * 0.35).toFixed(2))
    const totals = calculatePackageTotals(weight, pricePerKgUsd, usdRate)

    const unit =
      index % 5 === 0
        ? `Piso ${(index % 8) + 1}`
        : index % 5 === 1
          ? `Depto ${String.fromCharCode(65 + (Math.floor(index / 5) % 5))}`
          : undefined

    const person = personsMock[index % personsMock.length]

    const failedAttempts =
      n === 5
        ? (() => {
            const firstAttempt = new Date(updated)
            firstAttempt.setDate(firstAttempt.getDate() - 2)
            return [
              {
                id: 'attempt_demo_2',
                attemptedAt: updated.toISOString(),
                outcome: 'not_delivered' as const,
                failureReasonId: 'fr_1',
                failureNotes: 'Nadie en domicilio',
                userName: 'Carlos Méndez',
                deliveryCode: 'REP-PLACEHOLDER',
              },
              {
                id: 'attempt_demo_1',
                attemptedAt: firstAttempt.toISOString(),
                outcome: 'rescheduled' as const,
                failureReasonId: 'fr_6',
                failureNotes: 'Cliente pide entrega mañana',
                userName: 'Carlos Méndez',
                deliveryCode: 'REP-PLACEHOLDER',
              },
            ]
          })()
        : undefined

    return withPackageOwner({
      id: `pkg_${String(n).padStart(3, '0')}`,
      shCode: `SH${10000 + n}`,
      personId: person?.id,
      ownerName: person ? formatFullName(person) : owners[index % owners.length] ?? 'Cliente Demo',
      ownerPhone: person?.phone ?? phones[index % phones.length] ?? '+54 11 5000-0000',
      weight,
      address: unit ? `${addr.address}, ${unit}` : addr.address,
      city: addr.city,
      province: addr.province,
      postalCode: addr.postalCode,
      destinationType: addr.destinationType,
      status,
      pricePerKgUsd,
      usdRate,
      totalUsd: totals.totalUsd,
      totalArs: totals.totalArs,
      paymentStatus: paymentCycle[index % paymentCycle.length] ?? 'pending',
      notes: index % 7 === 0 ? 'Entregar en horario laboral' : undefined,
      createdAt: created.toISOString(),
      updatedAt: updated.toISOString(),
      ...(failedAttempts ? { failedAttempts } : {}),
    })
  })
}

export const packagesMock: Package[] = [...createPackages(), ...createCorporateClientPackages()]
