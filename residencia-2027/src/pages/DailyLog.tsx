import { useState, useMemo } from 'react'
import { CalendarCheck, Plus, Moon, Zap, Trash2 } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'
import { Badge } from '../components/Badge'
import { useData } from '../hooks/useData'
import { formatDateShort } from '../lib/dates'
import type { DailyLogFormData, Mood, MedicalArea } from '../types'
import { MOOD_OPTIONS, MEDICAL_AREAS, REGISTRATION_TYPES } from '../types'

const emptyAreas = () =>
  Object.fromEntries(
    MEDICAL_AREAS.map((a) => [a.value, { questions_done: 0, correct: 0 }])
  ) as DailyLogFormData['areas']

const initialForm: DailyLogFormData = {
  date: new Date().toISOString().split('T')[0],
  registration_type: 'questoes',
  hours_studied: 0,
  areas: emptyAreas(),
  core_review_done: false,
  flashcards_done: false,
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

const registrationTypeColors: Record<string, string> = {
  questoes: 'border-violet-500/20 bg-violet-500/5',
  simulado: 'border-emerald-500/20 bg-emerald-500/5',
  revisao: 'border-amber-500/20 bg-amber-500/5',
}

export function DailyLog() {
  const { logs, dashboardMetrics, addDailyLog, deleteDailyLog } = useData()
  const [form, setForm] = useState<DailyLogFormData>(initialForm)
  const [showForm, setShowForm] = useState(false)

  const totalFormQuestions = useMemo(
    () => Object.values(form.areas).reduce((s, a) => s + a.questions_done, 0),
    [form.areas]
  )
  const totalFormCorrect = useMemo(
    () => Object.values(form.areas).reduce((s, a) => s + a.correct, 0),
    [form.areas]
  )
  const formHitRate = totalFormQuestions > 0
    ? Math.round((totalFormCorrect / totalFormQuestions) * 100 * 100) / 100
    : 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (totalFormQuestions === 0) return
    const enriched = {
      ...form,
      core_review_done: form.registration_type === 'revisao',
      flashcards_done: false,
    }
    addDailyLog(enriched)
    setForm(initialForm)
    setShowForm(false)
  }

  const updateField = <K extends keyof DailyLogFormData>(
    key: K,
    value: DailyLogFormData[K]
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

          <div className="mb-6">
            <label className="mb-2 block text-xs font-medium text-zinc-400">Tipo de Registro</label>
            <div className="flex flex-wrap gap-2">
              {REGISTRATION_TYPES.map((t) => (
                <button
                  type="button"
                  key={t.value}
                  onClick={() => updateField('registration_type', t.value)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    form.registration_type === t.value
                      ? registrationTypeColors[t.value] + ' text-zinc-100'
                      : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-1">
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
            <div className="flex items-center gap-4 rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2">
              <div>
                <p className="text-xs text-zinc-500">Total</p>
                <p className="text-lg font-bold text-zinc-100">{totalFormQuestions}</p>
              </div>
              <div className="h-8 w-px bg-zinc-700" />
              <div>
                <p className="text-xs text-zinc-500">Acertos</p>
                <p className="text-lg font-bold text-emerald-400">{totalFormCorrect}</p>
              </div>
              <div className="h-8 w-px bg-zinc-700" />
              <div>
                <p className="text-xs text-zinc-500">%</p>
                <p className={`text-lg font-bold ${
                  formHitRate >= 80 ? 'text-emerald-400' : formHitRate >= 70 ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {formHitRate}%
                </p>
              </div>
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

          <div className="mb-4">
            <label className="mb-1 block text-xs font-medium text-zinc-400">Humor</label>
            <div className="flex flex-wrap gap-2">
              {MOOD_OPTIONS.map((m) => (
                <button
                  type="button"
                  key={m.value}
                  onClick={() => updateField('mood', m.value)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    form.mood === m.value
                      ? moodColors[m.value]
                      : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Nível de Energia: {form.energy_level}/10
            </label>
            <input
              type="range"
              min="0"
              max="10"
              value={form.energy_level}
              onChange={(e) => updateField('energy_level', Number(e.target.value))}
              className="w-full accent-violet-500"
            />
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-xs font-medium text-zinc-400">Observações</label>
            <textarea
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={totalFormQuestions === 0}
            className="rounded-lg bg-violet-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
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
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Horas</th>
                <th className="px-4 py-3">Questões</th>
                <th className="px-4 py-3">Acertos</th>
                <th className="px-4 py-3">%</th>
                <th className="px-4 py-3">Revisão</th>
                <th className="px-4 py-3">Flashcards</th>
                <th className="px-4 py-3">Humor</th>
                <th className="px-4 py-3">Energia</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {logs.slice(0, 30).map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-zinc-800/50 text-zinc-300 last:border-b-0 hover:bg-zinc-800/30"
                >
                  <td className="px-4 py-3">{formatDateShort(log.date)}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        log.registration_type === 'questoes'
                          ? 'blue'
                          : log.registration_type === 'simulado'
                            ? 'green'
                            : 'yellow'
                      }
                    >
                      {REGISTRATION_TYPES.find((t) => t.value === log.registration_type)?.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{log.hours_studied}h</td>
                  <td className="px-4 py-3">{log.questions_done}</td>
                  <td className="px-4 py-3">{log.areas_data.reduce((s, a) => s + a.correct, 0)}</td>
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
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${moodColors[log.mood]}`}
                    >
                      {MOOD_OPTIONS.find((m) => m.value === log.mood)?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">{log.energy_level}/10</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => {
                        if (confirm('Excluir este registro?')) deleteDailyLog(log.id)
                      }}
                      className="rounded p-1 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-rose-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-sm text-zinc-500">
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
