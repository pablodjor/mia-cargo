import type { Package } from '@/types'
import { packagesService } from './packages.service'
import { storageService } from './storage.service'

export const scannerService = {
  async scan(code: string): Promise<Package | null> {
    const pkg = await packagesService.findByCode(code)
    this.pushHistory(code)
    return pkg
  },

  async getHistory(): Promise<string[]> {
    storageService.seedIfNeeded()
    return storageService.getScannerHistory()
  },

  async pushHistory(code: string): Promise<void> {
    storageService.seedIfNeeded()
    const normalized = code.trim().toUpperCase()
    if (!normalized) return
    storageService.setScannerHistory([
      normalized,
      ...storageService.getScannerHistory().filter((item) => item !== normalized),
    ].slice(0, 10))
  },
}
