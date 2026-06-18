import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { MEDICAL_AREAS, MOOD_OPTIONS, REGISTRATION_TYPES } from '../../types'
import type { DailyLogFormData, Mood, RegistrationType } from '../../types'
import { getTodayDateString } from '../../lib/dates'

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

const dailyLogSchema = z.object({
  date: z.string().min(1, 'Data é obrigatória'),
  registration_type: z.enum(['questoes', 'simulado', 'revisao'] as const),
  hours_studied: z.coerce.number().min(0).max(24),
  areas: z.record(z.string(), areaSchema),
  core_review_done: z.boolean().default(false),
  flashcards_done: z.boolean().default(false),
  notes: z.string().default(''),
  mood: z.enum(['excelente', 'bom', 'medio', 'ruim'] as const),
  energy_level: z.coerce.number().min(0).max(10).default(7),
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
  return {
    date: log.date,
    registration_type: log.registration_type,
    hours_studied: log.hours_studied,
    areas,
    core_review_done: log.core_review_done,
    flashcards_done: log.flashcards_done,
    notes: log.notes,
    mood: log.mood,
    energy_level: log.energy_level,
  }
}

interface DailyLogFormProps {
  defaultValues?: DailyLogFormData
  onSubmit: (data: DailyLogFormData) => void
  onCancel?: () => void
  submitLabel?: string
}

export function DailyLogForm({ defaultValues, onSubmit, onCancel, submitLabel = 'Salvar Registro' }: DailyLogFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DailyLogFormValues>({
    resolver: zodResolver(dailyLogSchema),
    defaultValues: defaultValues ? logToFormValues(defaultValues) : defaultFormValues(),
  })

  const formValues = watch()
  const totalQuestions = Object.values(formValues.areas).reduce((s, a) => s + (Number(a.questions_done) || 0), 0)
  const totalCorrect = Object.values(formValues.areas).reduce((s, a) => s + (Number(a.correct) || 0), 0)
  const hitRate = totalQuestions > 0
    ? Math.round((totalCorrect / totalQuestions) * 100 * 100) / 100
    : 0

  const onFormSubmit = (values: DailyLogFormValues) => {
    const areas = Object.fromEntries(
      Object.entries(values.areas).map(([key, val]) => [
        key,
        { questions_done: Number(val.questions_done), correct: Number(val.correct) },
      ])
    ) as DailyLogFormData['areas']

    onSubmit({
      date: values.date,
      registration_type: values.registration_type,
      hours_studied: Number(values.hours_studied),
      areas,
      core_review_done: values.registration_type === 'revisao',
      flashcards_done: false,
      notes: values.notes,
      mood: values.mood,
      energy_level: Number(values.energy_level),
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
          <label className="mb-1 block text-xs font-medium text-zinc-400">Horas Estudadas</label>
          <input
            type="number"
            step="0.5"
            min="0"
            max="24"
            {...register('hours_studied')}
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
