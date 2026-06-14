import { useState, useMemo } from 'react'
import { AlertTriangle, Plus, Search, Trash2 } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { Badge } from '../components/Badge'
import { useData } from '../hooks/useData'
import { formatDateShort } from '../lib/dates'
import type { ErrorEntryFormData, ErrorReason } from '../types'
import { ERROR_REASONS } from '../types'

const initialForm: ErrorEntryFormData = {
  question: '',
  topic: '',
  subtopic: '',
  error_reason: 'nao_sabia',
  needs_review: false,
}

const reasonColors: Record<ErrorReason, 'red' | 'yellow' | 'blue' | 'zinc' | 'green'> = {
  nao_sabia: 'red',
  esqueci: 'yellow',
  interpretacao: 'blue',
  pegadinha: 'zinc',
  pressa: 'green',
}

const reasonBtnColors: Record<ErrorReason, string> = {
  nao_sabia: 'border-red-500/20 bg-red-500/10 text-red-400',
  esqueci: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400',
  interpretacao: 'border-blue-500/20 bg-blue-500/10 text-blue-400',
  pegadinha: 'border-zinc-500/20 bg-zinc-500/10 text-zinc-400',
  pressa: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
}

export function ErrorBank() {
  const { errors, addError, toggleErrorReview, deleteError } = useData()
  const [form, setForm] = useState<ErrorEntryFormData>(initialForm)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [filterReason, setFilterReason] = useState<ErrorReason | 'all'>('all')
  const [filterReview, setFilterReview] = useState<'all' | 'pending' | 'reviewed'>('all')

  const filtered = useMemo(() => {
    return errors.filter((e) => {
      if (
        search &&
        !e.question.toLowerCase().includes(search.toLowerCase()) &&
        !e.topic.toLowerCase().includes(search.toLowerCase())
      )
        return false
      if (filterReason !== 'all' && e.error_reason !== filterReason) return false
      if (filterReview === 'pending' && e.reviewed) return false
      if (filterReview === 'reviewed' && !e.reviewed) return false
      return true
    })
  }, [errors, search, filterReason, filterReview])

  const reasonRanking = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const e of errors) {
      counts[e.error_reason] = (counts[e.error_reason] || 0) + 1
    }
    return Object.entries(counts)
      .map(([reason, count]) => ({
        reason: ERROR_REASONS.find((r) => r.value === reason)?.label || reason,
        count,
      }))
      .sort((a, b) => b.count - a.count)
  }, [errors])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addError(form)
    setForm(initialForm)
    setShowForm(false)
  }

  return (
    <div>
      <PageHeader
        title="Banco de Erros"
        description="Registre e acompanhe seus erros para revisão futura"
        icon={AlertTriangle}
        action={
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700"
          >
            <Plus size={16} />
            {showForm ? 'Cancelar' : 'Novo Erro'}
          </button>
        }
      />

      <div className="mb-6 grid gap-6 lg:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 lg:col-span-1">
          <h3 className="mb-3 text-sm font-semibold text-zinc-200">Ranking de Erros</h3>
          <div className="space-y-2">
            {reasonRanking.map((item, i) => (
              <div key={item.reason} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-600">{i + 1}º</span>
                  <span className="text-zinc-300">{item.reason}</span>
                </div>
                <span className="font-medium text-zinc-400">{item.count}</span>
              </div>
            ))}
            {reasonRanking.length === 0 && (
              <p className="text-sm text-zinc-500">Nenhum erro registrado</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
              />
              <input
                type="text"
                placeholder="Buscar por questão ou tema..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-9 pr-3 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
              />
            </div>
            <select
              value={filterReason}
              onChange={(e) =>
                setFilterReason(e.target.value as ErrorReason | 'all')
              }
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
            >
              <option value="all">Todos os motivos</option>
              {ERROR_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <select
              value={filterReview}
              onChange={(e) =>
                setFilterReview(e.target.value as 'all' | 'pending' | 'reviewed')
              }
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
            >
              <option value="all">Todos</option>
              <option value="pending">Pendentes</option>
              <option value="reviewed">Revisados</option>
            </select>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-left text-xs font-medium text-zinc-500">
                    <th className="px-4 py-3">Questão</th>
                    <th className="px-4 py-3">Tema</th>
                    <th className="px-4 py-3">Subtema</th>
                    <th className="px-4 py-3">Motivo</th>
                    <th className="px-4 py-3">Revisão</th>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((err) => (
                    <tr
                      key={err.id}
                      className="border-b border-zinc-800/50 text-zinc-300 last:border-b-0 hover:bg-zinc-800/30"
                    >
                      <td className="max-w-xs truncate px-4 py-3">{err.question}</td>
                      <td className="px-4 py-3 font-medium">{err.topic}</td>
                      <td className="px-4 py-3 text-zinc-500">
                        {err.subtopic || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={reasonColors[err.error_reason]}>
                          {ERROR_REASONS.find((r) => r.value === err.error_reason)
                            ?.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleErrorReview(err.id)}
                          className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                            err.reviewed
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                          }`}
                        >
                          {err.reviewed ? 'Revisado' : 'Pendente'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-zinc-500">
                        {formatDateShort(err.created_at.split('T')[0])}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            if (confirm('Excluir este erro?')) deleteError(err.id)
                          }}
                          className="rounded p-1 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-rose-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-12 text-center text-sm text-zinc-500"
                      >
                        Nenhum erro encontrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
        >
          <h3 className="mb-4 text-sm font-semibold text-zinc-200">Registrar Erro</h3>

          <div className="mb-4">
            <label className="mb-1 block text-xs font-medium text-zinc-400">Questão</label>
            <textarea
              value={form.question}
              onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
              rows={2}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
            />
          </div>

          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">Tema</label>
              <input
                type="text"
                value={form.topic}
                onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
                placeholder="Ex: Cardiologia"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">Subtema</label>
              <input
                type="text"
                value={form.subtopic}
                onChange={(e) => setForm((f) => ({ ...f, subtopic: e.target.value }))}
                placeholder="Ex: Insuficiência Cardíaca"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-xs font-medium text-zinc-400">Motivo do Erro</label>
            <div className="flex flex-wrap gap-2">
              {ERROR_REASONS.map((r) => (
                <button
                  type="button"
                  key={r.value}
                  onClick={() => setForm((f) => ({ ...f, error_reason: r.value }))}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    form.error_reason === r.value
                      ? reasonBtnColors[r.value]
                      : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <label className="mb-4 flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={form.needs_review}
              onChange={(e) => setForm((f) => ({ ...f, needs_review: e.target.checked }))}
              className="accent-violet-500"
            />
            Marcar para revisão futura
          </label>

          <button
            type="submit"
            disabled={!form.question || !form.topic}
            className="rounded-lg bg-violet-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Salvar Erro
          </button>
        </form>
      )}
    </div>
  )
}
