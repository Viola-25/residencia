import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'

type UserShape = {
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserShape | null>(null)
  const [loading, setLoading] = useState(true)
  const auth = supabase.auth as any

  useEffect(() => {
    auth.getSession().then(({ data: { session } }: any) => {
      console.log('[Auth] getSession:', session ? 'found' : 'none')
      setUser(session?.user ? { id: session.user.id, email: session.user.email } : null)
      setLoading(false)
    }).catch((err: any) => {
      console.error('[Auth] getSession error:', err)
      setLoading(false)
    })

    const { data: { subscription } } = auth.onAuthStateChange((_event: string, session: any) => {
      console.log('[Auth] state change:', _event, session?.user?.email)
      setUser(session?.user ? { id: session.user.id, email: session.user.email } : null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email: string, password: string): Promise<string | null> => {
    try {
      console.log('[Auth] login attempt:', email)
      const { error } = await auth.signInWithPassword({ email, password })
      console.log('[Auth] login result:', error ? error.message : 'success')
      return error?.message ?? null
    } catch (err: any) {
      console.error('[Auth] login exception:', err)
      return err?.message ?? 'Erro ao conectar com o servidor'
    }
  }

  const signup = async (email: string, password: string): Promise<string | null> => {
    try {
      console.log('[Auth] signup attempt:', email)
      const { error } = await auth.signUp({ email, password })
      console.log('[Auth] signup result:', error ? error.message : 'success')
      return error?.message ?? null
    } catch (err: any) {
      console.error('[Auth] signup exception:', err)
      return err?.message ?? 'Erro ao conectar com o servidor'
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

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
