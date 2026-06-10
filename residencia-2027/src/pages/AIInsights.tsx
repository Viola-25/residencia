import { Sparkles, Lightbulb, TrendingUp, AlertCircle, Brain } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { Badge } from '../components/Badge'
import { useData } from '../hooks/useData'
import type { MedicalArea } from '../types'

const areaLabels: Record<MedicalArea, string> = {
  clinica_medica: 'Clínica Médica',
  cirurgia: 'Cirurgia',
  pediatria: 'Pediatria',
  ginecologia: 'Ginecologia',
  obstetricia: 'Obstetrícia',
  preventiva: 'Preventiva',
}

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
  const { aiInsights } = useData()

  const weeklyReports = aiInsights.filter((i) => i.type === 'weekly')
  const monthlyReports = aiInsights.filter((i) => i.type === 'monthly')
  const suggestions = aiInsights.filter((i) => i.type === 'suggestion' || i.type === 'priority')

  return (
    <div>
      <PageHeader
        title="Inteligência Artificial"
        description="Análises e recomendações geradas automaticamente"
        icon={Sparkles}
      />

      <div className="mb-8 rounded-xl border border-violet-500/20 bg-violet-500/5 p-5">
        <div className="flex items-start gap-3">
          <Brain size={20} className="mt-0.5 text-violet-400" />
          <div>
            <p className="text-sm font-medium text-violet-300">Assistente de Estudos IA</p>
            <p className="mt-1 text-sm text-zinc-400">
              Com base nos seus dados cadastrados, o sistema analisa padrões e gera recomendações
              personalizadas para otimizar sua preparação.
            </p>
          </div>
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-4 text-sm font-semibold text-zinc-200">
            Sugestões e Áreas Prioritárias
          </h3>
          <div className="grid gap-4">
            {suggestions.map((insight, i) => {
              const Icon = insightIcons[insight.type] || Lightbulb
              const areaName = insight.area
                ? areaLabels[insight.area as MedicalArea]
                : null
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
                        <Badge variant={badgePriority[insight.priority]}>
                          {insight.priority === 'high'
                            ? 'Prioritário'
                            : insight.priority === 'medium'
                              ? 'Importante'
                              : 'Informativo'}
                        </Badge>
                        {areaName && (
                          <Badge variant="blue">{areaName}</Badge>
                        )}
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

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-emerald-400">
            <TrendingUp size={16} />
            Relatório Semanal
          </h3>
          {weeklyReports.length > 0 ? (
            <div className="space-y-3">
              {weeklyReports.map((report, i) => (
                <div key={i} className="rounded-lg bg-zinc-800/30 p-3 text-sm text-zinc-300">
                  {report.description}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg bg-zinc-800/30 p-4 text-center text-sm text-zinc-500">
              <p>Nenhum relatório semanal disponível ainda.</p>
              <p className="mt-1">Continue registrando seus estudos para gerar relatórios automáticos.</p>
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
                <div key={i} className="rounded-lg bg-zinc-800/30 p-3 text-sm text-zinc-300">
                  {report.description}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg bg-zinc-800/30 p-4 text-center text-sm text-zinc-500">
              <p>Nenhum relatório mensal disponível ainda.</p>
              <p className="mt-1">Acumule mais dados de estudos para gerar análises mensais.</p>
            </div>
          )}
        </div>
      </div>

      {aiInsights.length === 0 && (
        <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
          <Sparkles size={32} className="mx-auto text-zinc-600" />
          <p className="mt-3 text-sm text-zinc-500">
            Nenhum insight disponível. Comece cadastrando seus estudos para receber
            recomendações personalizadas.
          </p>
        </div>
      )}
    </div>
  )
}
