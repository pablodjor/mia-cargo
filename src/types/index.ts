export type UserRole = 'admin' | 'operator' | 'reader' | 'driver'

export type PackageStatus =
  | 'pending'
  | 'assigned'
  | 'in_route'
  | 'delivered'
  | 'not_delivered'
  | 'rescheduled'
  | 'cancelled'

export type DestinationType = 'caba' | 'gba' | 'interior'

/** Zona operativa de un reparto (puede agrupar CABA + GBA). */
export type DeliveryZone = DestinationType | 'caba_gba'

export type PaymentStatus = 'paid' | 'cash' | 'usd_cash' | 'pending' | 'transfer'

export type DeliveryChannel = 'last_mile' | 'courier'

export type DeliveryStatus =
  | 'draft'
  | 'prepared'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export type EntityStatus = 'active' | 'inactive'

export type HistoryEntity =
  | 'package'
  | 'delivery'
  | 'driver'
  | 'vehicle'
  | 'courier'
  | 'person'
  | 'user'
  | 'system'

export interface User {
  id: string
  name: string
  email: string
  password: string
  role: UserRole
  phone?: string
  driverId?: string
  avatarInitials: string
  active: boolean
}

export interface Session {
  userId: string
  email: string
  name: string
  role: UserRole
  driverId?: string
  loggedAt: string
}

export interface PackageFailedAttempt {
  id: string
  attemptedAt: string
  outcome: 'not_delivered' | 'rescheduled'
  failureReasonId?: string
  failureNotes?: string
  userName?: string
  deliveryCode?: string
}

export interface Person {
  id: string
  name: string
  phone: string
  address: string
  city: string
  province: string
  postalCode: string
  destinationType: DestinationType
  addressUnit?: string
  addressBell?: string
  addressPlaceType?: AddressPlaceType
  notes?: string
  status: EntityStatus
  createdAt: string
  updatedAt: string
}

export type AddressPlaceType = 'home' | 'work' | 'other'

export interface AddressDeliveryDetails {
  unit?: string
  bell?: string
  placeType?: AddressPlaceType
}

export interface Package {
  id: string
  shCode: string
  personId?: string
  ownerName: string
  ownerPhone: string
  weight: number
  address: string
  city: string
  province: string
  postalCode: string
  destinationType: DestinationType
  addressUnit?: string
  addressBell?: string
  addressPlaceType?: AddressPlaceType
  status: PackageStatus
  pricePerKgUsd: number
  usdRate: number
  totalUsd: number
  totalArs: number
  paymentStatus: PaymentStatus
  notes?: string
  failureReasonId?: string
  failureNotes?: string
  failedAttempts?: PackageFailedAttempt[]
  deliveryId?: string
  lastAttemptAt?: string
  createdAt: string
  updatedAt: string
}

export interface DeliveryAddressOverride extends AddressDeliveryDetails {
  address: string
  city: string
  province: string
  postalCode: string
}

export interface DeliveryStop {
  packageId: string
  order: number
  status: 'pending' | 'delivered' | 'not_delivered' | 'skipped'
  deliveryAddress?: DeliveryAddressOverride
  attemptedAt?: string
  notes?: string
}

export interface Delivery {
  id: string
  code: string
  date: string
  zone: DeliveryZone
  channel: DeliveryChannel
  courierId?: string
  driverId: string
  vehicleId: string
  status: DeliveryStatus
  notes?: string
  stops: DeliveryStop[]
  createdAt: string
  updatedAt: string
  startedAt?: string
  completedAt?: string
}

export interface Courier {
  id: string
  name: string
  branchName: string
  address: string
  city: string
  province: string
  postalCode: string
  phone: string
  status: EntityStatus
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface Driver {
  id: string
  name: string
  dni: string
  phone: string
  email: string
  status: EntityStatus
  habitualVehicleId?: string
  deliveryCount: number
  createdAt: string
  updatedAt: string
}

export interface Vehicle {
  id: string
  name: string
  type: string
  plate: string
  capacityKg: number
  status: EntityStatus
  habitualDriverId?: string
  createdAt: string
  updatedAt: string
}

export interface FailureReason {
  id: string
  label: string
  active: boolean
}

export interface HistoryEntry {
  id: string
  createdAt: string
  userId: string
  userName: string
  action: string
  entity: HistoryEntity
  entityId: string
  relatedCode?: string
  previousStatus?: string
  newStatus?: string
  description: string
}

export interface PersonPackageStats {
  packageCount: number
  deliveredCount: number
  activeCount: number
  pendingPaymentCount: number
  totalUsd: number
  totalArs: number
  paidArs: number
  cashArs: number
  pendingArs: number
  transferArs: number
  usdCashUsd: number
  lastPackageAt?: string
}

export interface PersonSummary {
  person: Person
  stats: PersonPackageStats
}

export interface DatabaseSnapshot {
  version: number
  users: User[]
  persons: Person[]
  packages: Package[]
  deliveries: Delivery[]
  drivers: Driver[]
  vehicles: Vehicle[]
  couriers: Courier[]
  history: HistoryEntry[]
  failureReasons: FailureReason[]
}

export interface DashboardMetrics {
  pendingPackages: number
  assignedPackages: number
  activeDeliveries: number
  deliveredToday: number
  notDeliveredToday: number
  totalWeightInRoute: number
}
