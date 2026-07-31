import { useState } from 'react'
import { CalendarCheck, Plus, Moon, Zap, Trash2, Edit, Eye, Brain, Clock } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'
import { Badge } from '../components/Badge'
import { DailyLogForm } from '../components/forms/DailyLogForm'
import { QuickErrorModal } from '../components/modals/QuickErrorModal'
import { EditLogModal } from '../components/modals/EditLogModal'
import { ViewLogModal } from '../components/modals/ViewLogModal'
import { useData } from '../hooks/useData'
import { formatDateShort } from '../lib/dates'
import type { DailyLog, Mood, MedicalArea } from '../types'
import { MOOD_OPTIONS, REGISTRATION_TYPES } from '../types'

const moodColors: Record<Mood, string> = {
  excelente: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  bom: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  medio: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  ruim: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
}

export function DailyLog() {
  const { logs, dashboardMetrics, addDailyLog, updateDailyLog, deleteDailyLog, addSmartError } = useData()
  const [showForm, setShowForm] = useState(false)
  const [editLog, setEditLog] = useState<DailyLog | null>(null)
  const [viewLog, setViewLog] = useState<DailyLog | null>(null)
  const [quickErrorOpen, setQuickErrorOpen] = useState(false)

  const handleQuickError = async (notes: string, area: MedicalArea) => {
    await addSmartError(notes, area)
  }

  const handleEdit = (log: DailyLog) => {
    setEditLog(log)
  }

  const handleEditSave = (id: string, data: Parameters<typeof updateDailyLog>[1]) => {
    updateDailyLog(id, data)
    setEditLog(null)
  }

  return (
    <div>
      <PageHeader
        title="Registro Diário"
        description="Registre seu desempenho diário"
        icon={CalendarCheck}
        action={
          <div className="flex gap-2">
            <button
              onClick={() => setQuickErrorOpen(true)}
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

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de Dias"
          value={new Set(logs.map(l => l.date.split('T')[0])).size}
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
          title="Minutos Totais"
          value={(() => {
            const totalMinutes = logs.reduce((s, l) => s + l.hours_studied * 60, 0)
            const hours = Math.floor(totalMinutes / 60)
            const mins = Math.round(totalMinutes % 60)
            return hours > 0 ? `${hours}h${mins}min` : `${mins}min`
          })()}
          icon={Moon}
          color="violet"
        />
        <StatCard
          title="Média Min/Dia"
          value={(() => {
            const uniqueDays = new Set(logs.map(l => l.date.split('T')[0])).size
            const totalMinutes = logs.reduce((s, l) => s + l.hours_studied * 60, 0)
            return uniqueDays > 0 ? `${(totalMinutes / uniqueDays).toFixed(0)}min` : '0'
          })()}
          icon={Moon}
          color="emerald"
        />
        <StatCard
          title="Segundos/Questão"
          value={(() => {
            const totalMinutes = logs.reduce((s, l) => s + l.hours_studied * 60, 0)
            const totalQuestions = logs.reduce((s, l) => s + l.questions_done, 0)
            if (totalQuestions === 0) return '-'
            const secs = Math.round(totalMinutes * 60 / totalQuestions)
            const m = Math.floor(secs / 60)
            const s = secs % 60
            return m > 0 ? `${m}min${s}s` : `${s}s`
          })()}
          icon={Clock}
          color="cyan"
        />
      </div>

      {showForm && (
        <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h3 className="mb-4 text-sm font-semibold text-zinc-200">Novo Registro</h3>
          <DailyLogForm
            onSubmit={(data) => {
              addDailyLog(data)
              setShowForm(false)
            }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs font-medium text-zinc-500">
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Min</th>
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
                  <td className="px-4 py-3">{Math.round(log.hours_studied * 60)}min</td>
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
                        onClick={() => setViewLog(log)}
                        className="rounded p-1 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-blue-400"
                        title="Visualizar"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => handleEdit(log)}
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

      <QuickErrorModal
        open={quickErrorOpen}
        onClose={() => setQuickErrorOpen(false)}
        onSave={handleQuickError}
      />

      <EditLogModal
        log={editLog}
        onClose={() => setEditLog(null)}
        onSave={handleEditSave}
      />

      <ViewLogModal
        log={viewLog}
        onClose={() => setViewLog(null)}
      />
    </div>
  )
}
