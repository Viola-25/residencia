import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: 'up' | 'down' | 'neutral'
  color?: 'emerald' | 'blue' | 'violet' | 'amber' | 'rose' | 'cyan' | 'indigo'
}

const colorMap: Record<string, string> = {
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  violet: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
}

const trendIcon: Record<string, string> = {
  up: '↑',
  down: '↓',
  neutral: '→',
}

const trendColor: Record<string, string> = {
  up: 'text-emerald-400',
  down: 'text-rose-400',
  neutral: 'text-zinc-400',
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, color = 'blue' }: StatCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 backdrop-blur-sm transition-colors hover:border-zinc-700">
      <div className="flex items-start justify-between">
        <div className={`rounded-lg border p-2 ${colorMap[color]}`}>
          <Icon size={18} />
        </div>
        {trend && (
          <span className={`text-sm font-medium ${trendColor[trend]}`}>
            {trendIcon[trend]}
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold tracking-tight text-zinc-100">{value}</p>
        <p className="mt-0.5 text-sm font-medium text-zinc-400">{title}</p>
        {subtitle && (
          <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>
        )}
      </div>
    </div>
  )
}
