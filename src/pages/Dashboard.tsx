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
  Activity,
} from 'lucide-react'

import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'
import { RecentWindowSelector } from '../components/RecentWindowSelector'
import { WeeklyHitRateChart } from '../components/charts/WeeklyHitRateChart'
import { WeeklyQuestionsChart } from '../components/charts/WeeklyQuestionsChart'
import { MockEvolutionChart } from '../components/charts/MockEvolutionChart'
import { AreaEvolutionChart } from '../components/charts/AreaEvolutionChart'
import { PlatformPerformance } from '../components/PlatformPerformance'
import { calculateGlobalHitRate, roundTo2, isErrorDue, filterRecentLogs } from '../lib/calculations'
import { formatDateShort } from '../lib/dates'

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
  const { dashboardMetrics, logs, mocks, areaPerformance, config, errors, loading, recentMetrics, recentWindow, setRecentWindow } = useData()

  const dueForReview = useMemo(() => {
    return errors.filter((e) => isErrorDue(e))
  }, [errors])

  const metrics = dashboardMetrics
  const globalRate = useMemo(() => calculateGlobalHitRate(logs), [logs])
  const windowLogs = useMemo(() => filterRecentLogs(logs, recentWindow), [logs, recentWindow])
  const windowQuestions = recentMetrics.total_questions
  const windowCorrect = recentMetrics.total_correct
  const enamedPassed = new Date(config.enamed_date + 'T00:00:00') < new Date(new Date().setHours(0, 0, 0, 0))
  const firstExamPassed = new Date(config.first_exam_date + 'T00:00:00') < new Date(new Date().setHours(0, 0, 0, 0))
  const yearPace = useMemo(() => {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const fimDoAno = new Date(hoje.getFullYear(), 11, 31)
    const diasRestantes = Math.max(0, Math.round((fimDoAno.getTime() - hoje.getTime()) / 86400000))
    const faltam = Math.max(0, config.yearly_goal - metrics.total_questions)
    return {
      diasRestantes,
      faltam,
      porDia: diasRestantes > 0 ? Math.ceil(faltam / diasRestantes) : faltam,
    }
  }, [config.yearly_goal, metrics.total_questions])

  const recentHitRate = recentMetrics.hit_rate
  const recentVsGlobal = roundTo2(recentHitRate - globalRate)
  const recentTrend = recentVsGlobal > 0 ? 'up' : recentVsGlobal < 0 ? 'down' : 'neutral'

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
        action={
          <RecentWindowSelector value={recentWindow} onChange={setRecentWindow} className="w-48" />
        }
      />

      {dueForReview.length > 0 && (
        <a
          href="/revisao"
          className="group mb-8 flex flex-col items-start justify-between gap-4 rounded-xl border border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-transparent p-5 transition-all hover:border-violet-500/40 hover:from-violet-500/20 sm:flex-row sm:items-center"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/20">
              <Brain size={24} className="text-violet-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-violet-200">
                Warm-up: {dueForReview.length} questão{dueForReview.length > 1 ? 'ões' : ''} para revisar hoje
              </h3>
              <p className="text-sm text-zinc-500">
                Responda as questões que você errou, veja o comentário e diga como foi
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-lg bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-300 transition-colors group-hover:bg-violet-500/20">
            Revisar agora →
          </span>
        </a>
      )}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Dias para ENAMED"
          value={enamedPassed ? '—' : metrics.days_to_enamed}
          subtitle={
            enamedPassed
              ? `Foi em ${formatDateShort(config.enamed_date)} · atualize em Configurações`
              : undefined
          }
          icon={CalendarDays}
          color={enamedPassed ? 'blue' : 'rose'}
          trend={enamedPassed ? 'neutral' : metrics.days_to_enamed > 100 ? 'neutral' : 'down'}
        />
        <StatCard
          title="Dias para 1ª Prova"
          value={firstExamPassed ? '—' : metrics.days_to_first_exam}
          subtitle={
            firstExamPassed
              ? `Foi em ${formatDateShort(config.first_exam_date)} · atualize em Configurações`
              : undefined
          }
          icon={Clock}
          color={firstExamPassed ? 'blue' : 'amber'}
        />
        <StatCard
          title="Questões Acumuladas"
          value={metrics.total_questions.toLocaleString()}
          subtitle={`+${windowQuestions.toLocaleString()} nos últimos ${recentWindow} dias`}
          icon={Target}
          color="blue"
        />
        <StatCard
          title="Acertos Acumulados"
          value={metrics.total_correct.toLocaleString()}
          subtitle={`+${windowCorrect.toLocaleString()} nos últimos ${recentWindow} dias`}
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title={`Taxa de Acerto (${recentWindow} dias)`}
          value={`${recentHitRate}%`}
          subtitle={`Global: ${globalRate}% | ${recentVsGlobal > 0 ? '+' : ''}${recentVsGlobal}pp vs global`}
          icon={TrendingUp}
          color={recentHitRate >= globalRate ? 'emerald' : 'amber'}
          trend={recentTrend}
        />
        <StatCard
          title="Meta Anual"
          value={`${metrics.yearly_progress}%`}
          subtitle={
            yearPace.faltam === 0
              ? `Meta batida: ${metrics.total_questions.toLocaleString()} / ${config.yearly_goal.toLocaleString()}`
              : `Faltam ${yearPace.faltam.toLocaleString()} em ${yearPace.diasRestantes} dias · ${yearPace.porDia}/dia`
          }
          icon={BarChart3}
          color={metrics.yearly_progress >= 100 ? 'emerald' : 'indigo'}
        />
        <StatCard
          title="Meta Semanal"
          value={`${metrics.weekly_progress}%`}
          subtitle={`${config.weekly_goal} questões/semana`}
          icon={LineChart}
          color="cyan"
        />
        <StatCard
          title="Constância"
          value={`${metrics.current_streak} ${metrics.current_streak === 1 ? 'dia' : 'dias'}`}
          subtitle={
            metrics.days_without_study === 0
              ? 'Estudou hoje'
              : `Última atividade há ${metrics.days_without_study} dia(s)`
          }
          icon={Activity}
          color={metrics.days_without_study >= 3 ? 'rose' : 'emerald'}
        />
      </div>

      <PlatformPerformance logs={windowLogs} compact examDate={new Date(config.first_exam_date)} windowDays={recentWindow} />

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
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
