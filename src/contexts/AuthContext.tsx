import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'

interface UserShape {
  id: string
  email: string | undefined
}

interface AuthContextType {
  user: UserShape | null
  loading: boolean
  login: (email: string, password: string) => Promise<string | null>
  signup: (email: string, password: string) => Promise<string | null>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

function mapSession(session: { user: { id: string; email: string | undefined } | null } | null): UserShape | null {
  return session?.user ? { id: session.user.id, email: session.user.email } : null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserShape | null>(null)
  const [loading, setLoading] = useState(true)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const auth: any = supabase.auth

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    auth.getSession().then(({ data: { session } }: any) => {
      setUser(mapSession(session))
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: { subscription } } = auth.onAuthStateChange((_event: string, session: any) => {
      setUser(mapSession(session))
    })

    return () => subscription.unsubscribe()
  }, [auth])

  const login = async (email: string, password: string): Promise<string | null> => {
    try {
      const { error } = await auth.signInWithPassword({ email, password })
      return error?.message ?? null
    } catch {
      return 'Erro ao conectar com o servidor'
    }
  }

  const signup = async (email: string, password: string): Promise<string | null> => {
    try {
      const { error } = await auth.signUp({ email, password })
      return error?.message ?? null
    } catch {
      return 'Erro ao conectar com o servidor'
    }
  }

  const logout = async () => {
    await auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
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

