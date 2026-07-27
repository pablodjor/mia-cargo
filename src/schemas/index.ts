import { z } from 'zod'
import { isCabaProvince, normalizeDestinationLocation } from '@/utils/destination-location'

const nameFields = {
  firstName: z.string().min(1, 'Nombre requerido'),
  lastName: z.string().min(1, 'Apellido requerido'),
}

const destinationLocationRefine = (
  data: { destinationType: 'caba' | 'gba' | 'interior'; city: string; province: string },
  ctx: z.RefinementCtx,
) => {
  if (data.destinationType === 'gba' && isCabaProvince(data.province)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'En GBA la provincia debe ser Buenos Aires',
      path: ['province'],
    })
  }
  if (data.destinationType === 'caba' && data.province.trim() && !isCabaProvince(data.province)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'En CABA la provincia debe ser CABA',
      path: ['province'],
    })
  }
}

const destinationLocationTransform = <
  T extends { destinationType: 'caba' | 'gba' | 'interior'; city: string; province: string },
>(
  data: T,
) => normalizeDestinationLocation(data)

export const packageSchema = z
  .object({
  personId: z.string().optional(),
  shCode: z.string().min(1, 'Código SH requerido'),
  ownerFirstName: z.string().min(1, 'Nombre requerido'),
  ownerLastName: z.string().min(1, 'Apellido requerido'),
  ownerPhone: z.string().min(6, 'Teléfono requerido'),
  weight: z.number().positive('Peso inválido'),
  address: z.string().min(3, 'Dirección requerida'),
  city: z.string().min(2, 'Localidad requerida'),
  province: z.string().min(2, 'Provincia requerida'),
  postalCode: z.string().min(3, 'Código postal requerido'),
  destinationType: z.enum(['caba', 'gba', 'interior'], {
    message: 'Seleccioná la zona de destino',
  }),
  status: z.enum([
    'pending',
    'assigned',
    'in_route',
    'delivered',
    'not_delivered',
    'rescheduled',
    'cancelled',
  ]),
  contents: z.string().optional(),
  notes: z.string().optional(),
  addressUnit: z.string().optional(),
  addressBell: z.string().optional(),
  addressPlaceType: z.enum(['home', 'work', 'other']).optional(),
  pricePerKgUsd: z.number().positive('Precio por kg inválido'),
  usdRate: z.number().positive('Cotización inválida'),
  paymentStatus: z.enum(['paid', 'cash', 'usd_cash', 'pending', 'transfer']),
})
  .superRefine(destinationLocationRefine)
  .transform(destinationLocationTransform)

export type PackageFormValues = z.infer<typeof packageSchema>

export const personSchema = z
  .object({
  ...nameFields,
  phone: z.string().min(6, 'Teléfono requerido'),
  address: z.string().min(3, 'Dirección requerida'),
  city: z.string().min(2, 'Localidad requerida'),
  province: z.string().min(2, 'Provincia requerida'),
  postalCode: z.string().min(3, 'Código postal requerido'),
  destinationType: z.enum(['caba', 'gba', 'interior'], {
    message: 'Seleccioná la zona de destino',
  }),
  status: z.enum(['active', 'inactive']),
  notes: z.string().optional(),
  addressUnit: z.string().optional(),
  addressBell: z.string().optional(),
  addressPlaceType: z.enum(['home', 'work', 'other']).optional(),
})
  .superRefine(destinationLocationRefine)
  .transform(destinationLocationTransform)

export type PersonFormValues = z.infer<typeof personSchema>

export const deliverySchema = z
  .object({
    date: z.string().min(1, 'Fecha requerida'),
    zone: z.enum(['caba', 'gba', 'caba_gba', 'interior']),
    channel: z.enum(['last_mile', 'courier']),
    courierId: z.string().optional(),
    driverId: z.string().min(1, 'Chofer requerido'),
    vehicleId: z.string().min(1, 'Vehículo requerido'),
    notes: z.string().optional(),
    packageIds: z.array(z.string()),
  })
  .superRefine((data, ctx) => {
    if (data.channel === 'courier' && !data.courierId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Seleccioná el correo de destino',
        path: ['courierId'],
      })
    }
  })

export type DeliveryFormValues = z.infer<typeof deliverySchema>

export const courierSchema = z.object({
  name: z.string().min(2, 'Nombre requerido'),
  branchName: z.string().min(2, 'Sucursal requerida'),
  address: z.string().min(3, 'Dirección requerida'),
  city: z.string().min(2, 'Localidad requerida'),
  province: z.string().min(2, 'Provincia requerida'),
  postalCode: z.string().min(3, 'Código postal requerido'),
  phone: z.string().min(6, 'Teléfono requerido'),
  status: z.enum(['active', 'inactive']),
  notes: z.string().optional(),
})

export type CourierFormValues = z.infer<typeof courierSchema>

export const driverSchema = z.object({
  ...nameFields,
  dni: z.string().min(7, 'DNI inválido'),
  phone: z.string().min(6, 'Teléfono requerido'),
  email: z
    .string()
    .optional()
    .refine((value) => !value?.trim() || z.string().email().safeParse(value.trim()).success, {
      message: 'Email inválido',
    }),
  status: z.enum(['active', 'inactive']),
  habitualVehicleId: z.string().optional(),
})

export type DriverFormValues = z.infer<typeof driverSchema>

export const vehicleSchema = z.object({
  name: z.string().min(2, 'Nombre requerido'),
  type: z.string().min(2, 'Tipo requerido'),
  plate: z.string().min(5, 'Patente requerida'),
  capacityKg: z.number().positive('Capacidad inválida'),
  status: z.enum(['active', 'inactive']),
  habitualDriverId: z.string().optional(),
})

export type VehicleFormValues = z.infer<typeof vehicleSchema>

export const loginSchema = z.object({
  username: z.string().min(2, 'Usuario requerido'),
  password: z.string().min(4, 'Contraseña requerida'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export const failureSchema = z.object({
  failureReasonId: z.string().min(1, 'Motivo obligatorio'),
  failureNotes: z.string().optional(),
})

export type FailureFormValues = z.infer<typeof failureSchema>

/** Chofer: solo observación (badges o texto libre). */
export const driverFailureSchema = z.object({
  failureNotes: z.string().min(1, 'Seleccioná o escribí una observación'),
})

export type DriverFailureFormValues = z.infer<typeof driverFailureSchema>

export const userSchema = z
  .object({
    ...nameFields,
    username: z.string().min(2, 'Usuario requerido'),
    email: z
    .string()
    .optional()
    .refine((value) => !value?.trim() || z.string().email().safeParse(value.trim()).success, {
      message: 'Email inválido',
    }),
    password: z.string().optional(),
    role: z.enum(['admin', 'operator', 'reader', 'driver'], { message: 'Rol requerido' }),
    phone: z.string().optional(),
    driverId: z.string().optional(),
    active: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'driver' && !data.driverId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Seleccioná el chofer vinculado',
        path: ['driverId'],
      })
    }
  })

export type UserFormValues = z.infer<typeof userSchema>
