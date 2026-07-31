import { useState, useMemo } from 'react'
import { FileText, Plus, TrendingUp, TrendingDown, Award, Trash2 } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'
import { Badge } from '../components/Badge'
import { useData } from '../hooks/useData'
import { formatDateShort, getTodayDateString } from '../lib/dates'
import { getMockAverage, getMockTrend } from '../lib/calculations'
import type { MockExamFormData, MedicalArea } from '../types'
import { MEDICAL_AREAS } from '../types'

const emptyAreas = () =>
  Object.fromEntries(
    MEDICAL_AREAS.map((a) => [a.value, { questions_done: 0, correct: 0 }])
  ) as MockExamFormData['areas']

const initialForm: MockExamFormData = {
  date: getTodayDateString(),
  name: '',
  areas: emptyAreas(),
  ranking: '',
  participants: '',
  time_spent_minutes: '',
}

export function MockExams() {
  const { mocks, addMockExam, deleteMockExam } = useData()
  const [form, setForm] = useState<MockExamFormData>(initialForm)
  const [showForm, setShowForm] = useState(false)

  const stats = useMemo(() => {
    const sorted = [...mocks].sort((a, b) => a.date.localeCompare(b.date))
    const percentages = sorted.map((m) => m.percentage)
    return {
      average: getMockAverage(mocks),
      best: percentages.length > 0 ? Math.max(...percentages) : 0,
      worst: percentages.length > 0 ? Math.min(...percentages) : 0,
      trend: getMockTrend(mocks),
      bestMock: sorted.length > 0
        ? sorted.reduce((a, b) => (a.percentage > b.percentage ? a : b))
        : null,
    }
  }, [mocks])

  const chartData = useMemo(() => {
    return [...mocks]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((m) => ({
        name: m.name.length > 12 ? m.name.slice(0, 12) + '...' : m.name,
        percentage: m.percentage,
      }))
  }, [mocks])

  const totalFormQuestions = useMemo(
    () => Object.values(form.areas).reduce((s, a) => s + a.questions_done, 0),
    [form.areas]
  )
  const totalFormCorrect = useMemo(
    () => Object.values(form.areas).reduce((s, a) => s + a.correct, 0),
    [form.areas]
  )
  const formPercentage = totalFormQuestions > 0
    ? Math.round((totalFormCorrect / totalFormQuestions) * 100 * 100) / 100
    : 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (totalFormQuestions === 0 || !form.name) return
    addMockExam(form)
    setForm(initialForm)
    setShowForm(false)
  }

  const updateField = <K extends keyof MockExamFormData>(
    key: K,
    value: MockExamFormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const updateArea = (area: MedicalArea, field: 'questions_done' | 'correct', value: number) => {
    setForm((prev) => ({
      ...prev,
      areas: {
        ...prev.areas,
        [area]: { ...prev.areas[area], [field]: value },
      },
    }))
  }

  return (
    <div>
      <PageHeader
        title="Simulados"
        description="Acompanhe seus resultados em simulados"
        icon={FileText}
        action={
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700"
          >
            <Plus size={16} />
            {showForm ? 'Cancelar' : 'Novo Simulado'}
          </button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Média" value={`${stats.average}%`} icon={Award} color="blue" />
        <StatCard
          title="Melhor Resultado"
          value={`${stats.best}%`}
          icon={TrendingUp}
          color="emerald"
        />
        <StatCard
          title="Pior Resultado"
          value={`${stats.worst}%`}
          icon={TrendingDown}
          color="rose"
        />
        <StatCard
          title="Tendência"
          value={`${stats.trend > 0 ? '+' : ''}${stats.trend.toFixed(1)}%`}
          icon={stats.trend >= 0 ? TrendingUp : TrendingDown}
          color={stats.trend >= 0 ? 'emerald' : 'rose'}
        />
        <StatCard title="Total" value={mocks.length} icon={FileText} color="violet" />
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="mb-4 text-sm font-semibold text-zinc-200">Evolução dos Simulados</h3>
          <div className="h-64">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
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
                  />
                  <Line
                    type="monotone"
                    dataKey="percentage"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                Nenhum simulado cadastrado
              </div>
            )}
          </div>
        </div>

        {stats.bestMock && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <h3 className="mb-4 text-sm font-semibold text-zinc-200">Melhor Simulado</h3>
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-emerald-500/10 p-3">
                <Award size={28} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-zinc-100">{stats.bestMock.name}</p>
                <p className="text-sm text-zinc-400">
                  {formatDateShort(stats.bestMock.date)} — {stats.bestMock.percentage}%
                </p>
                {stats.bestMock.total_score > 0 && (
                  <p className="text-xs text-zinc-500">
                    Nota: {stats.bestMock.total_score}
                    {stats.bestMock.ranking &&
                      ` • Rank: ${stats.bestMock.ranking}º`}
                    {stats.bestMock.participants &&
                      ` / ${stats.bestMock.participants}`}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
        >
          <h3 className="mb-4 text-sm font-semibold text-zinc-200">Cadastrar Simulado</h3>

          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">Data</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => updateField('date', e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">Nome do Simulado</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Ex: ENARE 2026"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-xs font-medium text-zinc-400">
              Questões por Grande Área
            </label>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {MEDICAL_AREAS.map((area) => (
                <div
                  key={area.value}
                  className="rounded-lg border border-zinc-700 bg-zinc-800/30 p-3"
                >
                  <p className="mb-2 text-xs font-medium text-zinc-400">{area.label}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] text-zinc-500">Questões</label>
                      <input
                        type="number"
                        min="0"
                        value={form.areas[area.value].questions_done}
                        onChange={(e) =>
                          updateArea(area.value, 'questions_done', Number(e.target.value))
                        }
                        className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-zinc-500">Acertos</label>
                      <input
                        type="number"
                        min="0"
                        value={form.areas[area.value].correct}
                        onChange={(e) =>
                          updateArea(area.value, 'correct', Number(e.target.value))
                        }
                        className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-4 rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3">
            <div>
              <p className="text-xs text-zinc-500">Total de Questões</p>
              <p className="text-lg font-bold text-zinc-100">{totalFormQuestions}</p>
            </div>
            <div className="h-8 w-px bg-zinc-700" />
            <div>
              <p className="text-xs text-zinc-500">Total de Acertos</p>
              <p className="text-lg font-bold text-emerald-400">{totalFormCorrect}</p>
            </div>
            <div className="h-8 w-px bg-zinc-700" />
            <div>
              <p className="text-xs text-zinc-500">Percentual</p>
              <p
                className={`text-lg font-bold ${
                  formPercentage >= 80
                    ? 'text-emerald-400'
                    : formPercentage >= 70
                      ? 'text-amber-400'
                      : 'text-rose-400'
                }`}
              >
                {formPercentage}%
              </p>
            </div>
          </div>

          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">
                Classificação
                <span className="text-zinc-600"> (opcional)</span>
              </label>
              <input
                type="number"
                value={form.ranking}
                onChange={(e) => updateField('ranking', e.target.value)}
                placeholder="Ex: 15"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">
                Nº Participantes
                <span className="text-zinc-600"> (opcional)</span>
              </label>
              <input
                type="number"
                value={form.participants}
                onChange={(e) => updateField('participants', e.target.value)}
                placeholder="Ex: 500"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">
                Tempo Gasto
                <span className="text-zinc-600"> (min)</span>
              </label>
              <input
                type="number"
                value={form.time_spent_minutes}
                onChange={(e) => updateField('time_spent_minutes', e.target.value)}
                placeholder="Ex: 180"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={totalFormQuestions === 0 || !form.name}
            className="rounded-lg bg-violet-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Salvar Simulado
          </button>
        </form>
      )}

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs font-medium text-zinc-500">
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Questões</th>
                <th className="px-4 py-3">Acertos</th>
                <th className="px-4 py-3">%</th>
                <th className="px-4 py-3">Classificação</th>
                <th className="px-4 py-3">Tempo</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {mocks.map((mock) => (
                <tr
                  key={mock.id}
                  className="border-b border-zinc-800/50 text-zinc-300 last:border-b-0 hover:bg-zinc-800/30"
                >
                  <td className="px-4 py-3">{formatDateShort(mock.date)}</td>
                  <td className="px-4 py-3 font-medium text-zinc-100">{mock.name}</td>
                  <td className="px-4 py-3">
                    {mock.areas_data.reduce((s, a) => s + a.questions_done, 0)}
                  </td>
                  <td className="px-4 py-3">{mock.total_score}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        mock.percentage >= 80
                          ? 'green'
                          : mock.percentage >= 70
                            ? 'yellow'
                            : 'red'
                      }
                    >
                      {mock.percentage}%
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {mock.ranking
                      ? `${mock.ranking}º${mock.participants ? ` / ${mock.participants}` : ''}`
                      : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {mock.time_spent_minutes
                      ? `${Math.floor(mock.time_spent_minutes / 60)}h${mock.time_spent_minutes % 60}m`
                      : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => {
                        if (confirm('Excluir este simulado?')) deleteMockExam(mock.id)
                      }}
                      className="rounded p-1 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-rose-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {mocks.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-sm text-zinc-500"
                  >
                    Nenhum simulado cadastrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
