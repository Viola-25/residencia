import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Minus } from 'lucide-react'
import { MEDICAL_AREAS, MOOD_OPTIONS, REGISTRATION_TYPES } from '../../types'
import type { DailyLogFormData, Mood, RegistrationType } from '../../types'
import { getTodayDateString } from '../../lib/dates'
import { calculateLogScore, formatScoreBadge, roundTo2 } from '../../lib/calculations'

const registrationTypeColors: Record<string, string> = {
  questoes: 'border-violet-500/20 bg-violet-500/5',
  simulado: 'border-emerald-500/20 bg-emerald-500/5',
  revisao: 'border-amber-500/20 bg-amber-500/5',
}

const moodColors: Record<Mood, string> = {
  excelente: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  bom: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  medio: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  ruim: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
}

const areaSchema = z.object({
  questions_done: z.coerce.number().min(0).default(0),
  correct: z.coerce.number().min(0).default(0),
})

const optNum = () => z.preprocess(
  (v) => (v === '' || v === undefined || v === null ? null : Number(v)),
  z.number().nullable()
).default(null)

const dailyLogSchema = z.object({
  date: z.string().min(1, 'Data é obrigatória'),
  registration_type: z.enum(['questoes', 'simulado', 'revisao'] as const),
  hours_studied: z.coerce.number().min(0).max(600),
  areas: z.record(z.string(), areaSchema),
  core_review_done: z.boolean().default(false),
  flashcards_done: z.boolean().default(false),
  notes: z.string().default(''),
  mood: z.enum(['excelente', 'bom', 'medio', 'ruim'] as const),
  energy_level: z.coerce.number().min(0).max(10).default(7),
  platform_avg_rate: optNum(),
  platform_total_questions: optNum(),
  easy_correct: optNum(),
  easy_total: optNum(),
  medium_correct: optNum(),
  medium_total: optNum(),
  hard_correct: optNum(),
  hard_total: optNum(),
})

type DailyLogFormValues = z.infer<typeof dailyLogSchema>

function defaultFormValues(): DailyLogFormValues {
  const areas = Object.fromEntries(
    MEDICAL_AREAS.map((a) => [a.value, { questions_done: 0, correct: 0 }])
  )
  return {
    date: getTodayDateString(),
    registration_type: 'questoes' as RegistrationType,
    hours_studied: 0,
    areas,
    core_review_done: false,
    flashcards_done: false,
    notes: '',
    mood: 'bom' as Mood,
    energy_level: 7,
    platform_avg_rate: null,
    platform_total_questions: null,
    easy_correct: null,
    easy_total: null,
    medium_correct: null,
    medium_total: null,
    hard_correct: null,
    hard_total: null,
  }
}

function logToFormValues(log: DailyLogFormData): DailyLogFormValues {
  const areas = Object.fromEntries(
    MEDICAL_AREAS.map((a) => [
      a.value,
      {
        questions_done: log.areas[a.value]?.questions_done ?? 0,
        correct: log.areas[a.value]?.correct ?? 0,
      },
    ])
  )
  const totalQ = Object.values(areas).reduce((s, a) => s + a.questions_done, 0)
  const typedTotal = log.platform_total_questions != null && log.platform_total_questions > 0
    ? log.platform_total_questions
    : null
  const platformTotalQ = typedTotal ?? (log.platform_avg_rate != null ? totalQ : null)
  const platformRaw = log.platform_avg_rate != null && platformTotalQ != null && platformTotalQ > 0
    ? Math.round((log.platform_avg_rate / 100) * platformTotalQ)
    : null
  return {
    date: log.date,
    registration_type: log.registration_type,
    hours_studied: Math.round(log.hours_studied * 60),
    areas,
    core_review_done: log.core_review_done,
    flashcards_done: log.flashcards_done,
    notes: log.notes,
    mood: log.mood,
    energy_level: log.energy_level,
    platform_avg_rate: platformRaw,
    platform_total_questions: platformTotalQ,
    easy_correct: log.easy_correct ?? null,
    easy_total: log.easy_total ?? null,
    medium_correct: log.medium_correct ?? null,
    medium_total: log.medium_total ?? null,
    hard_correct: log.hard_correct ?? null,
    hard_total: log.hard_total ?? null,
  }
}

interface DailyLogFormProps {
  defaultValues?: DailyLogFormData
  onSubmit: (data: DailyLogFormData) => void
  onCancel?: () => void
  submitLabel?: string
}

export function DailyLogForm({ defaultValues, onSubmit, onCancel, submitLabel = 'Salvar Registro' }: DailyLogFormProps) {
  const [difficultyOpen, setDifficultyOpen] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DailyLogFormValues>({
    resolver: zodResolver(dailyLogSchema) as unknown as Resolver<DailyLogFormValues>,
    defaultValues: defaultValues ? logToFormValues(defaultValues) : defaultFormValues(),
  })

  const formValues = watch()
  const totalQuestions = Object.values(formValues.areas).reduce((s, a) => s + (Number(a.questions_done) || 0), 0)
  const totalCorrect = Object.values(formValues.areas).reduce((s, a) => s + (Number(a.correct) || 0), 0)
  const hitRate = totalQuestions > 0
    ? Math.round((totalCorrect / totalQuestions) * 100 * 100) / 100
    : 0

  const platformRaw = formValues.platform_avg_rate
  const typedTotal = formValues.platform_total_questions != null && Number(formValues.platform_total_questions) > 0
    ? Number(formValues.platform_total_questions)
    : null
  const platformTotalQ = typedTotal ?? totalQuestions
  const platformAvgPct = platformRaw != null && Number(platformRaw) > 0 && platformTotalQ > 0
    ? roundTo2((Number(platformRaw) / platformTotalQ) * 100)
    : null
  const scorePreview = platformAvgPct !== null
    ? (() => {
        const { scoreDelta } = calculateLogScore(totalCorrect, totalQuestions, platformAvgPct)
        if (scoreDelta !== null) return formatScoreBadge(scoreDelta)
        return null
      })()
    : null

  const onFormSubmit = (values: DailyLogFormValues, submitEvent?: { currentTarget?: HTMLFormElement | null }) => {
    const areas = Object.fromEntries(
      Object.entries(values.areas).map(([key, val]) => [
        key,
        { questions_done: Number(val.questions_done), correct: Number(val.correct) },
      ])
    ) as DailyLogFormData['areas']

    const totalQ = Object.values(areas).reduce((s, a) => s + a.questions_done, 0)

    const liveValue = (name: string): number | null => {
      const el = submitEvent?.currentTarget?.elements?.namedItem(name) as HTMLInputElement | null
      const v = el?.value
      if (v === undefined || v === null || v.trim() === '') return null
      const n = Number(v)
      return Number.isFinite(n) ? n : null
    }

    const platformRaw = values.platform_avg_rate ?? liveValue('platform_avg_rate')
    const platformTotalRaw = values.platform_total_questions ?? liveValue('platform_total_questions')
    const typedTotal = platformTotalRaw != null && platformTotalRaw > 0
      ? platformTotalRaw
      : null
    const platformTotalQ = typedTotal ?? totalQ
    const platformAvgPct = platformRaw != null && platformTotalQ > 0
      ? roundTo2(Math.max(0, platformRaw) / platformTotalQ * 100)
      : null

    onSubmit({
      date: values.date,
      registration_type: values.registration_type,
      hours_studied: Number(values.hours_studied) / 60,
      areas,
      core_review_done: values.registration_type === 'revisao',
      flashcards_done: false,
      notes: values.notes,
      mood: values.mood,
      energy_level: Number(values.energy_level),
      platform_avg_rate: platformAvgPct,
      platform_total_questions: platformAvgPct !== null ? platformTotalQ : null,
      easy_correct: values.easy_correct,
      easy_total: values.easy_total,
      medium_correct: values.medium_correct,
      medium_total: values.medium_total,
      hard_correct: values.hard_correct,
      hard_total: values.hard_total,
    })
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <div>
        <label className="mb-2 block text-xs font-medium text-zinc-400">Tipo de Registro</label>
        <div className="flex flex-wrap gap-2">
          {REGISTRATION_TYPES.map((t) => (
            <button
              type="button"
              key={t.value}
              onClick={() => setValue('registration_type', t.value)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                formValues.registration_type === t.value
                  ? registrationTypeColors[t.value] + ' text-zinc-100'
                  : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-1">
          <label className="mb-1 block text-xs font-medium text-zinc-400">Data</label>
          <input
            type="date"
            {...register('date')}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
          />
          {errors.date && <p className="mt-1 text-xs text-rose-400">{errors.date.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-400">Minutos</label>
          <input
            type="number"
            step="1"
            min="0"
            max="600"
            {...register('hours_studied')}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2">
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
          <div className="h-8 w-px bg-zinc-700" />
          <div>
            <p className="text-xs text-zinc-500">Média da plataforma</p>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                max="999"
                step="1"
                placeholder="0"
                {...register('platform_avg_rate')}
                className="w-16 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
              />
              <span className="text-xs text-zinc-600">de</span>
              <input
                type="number"
                min="0"
                max="999"
                step="1"
                placeholder={String(totalQuestions)}
                {...register('platform_total_questions')}
                className="w-16 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
              />
              <span className="text-xs text-zinc-600">questões</span>
            </div>
          </div>
          {scorePreview && (
            <>
              <div className="h-8 w-px bg-zinc-700" />
              <div>
                <p className="text-xs text-zinc-500">Score</p>
                <p className={`text-lg font-bold ${
                  scorePreview.variant === 'green' ? 'text-emerald-400' : scorePreview.variant === 'red' ? 'text-rose-400' : 'text-amber-400'
                }`}>
                  {scorePreview.text}
                </p>
              </div>
            </>
          )}
        </div>
        <p className="mt-2 text-xs text-zinc-600">
          Média da plataforma: preencha o <span className="text-zinc-400">número de questões acertadas</span> que a plataforma mostrou (ex: 13) e o <span className="text-zinc-400">total de questões</span> da sessão na plataforma (ex: 20). O Score compara sua % com essa média.
        </p>
      </div>

      <div>
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
                    {...register(`areas.${area.value}.questions_done`)}
                    className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-zinc-500">Acertos</label>
                  <input
                    type="number"
                    min="0"
                    {...register(`areas.${area.value}.correct`)}
                    className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30">
        <button
          type="button"
          onClick={() => setDifficultyOpen(!difficultyOpen)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-zinc-300 hover:text-zinc-100"
        >
          <span>Detalhamento por Dificuldade <span className="text-zinc-500">(Opcional / Experimental)</span></span>
          {difficultyOpen ? <Minus size={16} /> : <Plus size={16} />}
        </button>
        {difficultyOpen && (
          <div className="space-y-3 border-t border-zinc-800 px-4 pb-4 pt-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-emerald-500/10 bg-emerald-500/5 p-3">
                <p className="mb-2 text-xs font-medium text-emerald-400">Fácil</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-zinc-500">Acertos</label>
                    <input
                      type="number"
                      min="0"
                      {...register('easy_correct')}
                      className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-zinc-500">Total</label>
                    <input
                      type="number"
                      min="0"
                      {...register('easy_total')}
                      className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-amber-500/10 bg-amber-500/5 p-3">
                <p className="mb-2 text-xs font-medium text-amber-400">Médio</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-zinc-500">Acertos</label>
                    <input
                      type="number"
                      min="0"
                      {...register('medium_correct')}
                      className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-zinc-500">Total</label>
                    <input
                      type="number"
                      min="0"
                      {...register('medium_total')}
                      className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-rose-500/10 bg-rose-500/5 p-3">
                <p className="mb-2 text-xs font-medium text-rose-400">Difícil</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-zinc-500">Acertos</label>
                    <input
                      type="number"
                      min="0"
                      {...register('hard_correct')}
                      className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-zinc-500">Total</label>
                    <input
                      type="number"
                      min="0"
                      {...register('hard_total')}
                      className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-400">Humor</label>
        <div className="flex flex-wrap gap-2">
          {MOOD_OPTIONS.map((m) => (
            <button
              type="button"
              key={m.value}
              onClick={() => setValue('mood', m.value)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                formValues.mood === m.value
                  ? moodColors[m.value]
                  : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-400">
          Nível de Energia: {formValues.energy_level}/10
        </label>
        <input
          type="range"
          min="0"
          max="10"
          {...register('energy_level')}
          className="w-full accent-violet-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-400">Observações</label>
        <textarea
          {...register('notes')}
          rows={2}
          placeholder="Descreva a atividade: banco de questões, temas estudados..."
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={totalQuestions === 0}
          className="rounded-lg bg-violet-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-zinc-700 px-6 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
