import type { Delivery } from '@/types'

/** ISO `yyyy-MM-dd` → token `DD-MM-AAAA` para el código. */
function deliveryDateToken(date: string): string {
  const [year, month, day] = date.split('-')
  return `${day}-${month}-${year}`
}

/** Ejemplo: REP-22-07-2026-003 */
export function formatDeliveryCode(date: string, sequence: number): string {
  return `REP-${deliveryDateToken(date)}-${String(sequence).padStart(3, '0')}`
}

/** Siguiente código disponible para la fecha del reparto. */
export function nextDeliveryCode(deliveries: Delivery[], date: string): string {
  const prefix = `REP-${deliveryDateToken(date)}-`

  const nums = deliveries
    .filter((delivery) => delivery.date === date || delivery.code.startsWith(prefix))
    .map((delivery) => Number(delivery.code.slice(prefix.length)))
    .filter((value) => Number.isFinite(value) && value > 0)

  const max = nums.length > 0 ? Math.max(...nums) : 0
  return formatDeliveryCode(date, max + 1)
}
