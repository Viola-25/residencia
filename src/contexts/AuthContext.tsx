import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'

interface Session {
  user: { id: string; email?: string | null } | null
}

interface UserShape {
  id: string
  email: string | undefined
}

interface AuthContextType {
  user: UserShape | null
  loading: boolean
  connectionError: string | null
  login: (email: string, password: string) => Promise<string | null>
  signup: (email: string, password: string) => Promise<string | null>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

const auth = supabase.auth as unknown as {
  getSession(): Promise<{ data: { session: Session | null } }>
  signInWithPassword(args: { email: string; password: string }): Promise<{ error: { message: string } | null }>
  signUp(args: { email: string; password: string }): Promise<{ error: { message: string } | null }>
  signOut(): Promise<void>
  onAuthStateChange(callback: (event: string, session: Session | null) => void): { data: { subscription: { unsubscribe(): void } } }
}

const STARTUP_TIMEOUT_MS = 10000
const SIGNOUT_TIMEOUT_MS = 5000
const UNREACHABLE_MSG = 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

function mapSession(session: Session | null): UserShape | null {
  return session?.user ? { id: session.user.id, email: session.user.email ?? undefined } : null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserShape | null>(null)
  const [loading, setLoading] = useState(true)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: { session } } = await withTimeout(auth.getSession(), STARTUP_TIMEOUT_MS)
        if (cancelled) return
        setUser(mapSession(session as Session | null))
        setConnectionError(null)
      } catch {
        if (cancelled) return
        try {
          await withTimeout(auth.signOut(), SIGNOUT_TIMEOUT_MS)
        } catch {
          // noop
        }
        if (cancelled) return
        setUser(null)
        setConnectionError(UNREACHABLE_MSG)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    const { data: { subscription } } = auth.onAuthStateChange((event: string, session: Session | null) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') setConnectionError(null)
      setUser(mapSession(session))
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string): Promise<string | null> => {
    try {
      const { error } = await auth.signInWithPassword({ email, password })
      if (!error) setConnectionError(null)
      return error?.message ?? null
    } catch {
      return 'Erro ao conectar com o servidor'
    }
  }

  const signup = async (email: string, password: string): Promise<string | null> => {
    try {
      const { error } = await auth.signUp({ email, password })
      if (!error) setConnectionError(null)
      return error?.message ?? null
    } catch {
      return 'Erro ao conectar com o servidor'
    }
  }

  const logout = async () => {
    try {
      await auth.signOut()
    } catch {
      // noop
    }
    setUser(null)
    setConnectionError(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, connectionError, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

