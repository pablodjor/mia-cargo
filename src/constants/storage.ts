export const MOCK_DATABASE_VERSION = 21

export const STORAGE_KEYS = {
  version: 'miacargo:db-version',
  users: 'miacargo:users',
  persons: 'miacargo:persons',
  packages: 'miacargo:packages',
  deliveries: 'miacargo:deliveries',
  drivers: 'miacargo:drivers',
  vehicles: 'miacargo:vehicles',
  couriers: 'miacargo:couriers',
  history: 'miacargo:history',
  failureReasons: 'miacargo:failure-reasons',
  session: 'miacargo:session',
  scannerHistory: 'miacargo:scanner-history',
  notificationsLastSeen: 'miacargo:notifications-last-seen',
} as const

export const APP_VERSION = '1.0.0-demo'
