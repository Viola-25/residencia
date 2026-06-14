import { Target, TrendingUp, CalendarCheck, BookOpen, AlertTriangle } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { useData } from '../hooks/useData'

const labelConfig: Record<string, { color: string; bg: string; desc: string }> = {
  'Abaixo do esperado': {
    color: 'text-rose-400',
    bg: 'bg-rose-500/10 border-rose-500/20',
    desc: 'Sua preparação precisa de mais consistência. Foque em aumentar carga de questões e revisões.',
  },
  'Competitivo': {
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    desc: 'Você está no caminho certo. Aumente o ritmo para se tornar muito competitivo.',
  },
  'Muito competitivo': {
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    desc: 'Bom nível de preparação. Continue consistente para atingir a faixa de aprovação.',
  },
  'Faixa de aprovação': {
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    desc: 'Você está na faixa de aprovação! Mantenha o ritmo e revise os pontos fracos.',
  },
}

const componentIcons: Record<string, typeof Target> = {
  hit_rate_score: TrendingUp,
  mock_evolution_score: Target,
  consistency_score: CalendarCheck,
  review_score: BookOpen,
  error_bank_score: AlertTriangle,
}

const componentLabels: Record<string, string> = {
  hit_rate_score: 'Acerto Global',
  mock_evolution_score: 'Evolução Simulados',
  consistency_score: 'Consistência Semanal',
  review_score: 'Revisões Realizadas',
  error_bank_score: 'Banco de Erros',
}

export function ApprovalRadar() {
  const { approvalScore } = useData()
  const config = labelConfig[approvalScore.label]
  const score = approvalScore.score

  const getStrokeColor = (value: number) => {
    if (value >= 80) return '#10b981'
    if (value >= 60) return '#3b82f6'
    if (value >= 40) return '#f59e0b'
    return '#ef4444'
  }

  return (
    <div>
      <PageHeader
        title="Radar de Aprovação"
        description="Score de preparação baseado em múltiplos fatores"
        icon={Target}
      />

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/50 p-8">
          <div className="relative mb-4">
            <svg width="180" height="180" viewBox="0 0 180 180">
              <circle
                cx="90"
                cy="90"
                r="80"
                fill="none"
                stroke="#27272a"
                strokeWidth="10"
              />
              <circle
                cx="90"
                cy="90"
                r="80"
                fill="none"
                stroke={getStrokeColor(score)}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${(score / 100) * 502.65} 502.65`}
                transform="rotate(-90 90 90)"
                style={{ transition: 'stroke-dasharray 1s ease' }}
              />
              <text
                x="90"
                y="80"
                textAnchor="middle"
                fill="#e4e4e7"
                fontSize="36"
                fontWeight="bold"
              >
                {score}
              </text>
              <text
                x="90"
                y="105"
                textAnchor="middle"
                fill="#71717a"
                fontSize="14"
              >
                / 100
              </text>
            </svg>
          </div>
          <div className={`rounded-full border px-4 py-1.5 text-sm font-medium ${config.bg} ${config.color}`}>
            {approvalScore.label}
          </div>
          <p className="mt-3 text-center text-sm text-zinc-500">{config.desc}</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h3 className="mb-4 text-sm font-semibold text-zinc-200">Componentes do Score</h3>
          <div className="space-y-4">
            {Object.entries(approvalScore.components).map(([key, value]) => {
              const Icon = componentIcons[key] || Target
              return (
                <div key={key}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Icon size={14} className="text-zinc-400" />
                      <span className="text-zinc-300">
                        {componentLabels[key] || key}
                      </span>
                    </div>
                    <span className="font-medium text-zinc-200">{value}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${value}%`,
                        backgroundColor: getStrokeColor(value),
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h3 className="mb-4 text-sm font-semibold text-zinc-200">Interpretação do Score</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(labelConfig).map(([label, cfg]) => (
            <div
              key={label}
              className={`rounded-lg border p-4 ${
                label === approvalScore.label
                  ? cfg.bg
                  : 'border-zinc-800 bg-zinc-900/30'
              }`}
            >
              <p
                className={`text-sm font-medium ${
                  label === approvalScore.label ? cfg.color : 'text-zinc-500'
                }`}
              >
                {label}
              </p>
              <p className="mt-1 text-xs text-zinc-500">{cfg.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
