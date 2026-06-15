import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Menu, LogOut } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { useAuth } from '../contexts/AuthContext'

const pageTitles: Record<string, string> = {
  '/': 'Painel de Performance',
  '/diario': 'Diário de Estudos',
  '/simulados': 'Simulados',
  '/desempenho': 'Desempenho por Área',
  '/erros': 'Banco de Erros',
  '/radar': 'Radar de Aprovação',
  '/estrategico': 'Painel Estratégico',
  '/ia': 'Insights de IA',
  '/configuracoes': 'Configurações',
}

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-zinc-800 bg-zinc-950/80 px-4 backdrop-blur-md lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 lg:hidden"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <span className="hidden sm:inline">Residência 2027</span>
            <span className="hidden sm:inline">/</span>
            <span className="text-zinc-400">{pageTitles[location.pathname] || 'Residência 2027'}</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-zinc-500">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-rose-400"
              title="Sair"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
