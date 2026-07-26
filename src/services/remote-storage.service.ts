import type { DatabaseSnapshot } from '@/types'

export interface RemoteDatabaseRecord {
  updatedAt: string
  snapshot: DatabaseSnapshot
}

const API_PATH = '/api/db'

export function isRemoteDemoStorageEnabled(): boolean {
  return import.meta.env.VITE_DEMO_REMOTE_STORAGE === 'true'
}

export async function fetchRemoteDatabase(): Promise<RemoteDatabaseRecord | null> {
  const response = await fetch(API_PATH, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error('No se pudo cargar la base de demo')
  }
  const data = (await response.json()) as RemoteDatabaseRecord | null
  if (!data?.snapshot) return null
  return data
}

export async function pushRemoteDatabase(snapshot: DatabaseSnapshot): Promise<string> {
  const response = await fetch(API_PATH, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ snapshot }),
  })
  if (!response.ok) {
    throw new Error('No se pudo guardar la base de demo')
  }
  const body = (await response.json()) as { updatedAt?: string }
  return body.updatedAt ?? new Date().toISOString()
}
