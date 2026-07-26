import { createId } from '@/utils/id'
import type { HistoryEntity, HistoryEntry, Session } from '@/types'
import { storageService } from './storage.service'
import { delay } from '@/utils/delay'

export interface CreateHistoryInput {
  action: string
  entity: HistoryEntity
  entityId: string
  relatedCode?: string
  previousStatus?: string
  newStatus?: string
  description: string
  session?: Session | null
}

function appendHistory(input: CreateHistoryInput): HistoryEntry {
  const session = input.session ?? storageService.getSession()
  const entry: HistoryEntry = {
    id: createId('hist'),
    createdAt: new Date().toISOString(),
    userId: session?.userId ?? 'system',
    userName: session?.name ?? 'Sistema',
    action: input.action,
    entity: input.entity,
    entityId: input.entityId,
    relatedCode: input.relatedCode,
    previousStatus: input.previousStatus,
    newStatus: input.newStatus,
    description: input.description,
  }

  const history = storageService.getHistory()
  storageService.setHistory([entry, ...history])
  return entry
}

export const historyService = {
  async getAll(): Promise<HistoryEntry[]> {
    await delay()
    storageService.seedIfNeeded()
    return storageService.getHistory()
  },

  async create(input: CreateHistoryInput): Promise<HistoryEntry> {
    await delay(150)
    return appendHistory(input)
  },

  record(input: CreateHistoryInput): HistoryEntry {
    return appendHistory(input)
  },
}
