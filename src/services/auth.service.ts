import { delay } from '@/utils/delay'
import type { Session, UserRole } from '@/types'
import { normalizeUsername } from '@/utils/person-name'
import { toSession } from '@/utils/session'
import { storageService } from './storage.service'

export const authService = {
  async getUsers() {
    await delay()
    storageService.seedIfNeeded()
    return storageService.getUsers()
  },

  getSessionSync(): Session | null {
    storageService.seedIfNeeded()
    return storageService.getSession()
  },

  async getSession(): Promise<Session | null> {
    await delay(150)
    return this.getSessionSync()
  },

  async login(username: string, password: string): Promise<Session> {
    await delay()
    storageService.seedIfNeeded()
    const normalized = normalizeUsername(username)
    const user = storageService
      .getUsers()
      .find(
        (item) =>
          normalizeUsername(item.username) === normalized &&
          item.password === password &&
          item.active,
      )

    if (!user) {
      throw new Error('Credenciales inválidas')
    }

    const session = toSession(user)
    storageService.setSession(session)
    return session
  },

  async loginAsRole(role: UserRole): Promise<Session> {
    await delay()
    storageService.seedIfNeeded()
    const user = storageService.getUsers().find((item) => item.role === role && item.active)
    if (!user) {
      throw new Error('No hay usuario disponible para ese rol')
    }
    const session = toSession(user)
    storageService.setSession(session)
    return session
  },

  async logout(): Promise<void> {
    await delay(150)
    storageService.clearSession()
  },
}
