import { useMemo } from 'react'
import {
  CalendarDays,
  Target,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  LineChart,
  Clock,
  Brain,
} from 'lucide-react'

import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'
import { WeeklyHitRateChart } from '../components/charts/WeeklyHitRateChart'
import { WeeklyQuestionsChart } from '../components/charts/WeeklyQuestionsChart'
import { MockEvolutionChart } from '../components/charts/MockEvolutionChart'
import { AreaEvolutionChart } from '../components/charts/AreaEvolutionChart'
import { getHitRateTrend, calculateGlobalHitRate } from '../lib/calculations'

import { useData } from '../hooks/useData'

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-start justify-between">
        <div className="h-9 w-9 rounded-lg bg-zinc-800" />
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-7 w-20 rounded bg-zinc-800" />
        <div className="h-4 w-28 rounded bg-zinc-800" />
      </div>
    </div>
  )
}

function SkeletonChart() {
  return (
    <div className="min-w-0 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="mb-4 h-4 w-32 rounded bg-zinc-800" />
      <div className="h-64 rounded bg-zinc-800/50" />
    </div>
  )
}

export function Dashboard() {
  const { dashboardMetrics, logs, mocks, areaPerformance, config, errors, loading } = useData()

  const dueForReview = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return errors.filter((e) => {
      if (!e.next_review_date) return false
      const reviewDate = new Date(e.next_review_date)
      reviewDate.setHours(0, 0, 0, 0)
      return reviewDate <= today && !e.reviewed
    })
  }, [errors])

  const metrics = dashboardMetrics
  const hitRate30d = useMemo(() => getHitRateTrend(logs, 30), [logs])
  const globalRate = useMemo(() => calculateGlobalHitRate(logs), [logs])

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Dashboard Geral"
          description="Panorama completo da sua preparação"
          icon={BarChart3}
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonChart key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Dashboard Geral"
        description="Panorama completo da sua preparação"
        icon={BarChart3}
      />

      {dueForReview.length > 0 && (
        <a
          href="/erros"
          className="group mb-6 flex flex-col items-start justify-between gap-4 rounded-xl border border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-transparent p-5 transition-all hover:border-violet-500/40 hover:from-violet-500/20 sm:flex-row sm:items-center"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/20">
              <Brain size={24} className="text-violet-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-violet-200">
                Warm-up: {dueForReview.length} conceito{dueForReview.length > 1 ? 's' : ''} para revisar hoje
              </h3>
              <p className="text-sm text-zinc-500">
                Reveja os erros pendentes antes de começar os estudos — são só alguns minutos
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-lg bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-300 transition-colors group-hover:bg-violet-500/20">
            Revisar agora →
          </span>
        </a>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          title="Taxa de Acerto (30 dias)"
          value={`${hitRate30d.currentRate}%`}
          subtitle={`Global: ${globalRate}% | ${hitRate30d.diff > 0 ? '+' : ''}${hitRate30d.diff}% vs mês anterior`}
          icon={TrendingUp}
          color={hitRate30d.currentRate >= globalRate ? 'emerald' : 'amber'}
          trend={hitRate30d.trend}
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
        <div className="min-w-0 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="mb-4 text-sm font-semibold text-zinc-200">Acerto por Semana</h3>
          <WeeklyHitRateChart logs={logs} />
        </div>

        <div className="min-w-0 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="mb-4 text-sm font-semibold text-zinc-200">Questões por Semana</h3>
          <WeeklyQuestionsChart logs={logs} />
        </div>

        <div className="min-w-0 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="mb-4 text-sm font-semibold text-zinc-200">Evolução dos Simulados</h3>
          <MockEvolutionChart mocks={mocks} />
        </div>

        <div className="min-w-0 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="mb-4 text-sm font-semibold text-zinc-200">Evolução por Grande Área</h3>
          <AreaEvolutionChart areaPerformance={areaPerformance} />
        </div>
      </div>
    </div>
  )
}
