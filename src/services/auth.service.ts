import { delay } from '@/utils/delay'
import type { Session, User, UserRole } from '@/types'
import { storageService } from './storage.service'

function toSession(user: User): Session {
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    driverId: user.driverId,
    loggedAt: new Date().toISOString(),
  }
}

export const authService = {
  async getUsers(): Promise<User[]> {
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

  async login(email: string, password: string): Promise<Session> {
    await delay()
    storageService.seedIfNeeded()
    const user = storageService
      .getUsers()
      .find((item) => item.email.toLowerCase() === email.toLowerCase() && item.password === password && item.active)

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
