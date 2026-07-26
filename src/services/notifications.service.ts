import { STORAGE_KEYS } from '@/constants/storage'
import type { HistoryEntry } from '@/types'
import { delay } from '@/utils/delay'
import { isNotificationEntry } from '@/utils/notifications'
import { historyService } from './history.service'

function readLastSeen(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.notificationsLastSeen)
  } catch {
    return null
  }
}

function writeLastSeen(value: string): void {
  localStorage.setItem(STORAGE_KEYS.notificationsLastSeen, value)
}

export const notificationsService = {
  async getRecent(limit = 40): Promise<HistoryEntry[]> {
    await delay(100)
    const history = await historyService.getAll()
    return history.filter(isNotificationEntry).slice(0, limit)
  },

  getUnreadCount(entries: HistoryEntry[]): number {
    const lastSeen = readLastSeen()
    if (!lastSeen) return entries.length
    return entries.filter((entry) => entry.createdAt > lastSeen).length
  },

  markAllAsRead(entries: HistoryEntry[]): void {
    const latest = entries[0]?.createdAt ?? new Date().toISOString()
    writeLastSeen(latest)
  },
}
