import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { Session } from '@supabase/supabase-js'

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

function mapSession(session: Session | null): UserShape | null {
  return session?.user ? { id: session.user.id, email: session.user.email ?? undefined } : null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserShape | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(mapSession(session))
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(mapSession(session))
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email: string, password: string): Promise<string | null> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return error?.message ?? null
    } catch {
      return 'Erro ao conectar com o servidor'
    }
  }

  const signup = async (email: string, password: string): Promise<string | null> => {
    try {
      const { error } = await supabase.auth.signUp({ email, password })
      return error?.message ?? null
    } catch {
      return 'Erro ao conectar com o servidor'
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
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

