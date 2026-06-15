import { useMemo } from 'react'
import {
  CalendarDays,
  Target,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  LineChart,
  Clock,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line as RechartsLine,
  LineChart as RechartsLineChart,
  AreaChart,
  Area,
} from 'recharts'

import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'
import { getWeekLabel } from '../lib/dates'
import { AREA_LABELS_SHORT } from '../types'

import { useData } from '../hooks/useData'

export function Dashboard() {
  const { dashboardMetrics, logs, mocks, areaPerformance, config } = useData()

  const weeklyChartData = useMemo(() => {
    const weekMap = new Map<string, { questions: number; hits: number; total: number }>()
    for (const log of logs) {
      const d = new Date(log.date + 'T00:00:00')
      const dayOfWeek = d.getDay()
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      const weekStart = new Date(d)
      weekStart.setDate(d.getDate() - diff)
      const key = weekStart.toISOString().split('T')[0]
      const existing = weekMap.get(key) || { questions: 0, hits: 0, total: 0 }
      existing.questions += log.questions_done
      existing.total += log.questions_done
      existing.hits += Math.round(log.questions_done * (log.hit_rate / 100))
      weekMap.set(key, existing)
    }
    return Array.from(weekMap.entries())
      .map(([week, data]) => ({
        week,
        label: getWeekLabel(week),
        questions: data.questions,
        hitRate: data.total > 0 ? Math.round((data.hits / data.total) * 100 * 10) / 10 : 0,
      }))
      .sort((a, b) => a.week.localeCompare(b.week))
      .slice(-12)
  }, [logs])

  const mockChartData = useMemo(() => {
    return [...mocks]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-10)
      .map((m) => ({
        name: m.name.length > 15 ? m.name.slice(0, 15) + '...' : m.name,
        percentage: m.percentage,
      }))
  }, [mocks])

  const areaChartData = useMemo(() => {
    return areaPerformance.map((a) => ({
      name: AREA_LABELS_SHORT[a.area] || a.area,
      hitRate: a.hit_rate,
      fill:
        a.hit_rate >= 80
          ? '#10b981'
          : a.hit_rate >= 70
            ? '#f59e0b'
            : '#ef4444',
    }))
  }, [areaPerformance])

  const metrics = dashboardMetrics

  return (
    <div>
      <PageHeader
        title="Dashboard Geral"
        description="Panorama completo da sua preparação"
        icon={BarChart3}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <StatCard
          title="Dias para ENAMED"
          value={metrics.days_to_enamed}
          icon={CalendarDays}
          color="rose"
          trend={metrics.days_to_enamed > 100 ? 'neutral' : 'down'}
        />
        <StatCard
          title="Dias para 1ª Prova"
          value={metrics.days_to_first_exam}
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Questões Acumuladas"
          value={metrics.total_questions.toLocaleString()}
          icon={Target}
          color="blue"
        />
        <StatCard
          title="Acertos Acumulados"
          value={metrics.total_correct.toLocaleString()}
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Taxa Global de Acerto"
          value={`${metrics.global_hit_rate}%`}
          icon={TrendingUp}
          color="violet"
          trend={metrics.evolution_percentage > 0 ? 'up' : metrics.evolution_percentage < 0 ? 'down' : 'neutral'}
        />
        <StatCard
          title="Meta Anual"
          value={`${metrics.yearly_progress}%`}
          subtitle={`${metrics.total_questions.toLocaleString()} / ${config.yearly_goal.toLocaleString()}`}
          icon={BarChart3}
          color="indigo"
        />
        <StatCard
          title="Meta Semanal"
          value={`${metrics.weekly_progress}%`}
          subtitle={`${config.weekly_goal} questões/semana`}
          icon={LineChart}
          color="cyan"
        />
        <StatCard
          title="Evolução"
          value={`${metrics.evolution_percentage > 0 ? '+' : ''}${metrics.evolution_percentage}%`}
          icon={TrendingUp}
          color={metrics.evolution_percentage > 0 ? 'emerald' : 'rose'}
          trend={metrics.evolution_percentage > 0 ? 'up' : 'down'}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="mb-4 text-sm font-semibold text-zinc-200">Acerto por Semana</h3>
          <div className="h-64">
            {weeklyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyChartData}>
                  <defs>
                    <linearGradient id="hitRateGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="label" stroke="#71717a" fontSize={12} />
                  <YAxis
                    stroke="#71717a"
                    fontSize={12}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #27272a',
                      borderRadius: '8px',
                      color: '#e4e4e7',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="hitRate"
                    stroke="#8b5cf6"
                    fill="url(#hitRateGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                Nenhum dado semanal ainda
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="mb-4 text-sm font-semibold text-zinc-200">Questões por Semana</h3>
          <div className="h-64">
            {weeklyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="label" stroke="#71717a" fontSize={12} />
                  <YAxis stroke="#71717a" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #27272a',
                      borderRadius: '8px',
                      color: '#e4e4e7',
                    }}
                  />
                  <Bar dataKey="questions" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                Nenhum dado semanal ainda
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="mb-4 text-sm font-semibold text-zinc-200">Evolução dos Simulados</h3>
          <div className="h-64">
            {mockChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={mockChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="name" stroke="#71717a" fontSize={12} />
                  <YAxis
                    stroke="#71717a"
                    fontSize={12}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #27272a',
                      borderRadius: '8px',
                      color: '#e4e4e7',
                    }}
                  />
                  <RechartsLine
                    type="monotone"
                    dataKey="percentage"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981', r: 4 }}
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                Nenhum simulado cadastrado ainda
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="mb-4 text-sm font-semibold text-zinc-200">Evolução por Grande Área</h3>
          <div className="h-64">
            {areaChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={areaChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    type="number"
                    stroke="#71717a"
                    fontSize={12}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <YAxis dataKey="name" type="category" stroke="#71717a" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #27272a',
                      borderRadius: '8px',
                      color: '#e4e4e7',
                    }}
                    formatter={(value) => [`${value}%`, 'Acerto']}
                  />
                  <Bar dataKey="hitRate" radius={[0, 4, 4, 0]}>
                    {areaChartData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                Nenhum dado de área cadastrado ainda
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
