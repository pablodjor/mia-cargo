import { MOCK_DATABASE_VERSION, STORAGE_KEYS } from '@/constants/storage'
import { createInitialDatabase } from '@/mocks'
import type {
  Courier,
  DatabaseSnapshot,
  Delivery,
  DeliveryChannel,
  Driver,
  FailureReason,
  HistoryEntry,
  Package,
  PaymentStatus,
  Person,
  Session,
  User,
  Vehicle,
} from '@/types'
import { migratePackageFailedAttempts } from '@/utils/package-attempts'
import { normalizePackageDeliveryLink } from '@/utils/package-delivery-info'
import { calculatePackageTotals } from '@/utils/money'
import { bumpStorageRevision } from '@/utils/storage-events'
import {
  fetchRemoteDatabase,
  isRemoteDemoStorageEnabled,
  pushRemoteDatabase,
} from '@/services/remote-storage.service'

const REMOTE_MODE = isRemoteDemoStorageEnabled()

let remoteCache: DatabaseSnapshot | null = null
let remoteReady = false
let remoteUpdatedAt: string | null = null
let pushTimer: ReturnType<typeof setTimeout> | null = null
let pushInFlight = false
let pollTimer: ReturnType<typeof setInterval> | null = null

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function writeJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

function getStoredVersion(): number | null {
  if (REMOTE_MODE && remoteCache) return remoteCache.version
  const raw = localStorage.getItem(STORAGE_KEYS.version)
  if (!raw) return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizePackage(pkg: Package): Package {
  const pricePerKgUsd =
    typeof pkg.pricePerKgUsd === 'number' && pkg.pricePerKgUsd > 0 ? pkg.pricePerKgUsd : 8
  const usdRate = typeof pkg.usdRate === 'number' && pkg.usdRate > 0 ? pkg.usdRate : 1501
  const totals = calculatePackageTotals(pkg.weight, pricePerKgUsd, usdRate)
  const paymentStatus: PaymentStatus =
    pkg.paymentStatus === 'paid' ||
    pkg.paymentStatus === 'cash' ||
    pkg.paymentStatus === 'usd_cash' ||
    pkg.paymentStatus === 'pending' ||
    pkg.paymentStatus === 'transfer'
      ? pkg.paymentStatus
      : 'pending'

  const status =
    (pkg.status as string) === 'returned' ? ('not_delivered' as const) : pkg.status

  return {
    ...pkg,
    status,
    pricePerKgUsd,
    usdRate,
    totalUsd: typeof pkg.totalUsd === 'number' ? pkg.totalUsd : totals.totalUsd,
    totalArs: typeof pkg.totalArs === 'number' ? pkg.totalArs : totals.totalArs,
    paymentStatus,
    failedAttempts: migratePackageFailedAttempts(pkg),
  }
}

function normalizeDelivery(delivery: Delivery): Delivery {
  const channel: DeliveryChannel =
    delivery.channel === 'courier' || delivery.channel === 'last_mile'
      ? delivery.channel
      : 'last_mile'
  const zone: Delivery['zone'] =
    delivery.zone === 'caba' ||
    delivery.zone === 'gba' ||
    delivery.zone === 'caba_gba' ||
    delivery.zone === 'interior'
      ? delivery.zone
      : 'caba'
  return {
    ...delivery,
    channel,
    zone,
    courierId: channel === 'courier' ? delivery.courierId : undefined,
  }
}

function normalizeSnapshot(snapshot: DatabaseSnapshot): DatabaseSnapshot {
  return {
    ...snapshot,
    packages: snapshot.packages.map(normalizePackage).map(normalizePackageDeliveryLink),
    deliveries: snapshot.deliveries.map(normalizeDelivery),
  }
}

function applySnapshot(snapshot: DatabaseSnapshot): void {
  remoteCache = normalizeSnapshot(snapshot)
}

function scheduleRemotePush(): void {
  if (!REMOTE_MODE || !remoteReady || !remoteCache) return
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    void flushRemotePush()
  }, 700)
}

async function flushRemotePush(): Promise<void> {
  if (!REMOTE_MODE || !remoteCache || pushInFlight) return
  pushInFlight = true
  try {
    remoteUpdatedAt = await pushRemoteDatabase(remoteCache)
  } catch {
    // La demo sigue funcionando en memoria; el próximo cambio reintenta.
  } finally {
    pushInFlight = false
  }
}

async function syncFromRemoteIfNewer(): Promise<boolean> {
  if (!REMOTE_MODE || !remoteReady) return false
  try {
    const remote = await fetchRemoteDatabase()
    if (!remote?.snapshot) return false
    if (remoteUpdatedAt && remote.updatedAt <= remoteUpdatedAt) return false
    applySnapshot(remote.snapshot)
    remoteUpdatedAt = remote.updatedAt
    bumpStorageRevision()
    return true
  } catch {
    return false
  }
}

function startRemotePolling(): void {
  if (pollTimer) return
  pollTimer = setInterval(() => {
    void syncFromRemoteIfNewer()
  }, 15000)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void syncFromRemoteIfNewer()
    }
  })
}

export const storageService = {
  isRemoteDemo(): boolean {
    return REMOTE_MODE
  },

  isReady(): boolean {
    return REMOTE_MODE ? remoteReady : true
  },

  async init(): Promise<void> {
    if (!REMOTE_MODE) return
    if (remoteReady) return

    try {
      const remote = await fetchRemoteDatabase()
      if (remote?.snapshot) {
        applySnapshot(remote.snapshot)
        remoteUpdatedAt = remote.updatedAt
      } else {
        applySnapshot(createInitialDatabase())
        await flushRemotePush()
      }
    } catch {
      applySnapshot(createInitialDatabase())
    }

    remoteReady = true
    startRemotePolling()
  },

  isCompatible(): boolean {
    const version = getStoredVersion()
    return version === MOCK_DATABASE_VERSION
  },

  hasData(): boolean {
    if (REMOTE_MODE) {
      return Boolean(remoteCache?.packages.length)
    }
    return localStorage.getItem(STORAGE_KEYS.packages) !== null
  },

  seedIfNeeded(): DatabaseSnapshot {
    if (REMOTE_MODE) {
      if (!remoteCache) {
        applySnapshot(createInitialDatabase())
      }
      return this.getSnapshot()
    }

    if (this.hasData() && this.isCompatible()) {
      return this.getSnapshot()
    }
    return this.resetToMock()
  },

  getSnapshot(): DatabaseSnapshot {
    if (REMOTE_MODE && remoteCache) {
      return { ...remoteCache }
    }

    return {
      version: getStoredVersion() ?? MOCK_DATABASE_VERSION,
      users: this.getUsers(),
      persons: this.getPersons(),
      packages: this.getPackages(),
      deliveries: this.getDeliveries(),
      drivers: this.getDrivers(),
      vehicles: this.getVehicles(),
      couriers: this.getCouriers(),
      history: this.getHistory(),
      failureReasons: this.getFailureReasons(),
    }
  },

  saveSnapshot(snapshot: DatabaseSnapshot): void {
    const normalized = normalizeSnapshot(snapshot)
    if (REMOTE_MODE) {
      applySnapshot(normalized)
      scheduleRemotePush()
      return
    }

    localStorage.setItem(STORAGE_KEYS.version, String(normalized.version))
    this.setUsers(normalized.users)
    this.setPersons(normalized.persons)
    this.setPackages(normalized.packages)
    this.setDeliveries(normalized.deliveries)
    this.setDrivers(normalized.drivers)
    this.setVehicles(normalized.vehicles)
    this.setCouriers(normalized.couriers)
    this.setHistory(normalized.history)
    this.setFailureReasons(normalized.failureReasons)
  },

  resetToMock(): DatabaseSnapshot {
    const snapshot = createInitialDatabase()
    this.saveSnapshot(snapshot)
    this.clearSession()
    if (!REMOTE_MODE) {
      localStorage.removeItem(STORAGE_KEYS.scannerHistory)
    }
    return snapshot
  },

  clearAll(): void {
    if (REMOTE_MODE && remoteCache) {
      applySnapshot(createInitialDatabase())
      scheduleRemotePush()
      return
    }

    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key)
    })
  },

  getUsers(): User[] {
    if (REMOTE_MODE && remoteCache) return remoteCache.users
    return readJson<User[]>(STORAGE_KEYS.users) ?? []
  },
  setUsers(users: User[]): void {
    if (REMOTE_MODE && remoteCache) {
      remoteCache.users = users
      scheduleRemotePush()
      return
    }
    writeJson(STORAGE_KEYS.users, users)
  },

  getPersons(): Person[] {
    if (REMOTE_MODE && remoteCache) return remoteCache.persons
    return readJson<Person[]>(STORAGE_KEYS.persons) ?? []
  },
  setPersons(persons: Person[]): void {
    if (REMOTE_MODE && remoteCache) {
      remoteCache.persons = persons
      scheduleRemotePush()
      return
    }
    writeJson(STORAGE_KEYS.persons, persons)
  },

  getPackages(): Package[] {
    if (REMOTE_MODE && remoteCache) {
      return remoteCache.packages.map(normalizePackage).map(normalizePackageDeliveryLink)
    }
    const packages = readJson<Package[]>(STORAGE_KEYS.packages) ?? []
    return packages.map(normalizePackage).map(normalizePackageDeliveryLink)
  },
  setPackages(packages: Package[]): void {
    const normalized = packages.map(normalizePackage)
    if (REMOTE_MODE && remoteCache) {
      remoteCache.packages = normalized
      scheduleRemotePush()
      return
    }
    writeJson(STORAGE_KEYS.packages, normalized)
  },

  getDeliveries(): Delivery[] {
    if (REMOTE_MODE && remoteCache) {
      return remoteCache.deliveries.map(normalizeDelivery)
    }
    return (readJson<Delivery[]>(STORAGE_KEYS.deliveries) ?? []).map(normalizeDelivery)
  },
  setDeliveries(deliveries: Delivery[]): void {
    const normalized = deliveries.map(normalizeDelivery)
    if (REMOTE_MODE && remoteCache) {
      remoteCache.deliveries = normalized
      scheduleRemotePush()
      return
    }
    writeJson(STORAGE_KEYS.deliveries, normalized)
  },

  getDrivers(): Driver[] {
    if (REMOTE_MODE && remoteCache) return remoteCache.drivers
    return readJson<Driver[]>(STORAGE_KEYS.drivers) ?? []
  },
  setDrivers(drivers: Driver[]): void {
    if (REMOTE_MODE && remoteCache) {
      remoteCache.drivers = drivers
      scheduleRemotePush()
      return
    }
    writeJson(STORAGE_KEYS.drivers, drivers)
  },

  getVehicles(): Vehicle[] {
    if (REMOTE_MODE && remoteCache) return remoteCache.vehicles
    return readJson<Vehicle[]>(STORAGE_KEYS.vehicles) ?? []
  },
  setVehicles(vehicles: Vehicle[]): void {
    if (REMOTE_MODE && remoteCache) {
      remoteCache.vehicles = vehicles
      scheduleRemotePush()
      return
    }
    writeJson(STORAGE_KEYS.vehicles, vehicles)
  },

  getCouriers(): Courier[] {
    if (REMOTE_MODE && remoteCache) return remoteCache.couriers
    return readJson<Courier[]>(STORAGE_KEYS.couriers) ?? []
  },
  setCouriers(couriers: Courier[]): void {
    if (REMOTE_MODE && remoteCache) {
      remoteCache.couriers = couriers
      scheduleRemotePush()
      return
    }
    writeJson(STORAGE_KEYS.couriers, couriers)
  },

  getHistory(): HistoryEntry[] {
    if (REMOTE_MODE && remoteCache) return remoteCache.history
    return readJson<HistoryEntry[]>(STORAGE_KEYS.history) ?? []
  },
  setHistory(history: HistoryEntry[]): void {
    if (REMOTE_MODE && remoteCache) {
      remoteCache.history = history
      scheduleRemotePush()
      return
    }
    writeJson(STORAGE_KEYS.history, history)
  },

  getFailureReasons(): FailureReason[] {
    if (REMOTE_MODE && remoteCache) return remoteCache.failureReasons
    return readJson<FailureReason[]>(STORAGE_KEYS.failureReasons) ?? []
  },
  setFailureReasons(reasons: FailureReason[]): void {
    if (REMOTE_MODE && remoteCache) {
      remoteCache.failureReasons = reasons
      scheduleRemotePush()
      return
    }
    writeJson(STORAGE_KEYS.failureReasons, reasons)
  },

  getSession(): Session | null {
    return readJson<Session>(STORAGE_KEYS.session)
  },
  setSession(session: Session): void {
    writeJson(STORAGE_KEYS.session, session)
  },
  clearSession(): void {
    localStorage.removeItem(STORAGE_KEYS.session)
  },

  getScannerHistory(): string[] {
    return readJson<string[]>(STORAGE_KEYS.scannerHistory) ?? []
  },
  setScannerHistory(codes: string[]): void {
    writeJson(STORAGE_KEYS.scannerHistory, codes)
  },

  getCounts(): Record<string, number> {
    return {
      users: this.getUsers().length,
      clientes: this.getPersons().length,
      packages: this.getPackages().length,
      deliveries: this.getDeliveries().length,
      drivers: this.getDrivers().length,
      vehicles: this.getVehicles().length,
      couriers: this.getCouriers().length,
      history: this.getHistory().length,
    }
  },
}
