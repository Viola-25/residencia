import { BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { PageHeader } from '../components/PageHeader'
import { Badge } from '../components/Badge'
import { useData } from '../hooks/useData'
import { MEDICAL_AREAS } from '../types'
import type { MedicalArea } from '../types'

const areaLabels: Record<MedicalArea, string> = {
  clinica_medica: 'Clínica Médica',
  cirurgia: 'Cirurgia',
  pediatria: 'Pediatria',
  ginecologia: 'Ginecologia',
  obstetricia: 'Obstetrícia',
  preventiva: 'Preventiva',
}

const priorityConfig = {
  red: { label: 'Prioridade Alta', badge: 'red' as const, border: 'border-red-500/20' },
  yellow: { label: 'Atenção', badge: 'yellow' as const, border: 'border-yellow-500/20' },
  green: { label: 'Bom Desempenho', badge: 'green' as const, border: 'border-emerald-500/20' },
}

export function Performance() {
  const { areaPerformance } = useData()

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
    name: areaLabels[a.area as MedicalArea].split(' ')[0],
    hitRate: a.hit_rate,
    fill:
      a.hit_rate >= 80
        ? '#10b981'
        : a.hit_rate >= 70
          ? '#f59e0b'
          : '#ef4444',
  }))

  return (
    <div>
      <PageHeader
        title="Desempenho por Área"
        description="Acompanhe seu desempenho nas grandes áreas da medicina"
        icon={BarChart3}
      />

      <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h3 className="mb-4 text-sm font-semibold text-zinc-200">Comparativo por Área</h3>
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
              Cadastre registros com questões para ver o desempenho por área
            </div>
          )}
        </div>
      </div>

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
                    {areaLabels[area.area as MedicalArea]}
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
  )
}
