import { delay } from '@/utils/delay'
import { MOCK_DATABASE_VERSION } from '@/constants/storage'
import type { MockDataPreset } from '@/mocks'
import type { DatabaseSnapshot, FailureReason } from '@/types'
import { storageService } from './storage.service'

export const settingsService = {
  async getCounts(): Promise<Record<string, number>> {
    await delay(150)
    storageService.seedIfNeeded()
    return storageService.getCounts()
  },

  async getVersionInfo(): Promise<{
    appVersion: string
    dbVersion: number
    compatible: boolean
    remoteDemo: boolean
  }> {
    await delay(100)
    storageService.seedIfNeeded()
    return {
      appVersion: '1.0.0',
      dbVersion: storageService.getSnapshot().version,
      compatible: storageService.isCompatible(),
      remoteDemo: storageService.isRemoteDemo(),
    }
  },

  async restoreMocks(): Promise<DatabaseSnapshot> {
    await delay()
    return storageService.resetToMock()
  },

  async applyMockPreset(preset: MockDataPreset): Promise<DatabaseSnapshot> {
    await delay()
    return storageService.resetToPreset(preset)
  },

  async clearLocalData(): Promise<void> {
    await delay()
    storageService.clearAll()
  },

  async reloadDemo(): Promise<DatabaseSnapshot> {
    await delay()
    storageService.clearAll()
    return storageService.resetToMock()
  },

  async getFailureReasons(): Promise<FailureReason[]> {
    await delay(100)
    storageService.seedIfNeeded()
    return storageService.getFailureReasons()
  },

  getExpectedDbVersion(): number {
    return MOCK_DATABASE_VERSION
  },
}
