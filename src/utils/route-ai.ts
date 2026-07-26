import type { DeliveryZone, Package } from '@/types'
import { DELIVERY_ZONE_LABELS } from '@/constants/labels'
import { packageMatchesDeliveryZone } from '@/utils/delivery-zone'
import {
  DEFAULT_ROUTE_HUB_COORDS,
  estimatePackageCoords,
  estimateRouteDurationMinutes,
  formatDuration,
  optimizePackageOrder,
} from '@/utils/route-optimizer'

export interface RouteAiSuggestion {
  packageIds: string[]
  packages: Package[]
  estimatedMinutes: number
  estimatedKm: number
  budgetMinutes: number
  summary: string
  reasoning: string[]
}

function maxStopsForBudget(budgetMinutes: number): number {
  const usable = Math.max(0, budgetMinutes - 25)
  return Math.max(1, Math.floor(usable / 18))
}

/**
 * Asistente demo: elige paquetes que entran en el tiempo disponible
 * y los ordena minimizando recorrido (vecino más cercano + reorden).
 */
export function suggestPackagesForTimeBudget(
  candidates: Package[],
  hoursAvailable: number,
  zone?: DeliveryZone,
): RouteAiSuggestion {
  const budgetMinutes = Math.max(1, Math.round(hoursAvailable * 60))
  const pool = zone
    ? candidates.filter((item) => packageMatchesDeliveryZone(item.destinationType, zone))
    : [...candidates]
  const selected: Package[] = []
  const reasoning: string[] = [
    `Tiempo disponible: ${formatDuration(budgetMinutes)}.`,
    zone
      ? `Filtrando paquetes de ${DELIVERY_ZONE_LABELS[zone]}.`
      : 'Considerando todos los paquetes disponibles.',
    `Capacidad teórica: ~${maxStopsForBudget(budgetMinutes)} paradas (8 min por entrega + traslados).`,
  ]

  while (pool.length > 0) {
    let bestIndex = -1
    let bestMinutes = Number.POSITIVE_INFINITY

    for (let index = 0; index < pool.length; index += 1) {
      const candidate = pool[index]
      if (!candidate) continue
      const trial = optimizePackageOrder([...selected, candidate])
      const { minutes } = estimateRouteDurationMinutes(trial)
      if (minutes <= budgetMinutes && minutes < bestMinutes) {
        bestMinutes = minutes
        bestIndex = index
      }
    }

    if (bestIndex < 0) break
    const picked = pool.splice(bestIndex, 1)[0]
    if (!picked) break
    selected.push(picked)
  }

  const packages = optimizePackageOrder(selected)
  const { minutes, km } = estimateRouteDurationMinutes(packages)

  if (packages.length === 0) {
    reasoning.push('No entró ningún paquete con el tiempo indicado. Probá más horas o menos restricciones.')
  } else {
    reasoning.push(
      `Seleccionados ${packages.length} SH por ~${formatDuration(minutes)} de ronda (${km} km estimados).`,
    )
    reasoning.push('Podés quitar o sumar paquetes antes de aplicar al reparto.')
  }

  return {
    packageIds: packages.map((item) => item.id),
    packages,
    estimatedMinutes: minutes,
    estimatedKm: km,
    budgetMinutes,
    summary:
      packages.length === 0
        ? `Sin sugerencia para ${formatDuration(budgetMinutes)}`
        : `${packages.length} SH · ${formatDuration(minutes)} · ${km} km`,
    reasoning,
  }
}

/** Para correo: sugiere todos los disponibles válidos (un solo viaje a sucursal). */
export function suggestCourierPackages(candidates: Package[]): RouteAiSuggestion {
  const packages = [...candidates]
  const { minutes, km } = estimateRouteDurationMinutes(packages.slice(0, 1))

  return {
    packageIds: packages.map((item) => item.id),
    packages,
    estimatedMinutes: minutes,
    estimatedKm: km,
    budgetMinutes: minutes,
    summary: `${packages.length} SH al correo`,
    reasoning: [
      'Entrega a correo: un solo destino (sucursal).',
      `Se incluyen ${packages.length} paquetes con pago por transferencia.`,
      'El chofer lleva todos los SH juntos a la sucursal elegida.',
    ],
  }
}

export function mapPreviewCoords(packages: Package[]): Array<{ lat: number; lng: number }> {
  return [DEFAULT_ROUTE_HUB_COORDS, ...packages.map((item) => estimatePackageCoords(item))]
}
