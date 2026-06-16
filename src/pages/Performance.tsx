import { useMemo } from 'react'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  CheckCircle2,
  XCircle,
  LineChart,
  Brain,
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
  AreaChart,
  Area,
} from 'recharts'
import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'
import { Badge } from '../components/Badge'
import { getWeekLabel } from '../lib/dates'
import { AREA_LABELS } from '../types'
import { getHitRateTrend, calculateGlobalHitRate } from '../lib/calculations'
import { useData } from '../hooks/useData'
import { MEDICAL_AREAS } from '../types'
import type { MedicalArea } from '../types'

const priorityConfig = {
  red: { label: 'Prioridade Alta', badge: 'red' as const, border: 'border-red-500/20' },
  yellow: { label: 'Atenção', badge: 'yellow' as const, border: 'border-yellow-500/20' },
  green: { label: 'Bom Desempenho', badge: 'green' as const, border: 'border-emerald-500/20' },
}

export function Performance() {
  const { areaPerformance, logs, dashboardMetrics, errors, approvalScore } = useData()

  const srsStats = useMemo(() => {
    if (errors.length === 0) return null
    const total = errors.length
    const consolidated = errors.filter((e) => e.repetitions >= 3 && e.interval_days >= 14 && e.reviewed).length
    const pending = errors.filter((e) => !e.reviewed).length
    const dueNow = errors.filter((e) => {
      if (!e.next_review_date) return false
      return new Date(e.next_review_date) <= new Date() && !e.reviewed
    }).length
    const healthyRate = total > 0 ? Math.round((consolidated / total) * 100) : 0
    return { total, consolidated, pending, dueNow, healthyRate }
  }, [errors])
  const hitRate30d = useMemo(() => getHitRateTrend(logs, 30), [logs])
  const globalRate = useMemo(() => calculateGlobalHitRate(logs), [logs])

  const allAreas = MEDICAL_AREAS.map(({ value }) => {
    const perf = areaPerformance.find((a) => a.area === value)
    return perf || {
      id: value,
      area: value as MedicalArea,
      questions_done: 0,
      correct: 0,
      hit_rate: 0,
      trend: 'stable' as const,
      priority: 'red' as const,
    }
  })

  const chartData = allAreas.map((a) => ({
    name: AREA_LABELS[a.area as MedicalArea].split(' ')[0],
    hitRate: a.hit_rate,
    fill:
      a.hit_rate >= 80
        ? '#10b981'
        : a.hit_rate >= 70
          ? '#f59e0b'
          : '#ef4444',
  }))

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
      const correct = log.areas_data && log.areas_data.length > 0
        ? log.areas_data.reduce((s, a) => s + a.correct, 0)
        : Math.round(log.questions_done * (log.hit_rate / 100))
      existing.hits += correct
      weekMap.set(key, existing)
    }
    return Array.from(weekMap.entries())
      .map(([week, data]) => ({
        week,
        label: getWeekLabel(week),
        questions: data.questions,
        hits: data.hits,
        errors: data.total - data.hits,
        hitRate: data.total > 0 ? Math.round((data.hits / data.total) * 100 * 10) / 10 : 0,
      }))
      .sort((a, b) => a.week.localeCompare(b.week))
      .slice(-12)
  }, [logs])

  const totalErrors = useMemo(
    () => weeklyChartData.reduce((s, w) => s + w.errors, 0),
    [weeklyChartData]
  )

  return (
    <div>
      <PageHeader
        title="Desempenho"
        description="Análise completa do seu desempenho nos estudos"
        icon={BarChart3}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de Questões"
          value={dashboardMetrics.total_questions.toLocaleString()}
          icon={Target}
          color="blue"
        />
        <StatCard
          title="Total de Acertos"
          value={dashboardMetrics.total_correct.toLocaleString()}
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Total de Erros"
          value={totalErrors.toLocaleString()}
          icon={XCircle}
          color="rose"
        />
        <StatCard
          title="Taxa de Acerto (30 dias)"
          value={`${hitRate30d.currentRate}%`}
          subtitle={`Global: ${globalRate}% | ${hitRate30d.diff > 0 ? '+' : ''}${hitRate30d.diff}% vs mês anterior`}
          icon={LineChart}
          color={hitRate30d.currentRate >= globalRate ? 'emerald' : 'amber'}
          trend={hitRate30d.trend}
        />
      </div>

      {srsStats && (
        <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Brain size={16} className="text-violet-400" />
            <h3 className="text-sm font-semibold text-zinc-200">Consolidação por Revisão Espacada</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-lg bg-zinc-800/50 p-3">
              <p className="text-xs text-zinc-500">Total de Erros</p>
              <p className="text-xl font-bold text-zinc-200">{srsStats.total}</p>
            </div>
            <div className="rounded-lg bg-emerald-500/10 p-3">
              <p className="text-xs text-emerald-400">Consolidados</p>
              <p className="text-xl font-bold text-emerald-400">{srsStats.consolidated}</p>
            </div>
            <div className="rounded-lg bg-amber-500/10 p-3">
              <p className="text-xs text-amber-400">Pendentes</p>
              <p className="text-xl font-bold text-amber-400">{srsStats.pending} ({srsStats.dueNow} atrasados)</p>
            </div>
            <div className="rounded-lg bg-violet-500/10 p-3">
              <p className="text-xs text-violet-400">Saúde do Banco</p>
              <p className="text-xl font-bold text-violet-400">{srsStats.healthyRate}%</p>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-violet-500 to-emerald-500 transition-all"
              style={{ width: `${srsStats.healthyRate}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-zinc-600">
            {srsStats.healthyRate >= 70
              ? 'Ótimo! A maioria dos conceitos já está consolidada na memória de longo prazo.'
              : srsStats.healthyRate >= 40
                ? 'Progresso consistente. Continue revisando para consolidar mais conceitos.'
                : 'Foque em revisar os erros pendentes para consolidar o aprendizado.'}
          </p>
        </div>
      )}

      <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h3 className="mb-4 text-sm font-semibold text-zinc-200">Evolução Temporal</h3>
        <div className="h-64">
          {weeklyChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyChartData}>
                <defs>
                  <linearGradient id="perfHitRateGradient" x1="0" y1="0" x2="0" y2="1">
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
                  formatter={(value) => [`${value}%`, 'Acerto']}
                />
                <Area
                  type="monotone"
                  dataKey="hitRate"
                  stroke="#8b5cf6"
                  fill="url(#perfHitRateGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500">
              {logs.length > 0
                ? 'Registre atividades em semanas diferentes para ver a evolução temporal'
                : 'Nenhum registro de estudo encontrado'}
            </div>
          )}
        </div>
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
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
                  <Bar dataKey="hits" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="errors" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                Nenhum dado semanal disponível
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="mb-4 text-sm font-semibold text-zinc-200">Comparativo por Grande Área</h3>
          <div className="h-72">
            {chartData.some((d) => d.hitRate > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
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
                    formatter={(value) => [`${value}%`, 'Acerto']}
                  />
                  <Bar dataKey="hitRate" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                {logs.length > 0
                  ? 'Distribua questões entre as áreas para ver o comparativo'
                  : 'Nenhum dado de área disponível'}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="mb-4 text-sm font-semibold text-zinc-200">Detalhamento por Grande Área</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allAreas.map((area) => {
            const config = priorityConfig[area.priority]
            return (
              <div
                key={area.area}
                className={`rounded-xl border bg-zinc-900/50 p-5 ${config.border}`}
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-200">
                      {AREA_LABELS[area.area as MedicalArea]}
                    </h3>
                    <Badge variant={config.badge as 'red' | 'yellow' | 'green'}>
                      {config.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    {area.trend === 'up' && <TrendingUp size={16} className="text-emerald-400" />}
                    {area.trend === 'down' && <TrendingDown size={16} className="text-rose-400" />}
                    {area.trend === 'stable' && <Minus size={16} className="text-zinc-400" />}
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Questões</span>
                    <span className="text-zinc-200">{area.questions_done}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Acertos</span>
                    <span className="text-zinc-200">{area.correct}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Erros</span>
                    <span className="text-zinc-200">{area.questions_done - area.correct}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Taxa de Acerto</span>
                    <span
                      className={`font-medium ${
                        area.hit_rate >= 80
                          ? 'text-emerald-400'
                          : area.hit_rate >= 70
                            ? 'text-amber-400'
                            : 'text-rose-400'
                      }`}
                    >
                      {area.hit_rate}%
                    </span>
                  </div>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className={`h-full rounded-full transition-all ${
                      area.hit_rate >= 80
                        ? 'bg-emerald-500'
                        : area.hit_rate >= 70
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, area.hit_rate)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
