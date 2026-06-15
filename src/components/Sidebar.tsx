import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarCheck,
  FileText,
  BarChart3,
  AlertTriangle,
  Target,
  Brain,
  Sparkles,
  GraduationCap,
  Settings as SettingsIcon,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/diario', icon: CalendarCheck, label: 'Registro Diário' },
  { to: '/simulados', icon: FileText, label: 'Simulados' },
  { to: '/desempenho', icon: BarChart3, label: 'Desempenho' },
  { to: '/erros', icon: AlertTriangle, label: 'Banco de Erros' },
  { to: '/radar', icon: Target, label: 'Radar' },
  { to: '/estrategico', icon: Brain, label: 'Estratégico' },
  { to: '/ia', icon: Sparkles, label: 'IA Insights' },
  { to: '/configuracoes', icon: SettingsIcon, label: 'Configurações' },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user, logout } = useAuth()

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r border-zinc-800 bg-zinc-950 transition-transform duration-300 lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 border-b border-zinc-800 px-5 py-4">
          <div className="rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 p-2">
            <GraduationCap size={20} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-100">Residência 2027</p>
            <p className="text-xs text-zinc-500">Dashboard</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-zinc-800 px-5 py-3">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium text-zinc-300">
              {user?.email?.[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-zinc-300">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-rose-400"
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </aside>
    </>
  )
}
