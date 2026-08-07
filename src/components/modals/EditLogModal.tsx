import type { DailyLog, DailyLogFormData } from '../../types'
import { DailyLogForm } from '../forms/DailyLogForm'

interface EditLogModalProps {
  log: DailyLog | null
  onClose: () => void
  onSave: (id: string, data: DailyLogFormData) => void
}

function logToFormData(log: DailyLog): DailyLogFormData {
  const areas = Object.fromEntries(
    log.areas_data.map((ad) => [
      ad.area,
      { questions_done: ad.questions_done, correct: ad.correct },
    ])
  ) as DailyLogFormData['areas']
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
    platform_avg_rate: log.platform_avg_rate,
    platform_total_questions: log.platform_total_questions,
    easy_correct: log.easy_correct,
    easy_total: log.easy_total,
    medium_correct: log.medium_correct,
    medium_total: log.medium_total,
    hard_correct: log.hard_correct,
    hard_total: log.hard_total,
    name: log.name ?? '',
    ranking: log.ranking != null ? String(log.ranking) : '',
    participants: log.participants != null ? String(log.participants) : '',
    time_spent_minutes: log.time_spent_minutes != null ? String(log.time_spent_minutes) : '',
  }
}

export function EditLogModal({ log, onClose, onSave }: EditLogModalProps) {
  if (!log) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 pt-10">
      <div className="relative mb-10 w-full max-w-3xl rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl mx-4">
        <h3 className="mb-4 text-sm font-semibold text-zinc-200">Editar Registro</h3>
        <DailyLogForm
          defaultValues={logToFormData(log)}
          onSubmit={(data) => onSave(log.id, data)}
          onCancel={onClose}
          submitLabel="Salvar Alterações"
        />
      </div>
    </div>
  )
}
