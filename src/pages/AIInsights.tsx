import { useState, useEffect, useCallback } from 'react'
import { Sparkles, Lightbulb, TrendingUp, AlertCircle, Brain, RefreshCw } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { Badge } from '../components/Badge'
import { useData } from '../hooks/useData'
import { generateInsights, loadCachedInsights } from '../lib/groq'
import { AREA_LABELS } from '../types'
import type { AIInsight } from '../types'

const insightIcons: Record<string, typeof Lightbulb> = {
  weekly: TrendingUp,
  monthly: TrendingUp,
  suggestion: Lightbulb,
  priority: AlertCircle,
}

const badgePriority: Record<string, 'red' | 'yellow' | 'green' | 'blue'> = {
  high: 'red',
  medium: 'yellow',
  low: 'green',
}

export function AIInsights() {
  const { logs, mocks, errors, areaPerformance, config } = useData()
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadInsights = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await generateInsights({
        logs,
        mocks,
        errors,
        areaPerformance,
        config,
      })
      setInsights(result)
    } catch {
      setError('Não foi possível gerar insights. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [logs, mocks, errors, areaPerformance, config])

  useEffect(() => {
    const init = async () => {
      const cached = await loadCachedInsights()
      if (cached && cached.length > 0) {
        setInsights(cached)
      } else if (logs.length > 0 || mocks.length > 0) {
        loadInsights()
      }
    }
    init()
  }, [loadInsights, logs.length, mocks.length])

  const suggestions = insights.filter(
    (i) => i.type === 'suggestion' || i.type === 'priority'
  )
  const weeklyReports = insights.filter((i) => i.type === 'weekly')
  const monthlyReports = insights.filter((i) => i.type === 'monthly')

  return (
    <div>
      <PageHeader
        title="Inteligência Artificial"
        description="Análises e recomendações geradas pelo Groq IA"
        icon={Sparkles}
        action={
          <button
            onClick={loadInsights}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Analisando...' : 'Atualizar'}
          </button>
        }
      />

      <div className="mb-8 rounded-xl border border-violet-500/20 bg-violet-500/5 p-5">
        <div className="flex items-start gap-3">
          <Brain size={20} className="mt-0.5 text-violet-400" />
          <div>
            <p className="text-sm font-medium text-violet-300">
              Análise com Groq IA ({import.meta.env.VITE_GROQ_API_KEY ? 'conectado' : 'modo local'})
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              Os insights são gerados com base nos seus dados reais usando o modelo
              LLaMA 3.3 70B via Groq.
            </p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
          <Sparkles size={32} className="mx-auto animate-pulse text-violet-500" />
          <p className="mt-3 text-sm font-medium text-zinc-300">
            Analisando seus dados...
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            A IA está processando seus registros para gerar insights personalizados
          </p>
        </div>
      )}

      {error && (
        <div className="mb-8 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-400">
          {error}
        </div>
      )}

      {!loading && suggestions.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-4 text-sm font-semibold text-zinc-200">
            Sugestões e Áreas Prioritárias
          </h3>
          <div className="grid gap-4">
            {suggestions.map((insight, i) => {
              const Icon = insightIcons[insight.type] || Lightbulb
              const areaName = insight.area ? AREA_LABELS[insight.area] : null
              return (
                <div
                  key={i}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition-colors hover:border-zinc-700"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`rounded-lg p-2 ${
                        insight.priority === 'high'
                          ? 'bg-rose-500/10'
                          : 'bg-amber-500/10'
                      }`}
                    >
                      <Icon
                        size={18}
                        className={
                          insight.priority === 'high'
                            ? 'text-rose-400'
                            : 'text-amber-400'
                        }
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-zinc-200">
                          {insight.title}
                        </h4>
                        <Badge
                          variant={
                            badgePriority[insight.priority] || 'blue'
                          }
                        >
                          {insight.priority === 'high'
                            ? 'Prioritário'
                            : insight.priority === 'medium'
                              ? 'Importante'
                              : 'Informativo'}
                        </Badge>
                        {areaName && <Badge variant="blue">{areaName}</Badge>}
                      </div>
                      <p className="mt-1 text-sm text-zinc-400">
                        {insight.description}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!loading && (
        insights.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-emerald-400">
                <TrendingUp size={16} />
                Relatório Semanal
              </h3>
              {weeklyReports.length > 0 ? (
                <div className="space-y-3">
                  {weeklyReports.map((report, i) => (
                    <div
                      key={i}
                      className="rounded-lg bg-zinc-800/30 p-3 text-sm text-zinc-300"
                    >
                      {report.description}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg bg-zinc-800/30 p-4 text-center text-sm text-zinc-500">
                  <p>Nenhum relatório semanal disponível.</p>
                  <p className="mt-1">
                    Continue registrando para receber análises semanais.
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-blue-400">
                <TrendingUp size={16} />
                Relatório Mensal
              </h3>
              {monthlyReports.length > 0 ? (
                <div className="space-y-3">
                  {monthlyReports.map((report, i) => (
                    <div
                      key={i}
                      className="rounded-lg bg-zinc-800/30 p-3 text-sm text-zinc-300"
                    >
                      {report.description}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg bg-zinc-800/30 p-4 text-center text-sm text-zinc-500">
                  <p>Nenhum relatório mensal disponível.</p>
                  <p className="mt-1">
                    Acumule mais dados para análises mensais.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : !error ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
            <Sparkles size={32} className="mx-auto text-zinc-600" />
            <p className="mt-3 text-sm text-zinc-500">
              Nenhum insight disponível. Clique em "Atualizar" para gerar análises.
            </p>
          </div>
        ) : null
      )}
    </div>
  )
}
