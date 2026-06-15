import { useState } from 'react'
import { GraduationCap, LogIn, UserPlus, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export function Login() {
  const { login, signup } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    setSubmitting(true)

    try {
      const err = isSignup
        ? await signup(email, password)
        : await login(email, password)

      if (err) {
        setError(err)
      } else if (isSignup) {
        setSuccessMsg('Conta criada! Verifique seu email para confirmar.')
      }
    } catch (err: any) {
      setError(err?.message ?? 'Erro inesperado')
      console.error('[Login] handleSubmit exception:', err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600">
            <GraduationCap size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-zinc-100">Residência 2027</h1>
          <p className="mt-1 text-sm text-zinc-500">Painel de Performance</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="mb-6 text-sm font-semibold text-zinc-200">
            {isSignup ? 'Criar Conta' : 'Entrar'}
          </h2>

          {error && (
            <div className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
              {successMsg}
            </div>
          )}

          <div className="mb-4">
            <label className="mb-1 block text-xs font-medium text-zinc-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-violet-500 focus:outline-none"
            />
          </div>

          <div className="mb-6">
            <label className="mb-1 block text-xs font-medium text-zinc-400">Senha</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="mínimo 6 caracteres"
                required
                minLength={6}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 pr-10 text-sm text-zinc-200 placeholder-zinc-600 focus:border-violet-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : isSignup ? (
              <UserPlus size={16} />
            ) : (
              <LogIn size={16} />
            )}
            {isSignup ? 'Criar Conta' : 'Entrar'}
          </button>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => { setIsSignup(!isSignup); setError(''); setSuccessMsg('') }}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              {isSignup ? 'Já tem conta? Entrar' : 'Não tem conta? Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
