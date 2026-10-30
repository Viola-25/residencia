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
  RefreshCw,
  Download,
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
import { RecentWindowSelector } from '../components/RecentWindowSelector'
import { PlatformPerformance } from '../components/PlatformPerformance'
import { getWeekLabel, getTodayDateString, getWeekStartKey } from '../lib/dates'
import { AREA_LABELS, MEDICAL_AREAS } from '../types'
import { tooltipStyle } from '../lib/chartStyles'
import { getHitRateTrend, calculateGlobalHitRate, roundTo2, isErrorDue, filterRecentLogs } from '../lib/calculations'
import { buildPerformanceReport, downloadPerformanceReport } from '../lib/report'
import { useData } from '../hooks/useData'
import type { MedicalArea } from '../types'

const priorityConfig = {
  red: { label: 'Prioridade Alta', badge: 'red' as const, border: 'border-red-500/20' },
  yellow: { label: 'Atenção', badge: 'yellow' as const, border: 'border-yellow-500/20' },
  green: { label: 'Bom Desempenho', badge: 'green' as const, border: 'border-emerald-500/20' },
}

export function Performance() {
  const {
    areaPerformance,
    logs,
    dashboardMetrics,
    errors,
    recentMetrics,
    recentWindow,
    setRecentWindow,
    mocks,
    config,
    approvalScore,
    strategicData,
  } = useData()

  const handleExport = () => {
    const report = buildPerformanceReport({
      logs,
      mocks,
      errors,
      areaPerformance,
      recentMetrics,
      recentWindow,
      dashboardMetrics,
      approvalScore,
      config,
      strategicData,
    })
    downloadPerformanceReport(report, `relatorio-desempenho-${getTodayDateString()}.txt`)
  }

  const srsStats = useMemo(() => {
    if (errors.length === 0) return null
    const total = errors.length
    const comFlashcard = errors.filter((e) => e.reviewed && e.flashcard_front && e.flashcard_back).length
    const revisadosSemCard = errors.filter(
      (e) => e.reviewed && !(e.flashcard_front && e.flashcard_back),
    ).length
    const pending = errors.filter((e) => !e.reviewed).length
    const dueNow = errors.filter((e) => isErrorDue(e)).length
    const consolidados = errors.filter((e) => e.repetitions >= 3 && e.interval_days >= 14).length
    const cobertura = total > 0 ? Math.round((comFlashcard / total) * 100) : 0
    return { total, comFlashcard, revisadosSemCard, pending, dueNow, consolidados, cobertura }
  }, [errors])
  const hitRate30d = useMemo(() => getHitRateTrend(logs, 30), [logs])
  const globalRate = useMemo(() => calculateGlobalHitRate(logs), [logs])

  const windowLogs = useMemo(() => filterRecentLogs(logs, recentWindow), [logs, recentWindow])
  const windowQuestions = recentMetrics.total_questions
  const windowCorrect = recentMetrics.total_correct
  const windowErrors = Math.max(0, windowQuestions - windowCorrect)
  const windowRate = recentMetrics.hit_rate
  const rateVsGlobal = roundTo2(windowRate - globalRate)

  const recentAreaPerf = recentMetrics.area_performance
  const globalAreaPerf = areaPerformance

  const allAreas = useMemo(() => MEDICAL_AREAS.map(({ value }) => {
    const perf = globalAreaPerf.find((a) => a.area === value)
    return perf || {
      id: value,
      area: value as MedicalArea,
      questions_done: 0,
      correct: 0,
      hit_rate: 0,
      trend: 'stable' as const,
      priority: 'red' as const,
    }
  }), [globalAreaPerf])

  const attackList = useMemo(() => {
    return recentAreaPerf
      .map((r) => {
        const g = globalAreaPerf.find((a) => a.area === r.area)
        const delta = g ? roundTo2(r.hit_rate - g.hit_rate) : 0
        const lost = delta < 0 ? Math.round((Math.abs(delta) / 100) * r.questions_done) : 0
        return {
          area: r.area,
          recent: r.hit_rate,
          global: g?.hit_rate ?? null,
          delta,
          questions: r.questions_done,
          lost,
        }
      })
      .filter((a) => a.lost > 0)
      .sort((a, b) => b.lost - a.lost)
      .slice(0, 3)
  }, [recentAreaPerf, globalAreaPerf])

  const chartData = useMemo(() => allAreas.map((a) => {
    const recent = recentAreaPerf.find((r) => r.area === a.area)
    return {
      name: AREA_LABELS[a.area as MedicalArea].split(' ')[0],
      hitRate: a.hit_rate,
      recentHitRate: recent?.hit_rate ?? 0,
      fill:
        a.hit_rate >= 80
          ? '#10b981'
          : a.hit_rate >= 70
            ? '#f59e0b'
            : '#ef4444',
    }
  }), [allAreas, recentAreaPerf])

  const weeklyChartData = useMemo(() => {
    const weekMap = new Map<string, { questions: number; hits: number; total: number }>()
    for (const log of logs) {
      const key = getWeekStartKey(log.date)
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

  return (
    <div>
      <PageHeader
        title="Desempenho"
        description="Análise completa do seu desempenho nos estudos"
        icon={BarChart3}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              title="Exportar relatório de desempenho em TXT"
              className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-violet-500/40 hover:bg-zinc-800"
            >
              <Download size={16} className="text-violet-400" />
              Exportar
            </button>
            <RecentWindowSelector value={recentWindow} onChange={setRecentWindow} className="w-48" />
          </div>
        }
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={`Questões (${recentWindow} dias)`}
          value={windowQuestions.toLocaleString()}
          subtitle={`${windowLogs.length} registros no período`}
          icon={Target}
          color="blue"
        />
        <StatCard
          title={`Acertos (${recentWindow} dias)`}
          value={windowCorrect.toLocaleString()}
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title={`Erros (${recentWindow} dias)`}
          value={windowErrors.toLocaleString()}
          icon={XCircle}
          color="rose"
        />
        <StatCard
          title={`Taxa de Acerto (${recentWindow} dias)`}
          value={`${windowRate}%`}
          subtitle={`Global: ${globalRate}% | ${rateVsGlobal > 0 ? '+' : ''}${rateVsGlobal}pp vs global`}
          icon={LineChart}
          color={windowRate >= globalRate ? 'emerald' : 'amber'}
          trend={hitRate30d.trend}
        />
      </div>

      <PlatformPerformance logs={windowLogs} examDate={new Date(config.first_exam_date)} windowDays={recentWindow} />

      <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="mb-4 flex items-center gap-2">
          <RefreshCw size={16} className="text-violet-400" />
          <h3 className="text-sm font-semibold text-zinc-200">Áreas: Recente ({recentWindow} dias) vs Global</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allAreas.map((area) => {
            const recent = recentAreaPerf.find((r) => r.area === area.area)
            const globalRate = area.hit_rate
            const recentRate = recent?.hit_rate ?? 0
            const diff = roundTo2(recentRate - globalRate)
            const trend = diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral'
            const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
            const trendColor = trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-zinc-400'
            const config = priorityConfig[area.priority]
            return (
              <div key={area.area} className={`rounded-lg border bg-zinc-800/50 p-4 ${config.border}`}>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-zinc-200">{AREA_LABELS[area.area as MedicalArea]}</h4>
                  <Badge variant={config.badge as 'red' | 'yellow' | 'green'}>{config.label}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-zinc-500">Global</p>
                    <p className="font-bold text-zinc-200">{globalRate}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Recente</p>
                    <p className="font-bold text-zinc-200">{recentRate}%</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`text-lg font-bold ${trendColor}`}>{diff > 0 ? '+' : ''}{diff}pp</span>
                  <TrendIcon size={16} className={trendColor} />
                  <span className="text-xs text-zinc-500">
                    {trend === 'up' ? 'Subindo' : trend === 'down' ? 'Caindo' : 'Estável'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {attackList.length > 0 && (
        <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="mb-1 flex items-center gap-2">
            <TrendingDown size={16} className="text-rose-400" />
            <h3 className="text-sm font-semibold text-zinc-200">Onde atacar primeiro</h3>
          </div>
          <p className="mb-4 text-xs text-zinc-500">
            Queda vs global ({recentWindow} dias) ponderada pelo volume de questões — estimativa de
            acertos a recuperar se você voltar ao seu patamar.
          </p>
          <div className="space-y-2">
            {attackList.map((a, i) => (
              <div key={a.area} className="flex items-center gap-3 rounded-lg bg-zinc-800/50 p-3">
                <span className="w-6 text-xs font-medium text-zinc-600">{i + 1}º</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-200">
                    {AREA_LABELS[a.area as MedicalArea]}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    {a.questions} questões · {a.recent}% agora vs {a.global}% global ({a.delta > 0 ? '+' : ''}
                    {a.delta}pp)
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-rose-400">≈{a.lost} acertos</p>
                  <p className="text-[11px] text-zinc-600">a recuperar</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {srsStats && (
        <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Brain size={16} className="text-violet-400" />
            <h3 className="text-sm font-semibold text-zinc-200">Consolidação por Revisão Espacada</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-zinc-800/50 p-3">
              <p className="text-xs text-zinc-500">Total de Erros</p>
              <p className="text-xl font-bold text-zinc-200">{srsStats.total}</p>
            </div>
            <div className="rounded-lg bg-amber-500/10 p-3">
              <p className="text-xs text-amber-400">Pendentes</p>
              <p className="text-xl font-bold text-amber-400">{srsStats.pending}</p>
              <p className="text-[11px] text-amber-500/70">{srsStats.dueNow} atrasados</p>
            </div>
            <div className="rounded-lg bg-emerald-500/10 p-3">
              <p className="text-xs text-emerald-400">Com Flashcard</p>
              <p className="text-xl font-bold text-emerald-400">{srsStats.comFlashcard}</p>
              <p className="text-[11px] text-emerald-500/70">{srsStats.cobertura}% do banco</p>
            </div>
            <div className="rounded-lg bg-rose-500/10 p-3">
              <p className="text-xs text-rose-400">Revisados sem Card</p>
              <p className="text-xl font-bold text-rose-400">{srsStats.revisadosSemCard}</p>
              <p className="text-[11px] text-rose-500/70">saíram da fila sem estudar</p>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-violet-500 to-emerald-500 transition-all"
              style={{ width: `${srsStats.cobertura}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-zinc-600">
            {srsStats.revisadosSemCard > 0
              ? `${srsStats.revisadosSemCard} erro(s) foram revisados sem flashcard — voltam pela data agendada, mas a revisão fica só no reconhecimento. Gere cards para consolidar.`
              : srsStats.cobertura >= 70
                ? 'Ótimo! A maioria dos erros já tem flashcard e volta na revisão espaçada.'
                : srsStats.cobertura >= 40
                  ? 'Progresso consistente. Continue gerando flashcards para consolidar mais conceitos.'
                  : 'Gere flashcards dos erros pendentes — é o que consolida de verdade.'}
          </p>
          <p className="mt-1 text-[11px] text-zinc-700">
            Consolidados (SRS completo: 3+ repetições e intervalo ≥ 14 dias): {srsStats.consolidados}
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
                  contentStyle={tooltipStyle}
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
                    contentStyle={tooltipStyle}
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
                    contentStyle={tooltipStyle}
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
