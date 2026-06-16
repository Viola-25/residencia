import { useState, useMemo } from 'react'
import { CalendarCheck, Plus, Moon, Zap, Trash2, XCircle, Edit, Eye, Brain } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'
import { Badge } from '../components/Badge'
import { useData } from '../hooks/useData'
import { formatDateShort, getTodayDateString } from '../lib/dates'
import type { DailyLog, DailyLogFormData, Mood, MedicalArea, InlineError } from '../types'
import { MOOD_OPTIONS, MEDICAL_AREAS, REGISTRATION_TYPES, ERROR_REASONS } from '../types'

const emptyAreas = () =>
  Object.fromEntries(
    MEDICAL_AREAS.map((a) => [a.value, { questions_done: 0, correct: 0 }])
  ) as DailyLogFormData['areas']

const initialForm: DailyLogFormData = {
  date: getTodayDateString(),
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

function LogFormBody({
  form,
  onFieldChange,
  onAreaChange,
  inlineErrors,
  onAddInlineError,
  onUpdateInlineError,
  onRemoveInlineError,
  showInlineErrors,
}: {
  form: DailyLogFormData
  onFieldChange: <K extends keyof DailyLogFormData>(key: K, value: DailyLogFormData[K]) => void
  onAreaChange: (area: MedicalArea, field: 'questions_done' | 'correct', value: number) => void
  inlineErrors: InlineError[]
  onAddInlineError: () => void
  onUpdateInlineError: (index: number, field: keyof InlineError, value: string) => void
  onRemoveInlineError: (index: number) => void
  showInlineErrors: boolean
}) {
  const totalQuestions = Object.values(form.areas).reduce((s, a) => s + a.questions_done, 0)
  const totalCorrect = Object.values(form.areas).reduce((s, a) => s + a.correct, 0)
  const hitRate = totalQuestions > 0
    ? Math.round((totalCorrect / totalQuestions) * 100 * 100) / 100
    : 0

  return (
    <>
      <div className="mb-6">
        <label className="mb-2 block text-xs font-medium text-zinc-400">Tipo de Registro</label>
        <div className="flex flex-wrap gap-2">
          {REGISTRATION_TYPES.map((t) => (
            <button
              type="button"
              key={t.value}
              onClick={() => onFieldChange('registration_type', t.value)}
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
            onChange={(e) => onFieldChange('date', e.target.value)}
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
            onChange={(e) => onFieldChange('hours_studied', Number(e.target.value))}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-4 rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2">
          <div>
            <p className="text-xs text-zinc-500">Total</p>
            <p className="text-lg font-bold text-zinc-100">{totalQuestions}</p>
          </div>
          <div className="h-8 w-px bg-zinc-700" />
          <div>
            <p className="text-xs text-zinc-500">Acertos</p>
            <p className="text-lg font-bold text-emerald-400">{totalCorrect}</p>
          </div>
          <div className="h-8 w-px bg-zinc-700" />
          <div>
            <p className="text-xs text-zinc-500">%</p>
            <p className={`text-lg font-bold ${
              hitRate >= 80 ? 'text-emerald-400' : hitRate >= 70 ? 'text-amber-400' : 'text-rose-400'
            }`}>
              {hitRate}%
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
                      onAreaChange(area.value, 'questions_done', Number(e.target.value))
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
                      onAreaChange(area.value, 'correct', Number(e.target.value))
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
              onClick={() => onFieldChange('mood', m.value)}
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
          onChange={(e) => onFieldChange('energy_level', Number(e.target.value))}
          className="w-full accent-violet-500"
        />
      </div>

      <div className="mb-4">
        <label className="mb-1 block text-xs font-medium text-zinc-400">Observações</label>
        <textarea
          value={form.notes}
          onChange={(e) => onFieldChange('notes', e.target.value)}
          rows={2}
          placeholder="Descreva a atividade: banco de questões, temas estudados..."
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
        />
      </div>

      {showInlineErrors && (
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-medium text-zinc-400">Erros na Atividade</label>
            <button
              type="button"
              onClick={onAddInlineError}
              className="flex items-center gap-1 rounded-md bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-400 transition-colors hover:bg-rose-500/20"
            >
              <Plus size={12} />
              Adicionar Erro
            </button>
          </div>
          <div className="space-y-2">
            {inlineErrors.map((err, index) => (
              <div
                key={index}
                className="rounded-lg border border-zinc-700 bg-zinc-800/30 p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-500">Erro #{index + 1}</span>
                  <button
                    type="button"
                    onClick={() => onRemoveInlineError(index)}
                    className="rounded p-0.5 text-zinc-600 hover:text-rose-400"
                  >
                    <XCircle size={14} />
                  </button>
                </div>
                <div className="mb-2">
                  <input
                    type="text"
                    value={err.topic}
                    onChange={(e) => onUpdateInlineError(index, 'topic', e.target.value)}
                    placeholder="Tema do erro (ex: Asma, DRGE)"
                    className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
                  />
                </div>
                <div className="mb-2 space-y-2">
                  <textarea
                    value={err.enunciado}
                    onChange={(e) => onUpdateInlineError(index, 'enunciado', e.target.value)}
                    rows={2}
                    placeholder="Enunciado da questão"
                    className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={err.alternativa_selecionada}
                      onChange={(e) => onUpdateInlineError(index, 'alternativa_selecionada', e.target.value)}
                      placeholder="Alternativa que selecionou"
                      className="w-full rounded-md border border-rose-500/30 bg-zinc-800 px-2 py-1.5 text-sm text-rose-300 focus:border-rose-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={err.alternativa_certa}
                      onChange={(e) => onUpdateInlineError(index, 'alternativa_certa', e.target.value)}
                      placeholder="Alternativa correta"
                      className="w-full rounded-md border border-emerald-500/30 bg-zinc-800 px-2 py-1.5 text-sm text-emerald-300 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {ERROR_REASONS.map((r) => (
                    <button
                      type="button"
                      key={r.value}
                      onClick={() => onUpdateInlineError(index, 'error_reason', r.value)}
                      className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
                        err.error_reason === r.value
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-zinc-700/50 text-zinc-400 border border-zinc-700 hover:bg-zinc-700'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {inlineErrors.length === 0 && (
              <p className="text-xs text-zinc-600">
                Nenhum erro adicionado. Você também pode descrever os erros nas observações que serão extraídos automaticamente.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export function DailyLog() {
  const { logs, dashboardMetrics, addDailyLog, updateDailyLog, deleteDailyLog, addSmartError } = useData()
  const [quickError, setQuickError] = useState<{ open: boolean; notes: string; area: MedicalArea }>({
    open: false,
    notes: '',
    area: 'clinica_medica',
  })
  const [form, setForm] = useState<DailyLogFormData>(initialForm)
  const [showForm, setShowForm] = useState(false)
  const [inlineErrors, setInlineErrors] = useState<InlineError[]>([])

  const [editLog, setEditLog] = useState<DailyLog | null>(null)
  const [editForm, setEditForm] = useState<DailyLogFormData>(initialForm)
  const [viewLog, setViewLog] = useState<DailyLog | null>(null)

  const totalFormQuestions = useMemo(
    () => Object.values(form.areas).reduce((s, a) => s + a.questions_done, 0),
    [form.areas]
  )

  const addInlineError = () => {
    setInlineErrors((prev) => [...prev, { topic: '', enunciado: '', alternativa_selecionada: '', alternativa_certa: '', error_reason: 'nao_sabia' }])
  }

  const updateInlineError = (index: number, field: keyof InlineError, value: string) => {
    setInlineErrors((prev) =>
      prev.map((e, i) => (i === index ? { ...e, [field]: value } : e))
    )
  }

  const removeInlineError = (index: number) => {
    setInlineErrors((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (totalFormQuestions === 0) return
    const enriched = {
      ...form,
      core_review_done: form.registration_type === 'revisao',
      flashcards_done: false,
      inline_errors: inlineErrors.filter((ie) => ie.topic.trim()),
    }
    addDailyLog(enriched)
    setForm(initialForm)
    setInlineErrors([])
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

  const logToFormData = (log: DailyLog): DailyLogFormData => {
    const areas = emptyAreas()
    for (const ad of log.areas_data) {
      areas[ad.area] = {
        questions_done: ad.questions_done,
        correct: ad.correct,
      }
    }
    return {
      date: log.date,
      registration_type: log.registration_type,
      hours_studied: log.hours_studied,
      areas,
      core_review_done: log.core_review_done,
      flashcards_done: log.flashcards_done,
      notes: log.notes || '',
      mood: log.mood,
      energy_level: log.energy_level,
    }
  }

  const openEditModal = (log: DailyLog) => {
    setEditForm(logToFormData(log))
    setEditLog(log)
  }

  const closeEditModal = () => {
    setEditLog(null)
    setEditForm(initialForm)
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editLog) return
    const totalQuestions = Object.values(editForm.areas).reduce((s, a) => s + a.questions_done, 0)
    if (totalQuestions === 0) return
    updateDailyLog(editLog.id, editForm)
    closeEditModal()
  }

  const updateEditField = <K extends keyof DailyLogFormData>(
    key: K,
    value: DailyLogFormData[K]
  ) => {
    setEditForm((prev) => ({ ...prev, [key]: value }))
  }

  const updateEditArea = (area: MedicalArea, field: 'questions_done' | 'correct', value: number) => {
    setEditForm((prev) => ({
      ...prev,
      areas: {
        ...prev.areas,
        [area]: { ...prev.areas[area], [field]: value },
      },
    }))
  }

  const openViewModal = (log: DailyLog) => {
    setViewLog(log)
  }

  const closeViewModal = () => {
    setViewLog(null)
  }

  const editTotalQuestions = Object.values(editForm.areas).reduce((s, a) => s + a.questions_done, 0)

  return (
    <div>
      <PageHeader
        title="Registro Diário"
        description="Registre seu desempenho diário"
        icon={CalendarCheck}
        action={
          <div className="flex gap-2">
            <button
              onClick={() => setQuickError((p) => ({ ...p, open: true }))}
              className="flex items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-300 transition-colors hover:bg-violet-500/20"
            >
              <Brain size={16} />
              Erro Rápido
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700"
            >
              <Plus size={16} />
              {showForm ? 'Cancelar' : 'Novo Registro'}
            </button>
          </div>
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

      {quickError.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
            <h3 className="mb-4 text-sm font-semibold text-zinc-200">Erro Rápido</h3>
            <p className="mb-4 text-xs text-zinc-500">
              Descreva o erro que você cometeu. A IA identifica o tema e agenda a revisão automaticamente.
            </p>
            <textarea
              value={quickError.notes}
              onChange={(e) => setQuickError((p) => ({ ...p, notes: e.target.value }))}
              placeholder='Ex: esqueci que no choque obstrutivo por tamponamento a conduta inicial é pericardiocentese, fui direto pra volume'
              rows={4}
              className="mb-3 w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:border-violet-500 focus:outline-none"
            />
            <select
              value={quickError.area}
              onChange={(e) => setQuickError((p) => ({ ...p, area: e.target.value as MedicalArea }))}
              className="mb-4 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
            >
              {MEDICAL_AREAS.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => setQuickError({ open: false, notes: '', area: 'clinica_medica' })}
                className="flex-1 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (!quickError.notes.trim()) return
                  await addSmartError(quickError.notes, quickError.area)
                  setQuickError({ open: false, notes: '', area: 'clinica_medica' })
                }}
                disabled={!quickError.notes.trim()}
                className="flex-1 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Salvar Erro
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
        >
          <h3 className="mb-4 text-sm font-semibold text-zinc-200">Novo Registro</h3>

          <LogFormBody
            form={form}
            onFieldChange={updateField}
            onAreaChange={updateArea}
            inlineErrors={inlineErrors}
            onAddInlineError={addInlineError}
            onUpdateInlineError={updateInlineError}
            onRemoveInlineError={removeInlineError}
            showInlineErrors={true}
          />

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
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${moodColors[log.mood]}`}
                    >
                      {MOOD_OPTIONS.find((m) => m.value === log.mood)?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">{log.energy_level}/10</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openViewModal(log)}
                        className="rounded p-1 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-blue-400"
                        title="Visualizar"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => openEditModal(log)}
                        className="rounded p-1 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-violet-400"
                        title="Editar"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Excluir este registro?')) deleteDailyLog(log.id)
                        }}
                        className="rounded p-1 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-rose-400"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-sm text-zinc-500">
                    Nenhum registro encontrado. Clique em "Novo Registro" para começar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editLog && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 pt-10">
          <div className="relative mb-10 w-full max-w-3xl rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl mx-4">
            <form onSubmit={handleEditSubmit}>
              <h3 className="mb-4 text-sm font-semibold text-zinc-200">Editar Registro</h3>

              <LogFormBody
                form={editForm}
                onFieldChange={updateEditField}
                onAreaChange={updateEditArea}
                inlineErrors={[]}
                onAddInlineError={() => {}}
                onUpdateInlineError={() => {}}
                onRemoveInlineError={() => {}}
                showInlineErrors={false}
              />

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={editTotalQuestions === 0}
                  className="rounded-lg bg-violet-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Salvar Alterações
                </button>
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-lg border border-zinc-700 px-6 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl mx-4">
            <h3 className="mb-4 text-sm font-semibold text-zinc-200">Detalhes do Registro</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-zinc-800 pb-2">
                <span className="text-zinc-400">Data</span>
                <span className="text-zinc-200">{formatDateShort(viewLog.date)}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-2">
                <span className="text-zinc-400">Tipo</span>
                <Badge
                  variant={
                    viewLog.registration_type === 'questoes'
                      ? 'blue'
                      : viewLog.registration_type === 'simulado'
                        ? 'green'
                        : 'yellow'
                  }
                >
                  {REGISTRATION_TYPES.find((t) => t.value === viewLog.registration_type)?.label}
                </Badge>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-2">
                <span className="text-zinc-400">Horas Estudadas</span>
                <span className="text-zinc-200">{viewLog.hours_studied}h</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-2">
                <span className="text-zinc-400">Total de Questões</span>
                <span className="text-zinc-200">{viewLog.questions_done}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-2">
                <span className="text-zinc-400">Acertos</span>
                <span className="text-emerald-400">
                  {viewLog.areas_data.reduce((s, a) => s + a.correct, 0)}
                </span>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-2">
                <span className="text-zinc-400">Aproveitamento</span>
                <Badge
                  variant={
                    viewLog.hit_rate >= 80 ? 'green' : viewLog.hit_rate >= 70 ? 'yellow' : 'red'
                  }
                >
                  {viewLog.hit_rate}%
                </Badge>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-2">
                <span className="text-zinc-400">Revisão Núcleo</span>
                <span className={viewLog.core_review_done ? 'text-emerald-400' : 'text-zinc-600'}>
                  {viewLog.core_review_done ? 'Sim' : 'Não'}
                </span>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-2">
                <span className="text-zinc-400">Humor</span>
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${moodColors[viewLog.mood]}`}
                >
                  {MOOD_OPTIONS.find((m) => m.value === viewLog.mood)?.label}
                </span>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-2">
                <span className="text-zinc-400">Energia</span>
                <span className="text-zinc-200">{viewLog.energy_level}/10</span>
              </div>
              {viewLog.notes && (
                <div className="border-b border-zinc-800 pb-2">
                  <div className="text-zinc-400 mb-1">Observações</div>
                  <div className="text-zinc-200 whitespace-pre-wrap">{viewLog.notes}</div>
                </div>
              )}
              <div className="flex justify-between border-b border-zinc-800 pb-2">
                <span className="text-zinc-400">Áreas</span>
                <span className="text-zinc-200">
                  {viewLog.areas_data
                    .map((ad) => `${ad.area}: ${ad.questions_done} (${ad.correct} acertos)`)
                    .join(', ')}
                </span>
              </div>
            </div>
            <button
              onClick={closeViewModal}
              className="mt-6 rounded-lg border border-zinc-700 px-6 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
