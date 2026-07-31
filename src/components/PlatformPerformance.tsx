import { useMemo } from 'react'
import { Activity, BarChart3, PieChart } from 'lucide-react'
import type { DailyLog } from '../types'
import {
  calculatePlatformComparison,
  calculateDifficultyBreakdown,
  calculatePlatformInference,
  ESTIMATED_PLATFORM_SIGMA,
} from '../lib/calculations'

const difficultyColors: Record<string, { bar: string; text: string }> = {
  easy: { bar: 'bg-emerald-500', text: 'text-emerald-400' },
  medium: { bar: 'bg-amber-500', text: 'text-amber-400' },
  hard: { bar: 'bg-rose-500', text: 'text-rose-400' },
}

function deltaVariant(delta: number | null): 'green' | 'red' | 'yellow' {
  if (delta === null) return 'yellow'
  if (delta > 0) return 'green'
  if (delta < 0) return 'red'
  return 'yellow'
}

function ComparisonBar({ userRate, platformAvg }: { userRate: number; platformAvg: number | null }) {
  return (
    <div className="space-y-2">
      <div>
        <div className="mb-1 flex justify-between text-xs">
          <span className="text-zinc-500">Seu aproveitamento</span>
          <span className="font-medium text-zinc-200">{userRate}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-violet-500"
            style={{ width: `${Math.min(100, userRate)}%` }}
          />
        </div>
      </div>
      <div>
        <div className="mb-1 flex justify-between text-xs">
          <span className="text-zinc-500">Média da plataforma</span>
          <span className="font-medium text-zinc-200">
            {platformAvg !== null ? `${platformAvg}%` : '—'}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-zinc-500"
            style={{ width: `${Math.min(100, platformAvg ?? 0)}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function DifficultyRows({ logs, compact }: { logs: DailyLog[]; compact?: boolean }) {
  const breakdown = useMemo(() => calculateDifficultyBreakdown(logs), [logs])
  const hasData = breakdown.some((d) => d.total > 0)

  if (!hasData) {
    return (
      <div className="flex min-h-40 items-center justify-center text-center">
        <p className="max-w-xs text-xs text-zinc-500">
          Preencha o nível de dificuldade ao registrar atividades para ver o desempenho por dificuldade.
        </p>
      </div>
    )
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      {breakdown.map((d) => {
        if (d.total === 0) return null
        const colors = difficultyColors[d.level]
        return (
          <div key={d.level}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-zinc-500">{d.label}</span>
              <span className={colors.text}>
                {d.hit_rate !== null ? `${d.hit_rate}%` : '—'}
                <span className="ml-1 text-zinc-600">({d.correct}/{d.total})</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
              <div
                className={`h-full rounded-full ${colors.bar}`}
                style={{ width: `${Math.min(100, d.hit_rate ?? 0)}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

interface PlatformPerformanceProps {
  logs: DailyLog[]
  compact?: boolean
}

function formatP(p: number): string {
  if (p < 0.0001) return '<0.0001'
  return p.toFixed(4)
}

function InferenceCard({ logs }: { logs: DailyLog[] }) {
  const inference = useMemo(() => calculatePlatformInference(logs), [logs])
  const hasTTest = inference.p_value !== null && inference.t_stat !== null

  const tVerdict = (() => {
    if (!hasTTest) return null
    const dirP = inference.p_value! / 2
    if (dirP < 0.01) return { text: 'Forte evidência', color: 'text-emerald-400' }
    if (dirP < 0.05) return { text: 'Evidência', color: 'text-emerald-400' }
    if (dirP < 0.1) return { text: 'Tendência', color: 'text-amber-400' }
    return { text: 'Sem evidência', color: 'text-zinc-400' }
  })()
  const direction = inference.t_stat !== null && inference.t_stat > 0 ? 'acima' : 'abaixo'

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="mb-4 flex items-center gap-2">
        <PieChart size={16} className="text-violet-400" />
        <h3 className="text-sm font-semibold text-zinc-200">Inferência Estatística</h3>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="mb-1 text-xs font-medium text-zinc-500">Você supera a média?</p>
          {hasTTest && tVerdict ? (
            <>
              <p className={`text-xl font-bold ${tVerdict.color}`}>{tVerdict.text}</p>
              <p className="mt-1 text-xs text-zinc-500">
                de estar {direction} da média (p = {formatP(inference.p_value!)}, t ={' '}
                {inference.t_stat}, {inference.sessions} sessões)
              </p>
            </>
          ) : (
            <p className="text-sm text-zinc-500">
              Registre a média da plataforma em 2+ atividades para o teste estatístico.
            </p>
          )}
        </div>

        <div>
          <p className="mb-1 text-xs font-medium text-zinc-500">Precisão do seu hit rate</p>
          {inference.hit_rate_ci ? (
            <>
              <p className="text-xl font-bold text-zinc-200">
                {inference.hit_rate_ci.low}% – {inference.hit_rate_ci.high}%
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                intervalo de confiança de 95% (Wilson), sobre todos os registros
              </p>
            </>
          ) : (
            <p className="text-sm text-zinc-500">Nenhuma questão registrada ainda.</p>
          )}
        </div>

        <div>
          <p className="mb-1 text-xs font-medium text-zinc-500">Percentil estimado</p>
          {inference.estimated_percentile !== null && inference.estimated_quartile ? (
            <>
              <p className="text-xl font-bold text-zinc-200">
                P{inference.estimated_percentile}{' '}
                <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-400">
                  {inference.estimated_quartile}
                </span>
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                z estimado {inference.estimated_z}. Estimativa: assume distribuição normal e
                desvio padrão de {ESTIMATED_PLATFORM_SIGMA}pp entre candidatos — aproximado, sem o σ real da
                plataforma.
              </p>
            </>
          ) : (
            <p className="text-sm text-zinc-500">
              Requer registros com a média da plataforma.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export function PlatformPerformance({ logs, compact = false }: PlatformPerformanceProps) {
  const comparison = useMemo(() => calculatePlatformComparison(logs), [logs])

  if (comparison.logs_with_platform === 0) {
    return null
  }

  const delta = comparison.avg_score_delta
  const sign = delta !== null && delta > 0 ? '+' : ''

  if (compact) {
    return (
      <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-violet-400" />
            <h3 className="text-sm font-semibold text-zinc-200">Comparação com a plataforma</h3>
          </div>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
              deltaVariant(delta) === 'green'
                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                : deltaVariant(delta) === 'red'
                  ? 'border-rose-500/20 bg-rose-500/10 text-rose-400'
                  : 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400'
            }`}
          >
            {delta !== null ? `${sign}${delta} pts` : '—'}
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <ComparisonBar
            userRate={comparison.user_hit_rate}
            platformAvg={comparison.platform_avg_rate}
          />
          <DifficultyRows logs={logs} compact />
        </div>
      </div>
    )
  }

  return (
    <div className="mb-8 space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Activity size={16} className="text-violet-400" />
            <h3 className="text-sm font-semibold text-zinc-200">Comparação com a Média da Plataforma</h3>
          </div>

          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold tracking-tight text-zinc-100">
                {delta !== null ? `${sign}${delta}` : '—'}
                <span className="text-base font-medium text-zinc-500"> pts</span>
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">diferença média vs média da plataforma</p>
            </div>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                deltaVariant(delta) === 'green'
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                  : deltaVariant(delta) === 'red'
                    ? 'border-rose-500/20 bg-rose-500/10 text-rose-400'
                    : 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400'
              }`}
            >
              {delta !== null
                ? delta > 0
                  ? 'Acima da média'
                  : delta < 0
                    ? 'Abaixo da média'
                    : 'Na média'
                : 'Sem dados'}
            </span>
          </div>

          <ComparisonBar
            userRate={comparison.user_hit_rate}
            platformAvg={comparison.platform_avg_rate}
          />

          <p className="mt-3 text-xs text-zinc-600">
            Comparação nas {comparison.logs_with_platform}{' '}
            {comparison.logs_with_platform === 1 ? 'sessão' : 'sessões'} com média da plataforma
            registrada — não inclui o restante dos seus registros.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-4 border-t border-zinc-800 pt-4">
            <div>
              <p className="text-xl font-bold text-zinc-200">
                {comparison.above_average}
                <span className="text-sm font-medium text-zinc-500">
                  {' '}/ {comparison.logs_with_platform}
                </span>
              </p>
              <p className="text-xs text-zinc-500">registros acima da média</p>
            </div>
            <div>
              <p className="text-xl font-bold text-zinc-200">
                {comparison.above_average_pct !== null
                  ? `${comparison.above_average_pct}%`
                  : '—'}
              </p>
              <p className="text-xs text-zinc-500">do tempo acima da média</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-violet-400" />
            <h3 className="text-sm font-semibold text-zinc-200">Desempenho por Dificuldade</h3>
          </div>
          <DifficultyRows logs={logs} />
          <p className="mt-4 text-xs text-zinc-600">
            Taxa de acerto conforme o nível de dificuldade das questões registradas.
          </p>
        </div>
      </div>

      <InferenceCard logs={logs} />
    </div>
  )
}
