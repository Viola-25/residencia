import { formatDateShort } from '../../lib/dates'
import { Badge } from '../Badge'
import { REGISTRATION_TYPES, MOOD_OPTIONS } from '../../types'
import type { DailyLog } from '../../types'

const moodColors: Record<string, string> = {
  excelente: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  bom: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  medio: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  ruim: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
}

interface ViewLogModalProps {
  log: DailyLog | null
  onClose: () => void
}

export function ViewLogModal({ log, onClose }: ViewLogModalProps) {
  if (!log) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl mx-4">
        <h3 className="mb-4 text-sm font-semibold text-zinc-200">Detalhes do Registro</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <span className="text-zinc-400">Data</span>
            <span className="text-zinc-200">{formatDateShort(log.date)}</span>
          </div>
          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <span className="text-zinc-400">Tipo</span>
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
          </div>
          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <span className="text-zinc-400">Horas Estudadas</span>
            <span className="text-zinc-200">{Math.round(log.hours_studied * 60)}min</span>
          </div>
          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <span className="text-zinc-400">Total de Questões</span>
            <span className="text-zinc-200">{log.questions_done}</span>
          </div>
          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <span className="text-zinc-400">Acertos</span>
            <span className="text-emerald-400">
              {log.areas_data.reduce((s, a) => s + a.correct, 0)}
            </span>
          </div>
          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <span className="text-zinc-400">Aproveitamento</span>
            <Badge
              variant={
                log.hit_rate >= 80 ? 'green' : log.hit_rate >= 70 ? 'yellow' : 'red'
              }
            >
              {log.hit_rate}%
            </Badge>
          </div>
          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <span className="text-zinc-400">Revisão Núcleo</span>
            <span className={log.core_review_done ? 'text-emerald-400' : 'text-zinc-600'}>
              {log.core_review_done ? 'Sim' : 'Não'}
            </span>
          </div>
          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <span className="text-zinc-400">Humor</span>
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${moodColors[log.mood]}`}
            >
              {MOOD_OPTIONS.find((m) => m.value === log.mood)?.label}
            </span>
          </div>
          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <span className="text-zinc-400">Energia</span>
            <span className="text-zinc-200">{log.energy_level}/10</span>
          </div>
          {log.notes && (
            <div className="border-b border-zinc-800 pb-2">
              <div className="text-zinc-400 mb-1">Observações</div>
              <div className="text-zinc-200 whitespace-pre-wrap">{log.notes}</div>
            </div>
          )}
          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <span className="text-zinc-400">Áreas</span>
            <span className="text-zinc-200">
              {log.areas_data
                .map((ad) => `${ad.area}: ${ad.questions_done} (${ad.correct} acertos)`)
                .join(', ')}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="mt-6 rounded-lg border border-zinc-700 px-6 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800"
        >
          Fechar
        </button>
      </div>
    </div>
  )
}
