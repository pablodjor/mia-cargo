export function roundMoney(value: number, digits = 2): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export function calculatePackageTotals(weight: number, pricePerKgUsd: number, usdRate: number) {
  const totalUsd = roundMoney(weight * pricePerKgUsd)
  const totalArs = roundMoney(totalUsd * usdRate)
  return { totalUsd, totalArs }
}

export function formatUsd(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value)
}

export function formatArs(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatWeightKg(value: number): string {
  return `${roundMoney(value, 2).toFixed(2)} kg`
}
