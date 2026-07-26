/** Textos rápidos que el chofer puede elegir al registrar una incidencia. */
export const DRIVER_PREDEFINED_OBSERVATIONS = [
  'Nadie en domicilio',
  'No atiende el teléfono',
  'Dirección incorrecta o incompleta',
  'Cliente pide entrega mañana',
  'Zona cerrada o sin acceso',
  'Cliente rechazó el paquete',
  'Horario fuera de ventana de entrega',
  'Edificio sin portero / acceso restringido',
] as const

export type DriverPredefinedObservation = (typeof DRIVER_PREDEFINED_OBSERVATIONS)[number]

/** Motivo genérico cuando el chofer registra solo observación. */
export const DRIVER_DEFAULT_FAILURE_REASON_ID = 'fr_1'
