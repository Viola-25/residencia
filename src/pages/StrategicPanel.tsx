import {
  Brain,
  TrendingUp,
  TrendingDown,
  Zap,
  Calendar,
  Trophy,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { Badge } from '../components/Badge'
import { useData } from '../hooks/useData'
import type { MedicalArea } from '../types'

const areaLabels: Record<MedicalArea, string> = {
  clinica_medica: 'Clínica Médica',
  cirurgia: 'Cirurgia',
  pediatria: 'Pediatria',
  ginecologia_obstetricia: 'Ginecologia e Obstetrícia',
  preventiva: 'Preventiva',
}

export function StrategicPanel() {
  const { strategicData } = useData()

  return (
    <div>
      <PageHeader
        title="Painel Estratégico"
        description="Análise automática dos seus pontos fortes e fracos"
        icon={Brain}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-rose-500/10 p-2">
              <Clock size={18} className="text-rose-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-100">
                {strategicData.days_without_study}
              </p>
              <p className="text-xs text-zinc-500">Dias sem estudar</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2">
              <Zap size={18} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-100">
                {strategicData.current_streak}
              </p>
              <p className="text-xs text-zinc-500">Sequência atual (dias)</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/10 p-2">
              <TrendingUp size={18} className="text-amber-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-zinc-100">
                {strategicData.most_growth
                  ? areaLabels[strategicData.most_growth.area].split(' ')[0]
                  : '-'}
              </p>
              <p className="text-xs text-zinc-500">Maior crescimento</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-500/10 p-2">
              <TrendingDown size={18} className="text-red-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-zinc-100">
                {strategicData.most_decline
                  ? areaLabels[strategicData.most_decline.area].split(' ')[0]
                  : '-'}
              </p>
              <p className="text-xs text-zinc-500">Maior queda</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-emerald-400">
            <TrendingUp size={16} />
            Maiores Pontos Fortes
          </h3>
          <div className="space-y-3">
            {strategicData.top_strengths.length > 0 ? (
              strategicData.top_strengths.map((s, i) => (
                <div
                  key={s.area}
                  className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-600">{i + 1}º</span>
                    <span className="text-sm text-zinc-200">
                      {areaLabels[s.area as MedicalArea]}
                    </span>
                  </div>
                  <Badge variant="green">{s.hit_rate}%</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-500">
                Registre questões nas áreas para ver seus pontos fortes
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-rose-400">
            <TrendingDown size={16} />
            Maiores Pontos Fracos
          </h3>
          <div className="space-y-3">
            {strategicData.top_weaknesses.length > 0 ? (
              strategicData.top_weaknesses.map((s, i) => (
                <div
                  key={s.area}
                  className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-600">{i + 1}º</span>
                    <span className="text-sm text-zinc-200">
                      {areaLabels[s.area as MedicalArea]}
                    </span>
                  </div>
                  <Badge variant="red">{s.hit_rate}%</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-500">
                Registre questões nas áreas para identificar pontos fracos
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <Calendar size={16} />
            Área com Maior Crescimento
          </h3>
          {strategicData.most_growth ? (
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-emerald-500/10 p-3">
                <TrendingUp size={24} className="text-emerald-400" />
              </div>
              <div>
                <p className="font-semibold text-zinc-100">
                  {areaLabels[strategicData.most_growth.area as MedicalArea]}
                </p>
                <p className="text-sm text-emerald-400">
                  +{strategicData.most_growth.growth}% de evolução
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">
              Dados insuficientes para calcular crescimento
            </p>
          )}
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <AlertCircle size={16} />
            Área com Maior Queda
          </h3>
          {strategicData.most_decline ? (
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-rose-500/10 p-3">
                <TrendingDown size={24} className="text-rose-400" />
              </div>
              <div>
                <p className="font-semibold text-zinc-100">
                  {areaLabels[strategicData.most_decline.area as MedicalArea]}
                </p>
                <p className="text-sm text-rose-400">
                  {strategicData.most_decline.decline}% de queda
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">
              Dados insuficientes para calcular queda
            </p>
          )}
        </div>
      </div>

      {strategicData.best_week && (
        <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="flex items-center gap-3">
            <Trophy size={20} className="text-amber-400" />
            <div>
              <p className="text-sm font-semibold text-amber-300">Melhor Semana do Ano</p>
              <p className="text-sm text-zinc-400">
                Semana de {strategicData.best_week.week_start} —{' '}
                {strategicData.best_week.questions_done} questões,{' '}
                {strategicData.best_week.hit_rate}% de acerto,{' '}
                {strategicData.best_week.hours_studied}h estudadas
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
