import type { FailureReason } from '@/types'

export const failureReasonsMock: FailureReason[] = [
  { id: 'fr_1', label: 'Destinatario ausente', active: true },
  { id: 'fr_2', label: 'Dirección incorrecta', active: true },
  { id: 'fr_3', label: 'Rechazado por el cliente', active: true },
  { id: 'fr_4', label: 'Zona inaccesible', active: true },
  { id: 'fr_5', label: 'Sin documento de identidad', active: true },
  { id: 'fr_6', label: 'Horario no disponible', active: true },
  { id: 'fr_7', label: 'Paquete dañado', active: true },
]
