import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, UserRole } from '@/types'
import { authService } from '@/services/auth.service'
import { storageService } from '@/services/storage.service'

interface AuthContextValue {
  session: Session | null
  loading: boolean
  login: (username: string, password: string) => Promise<Session>
  loginAsRole: (role: UserRole) => Promise<Session>
  logout: () => Promise<void>
  refresh: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    storageService.seedIfNeeded()
    setSession(authService.getSessionSync())
  }, [])

  useEffect(() => {
    let active = true
    void storageService
      .init()
      .catch(() => undefined)
      .finally(() => {
        if (!active) return
        storageService.seedIfNeeded()
        setSession(authService.getSessionSync())
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      login: async (username, password) => {
        const next = await authService.login(username, password)
        setSession(next)
        return next
      },
      loginAsRole: async (role) => {
        const next = await authService.loginAsRole(role)
        setSession(next)
        return next
      },
      logout: async () => {
        await authService.logout()
        setSession(null)
      },
      refresh,
    }),
    [session, loading, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return context
}
