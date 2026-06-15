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
      setUser(session?.user ? { id: session.user.id, email: session.user.email } : null)
      setLoading(false)
    })

    const { data: { subscription } } = auth.onAuthStateChange((_event: string, session: any) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email } : null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email: string, password: string): Promise<string | null> => {
    const { error } = await auth.signInWithPassword({ email, password })
    return error?.message ?? null
  }

  const signup = async (email: string, password: string): Promise<string | null> => {
    const { error } = await auth.signUp({ email, password })
    return error?.message ?? null
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
