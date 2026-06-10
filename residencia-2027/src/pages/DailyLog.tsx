import { useState } from 'react'
import { CalendarCheck, Plus, Moon, Zap } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'
import { Badge } from '../components/Badge'
import { useData } from '../hooks/useData'
import { formatDateShort } from '../lib/dates'
import type { DailyLogFormData, Mood } from '../types'
import { MOOD_OPTIONS } from '../types'

const initialForm: DailyLogFormData = {
  date: new Date().toISOString().split('T')[0],
  hours_studied: 0,
  questions_done: 0,
  hit_rate: 0,
  core_review_done: false,
  flashcards_done: false,
  mock_exam_done: false,
  notes: '',
  mood: 'bom',
  energy_level: 7,
}

const moodColors: Record<Mood, string> = {
  excelente: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  bom: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  medio: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  ruim: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
}

export function DailyLog() {
  const { logs, dashboardMetrics, addDailyLog } = useData()
  const [form, setForm] = useState<DailyLogFormData>(initialForm)
  const [showForm, setShowForm] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addDailyLog(form)
    setForm(initialForm)
    setShowForm(false)
  }

  const updateField = <K extends keyof DailyLogFormData>(
    key: K,
    value: DailyLogFormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div>
      <PageHeader
        title="Registro Diário"
        description="Registre seu desempenho diário"
        icon={CalendarCheck}
        action={
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700"
          >
            <Plus size={16} />
            {showForm ? 'Cancelar' : 'Novo Registro'}
          </button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de Dias"
          value={logs.length}
          icon={CalendarCheck}
          color="blue"
        />
        <StatCard
          title="Sequência Atual"
          value={`${dashboardMetrics.current_streak} dias`}
          icon={Zap}
          color="amber"
        />
        <StatCard
          title="Horas Totais"
          value={logs.reduce((s, l) => s + l.hours_studied, 0).toFixed(1)}
          icon={Moon}
          color="violet"
        />
        <StatCard
          title="Média Horas/Dia"
          value={logs.length > 0 ? (logs.reduce((s, l) => s + l.hours_studied, 0) / logs.length).toFixed(1) : '0'}
          icon={Moon}
          color="emerald"
        />
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
        >
          <h3 className="mb-4 text-sm font-semibold text-zinc-200">Novo Registro</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              <label className="mb-1 block text-xs font-medium text-zinc-400">Horas Estudadas</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="24"
                value={form.hours_studied}
                onChange={(e) => updateField('hours_studied', Number(e.target.value))}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">Questões Realizadas</label>
              <input
                type="number"
                min="0"
                value={form.questions_done}
                onChange={(e) => updateField('questions_done', Number(e.target.value))}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">Taxa de Acerto (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.hit_rate}
                onChange={(e) => updateField('hit_rate', Number(e.target.value))}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">Humor</label>
              <select
                value={form.mood}
                onChange={(e) => updateField('mood', e.target.value as Mood)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
              >
                {MOOD_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">
                Nível de Energia (0-10)
              </label>
              <input
                type="range"
                min="0"
                max="10"
                value={form.energy_level}
                onChange={(e) => updateField('energy_level', Number(e.target.value))}
                className="w-full accent-violet-500"
              />
              <span className="text-xs text-zinc-500">{form.energy_level}/10</span>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={form.core_review_done}
                onChange={(e) => updateField('core_review_done', e.target.checked)}
                className="accent-violet-500"
              />
              Revisão Núcleo
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={form.flashcards_done}
                onChange={(e) => updateField('flashcards_done', e.target.checked)}
                className="accent-violet-500"
              />
              Flashcards
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={form.mock_exam_done}
                onChange={(e) => updateField('mock_exam_done', e.target.checked)}
                className="accent-violet-500"
              />
              Simulado
            </label>
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-xs font-medium text-zinc-400">Observações</label>
            <textarea
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="mt-4 rounded-lg bg-violet-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500"
          >
            Salvar Registro
          </button>
        </form>
      )}

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs font-medium text-zinc-500">
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Horas</th>
                <th className="px-4 py-3">Questões</th>
                <th className="px-4 py-3">Acerto</th>
                <th className="px-4 py-3">Revisão</th>
                <th className="px-4 py-3">Flashcards</th>
                <th className="px-4 py-3">Simulado</th>
                <th className="px-4 py-3">Humor</th>
                <th className="px-4 py-3">Energia</th>
              </tr>
            </thead>
            <tbody>
              {logs.slice(0, 30).map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-zinc-800/50 text-zinc-300 last:border-b-0 hover:bg-zinc-800/30"
                >
                  <td className="px-4 py-3">{formatDateShort(log.date)}</td>
                  <td className="px-4 py-3">{log.hours_studied}h</td>
                  <td className="px-4 py-3">{log.questions_done}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        log.hit_rate >= 80
                          ? 'green'
                          : log.hit_rate >= 70
                            ? 'yellow'
                            : 'red'
                      }
                    >
                      {log.hit_rate}%
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {log.core_review_done ? (
                      <span className="text-emerald-400">Sim</span>
                    ) : (
                      <span className="text-zinc-600">Não</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {log.flashcards_done ? (
                      <span className="text-emerald-400">Sim</span>
                    ) : (
                      <span className="text-zinc-600">Não</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {log.mock_exam_done ? (
                      <span className="text-emerald-400">Sim</span>
                    ) : (
                      <span className="text-zinc-600">Não</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${moodColors[log.mood]}`}
                    >
                      {MOOD_OPTIONS.find((m) => m.value === log.mood)?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">{log.energy_level}/10</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-zinc-500">
                    Nenhum registro encontrado. Clique em "Novo Registro" para começar.
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
