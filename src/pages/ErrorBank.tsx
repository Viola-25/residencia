import { useState, useMemo } from 'react'
import { AlertTriangle, Search, Trash2, TrendingUp, BarChart3, Clock, Brain, Sparkles, TrendingDown } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'
import { Badge } from '../components/Badge'
import { useData } from '../hooks/useData'
import { formatDateShort } from '../lib/dates'
import type { ErrorReason } from '../types'
import { ERROR_REASONS } from '../types'

const reasonColors: Record<ErrorReason, 'red' | 'yellow' | 'blue' | 'zinc' | 'green'> = {
  nao_sabia: 'red',
  esqueci: 'yellow',
  interpretacao: 'blue',
  pegadinha: 'zinc',
  pressa: 'green',
}

const SRS_QUALITIES = [
  { value: 'easy' as const, label: 'Fácil', icon: Sparkles, color: 'text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/30' },
  { value: 'good' as const, label: 'Bom', icon: Brain, color: 'text-sky-400 hover:bg-sky-500/20 border-sky-500/30' },
  { value: 'hard' as const, label: 'Difícil', icon: TrendingDown, color: 'text-amber-400 hover:bg-amber-500/20 border-amber-500/30' },
  { value: 'forgot' as const, label: 'Esqueci', icon: AlertTriangle, color: 'text-rose-400 hover:bg-rose-500/20 border-rose-500/30' },
]

function formatNextReview(dateStr: string | null): string {
  if (!dateStr) return '-'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const reviewDate = new Date(dateStr)
  reviewDate.setHours(0, 0, 0, 0)
  const diff = Math.round((reviewDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return 'Atrasada'
  if (diff === 0) return 'Hoje'
  if (diff === 1) return 'Amanhã'
  if (diff <= 7) return `Em ${diff} dias`
  return formatDateShort(dateStr.split('T')[0])
}

export function ErrorBank() {
  const { errors, reviewErrorWithSRS, deleteError } = useData()
  const [search, setSearch] = useState('')
  const [filterReason, setFilterReason] = useState<ErrorReason | 'all'>('all')
  const [filterReview, setFilterReview] = useState<'all' | 'pending' | 'reviewed'>('all')
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [flashcardReview, setFlashcardReview] = useState<{ error: typeof errors[0]; revealed: boolean } | null>(null)

  const topicStats = useMemo(() => {
    const topicMap = new Map<string, { count: number; lastDate: string; reasons: Set<string> }>()
    for (const e of errors) {
      const existing = topicMap.get(e.topic) || { count: 0, lastDate: '', reasons: new Set<string>() }
      existing.count++
      existing.reasons.add(e.error_reason)
      const d = e.created_at.split('T')[0]
      if (d > existing.lastDate) existing.lastDate = d
      topicMap.set(e.topic, existing)
    }
    return Array.from(topicMap.entries())
      .map(([topic, data]) => ({
        topic,
        count: data.count,
        lastDate: data.lastDate,
        reasons: Array.from(data.reasons),
      }))
      .sort((a, b) => b.count - a.count)
  }, [errors])

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

  const lastErrors = useMemo(() => {
    return [...errors].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5)
  }, [errors])

  const dueForReview = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return errors.filter((e) => {
      if (!e.next_review_date) return false
      const reviewDate = new Date(e.next_review_date)
      reviewDate.setHours(0, 0, 0, 0)
      return reviewDate <= today && !e.reviewed
    })
  }, [errors])

  const handleReview = (id: string, quality: 'easy' | 'good' | 'hard' | 'forgot') => {
    reviewErrorWithSRS(id, quality)
    setReviewingId(null)
  }

  return (
    <div>
      <PageHeader
        title="Banco de Erros"
        description="Consulte, revise e analise seus erros registrados automaticamente"
        icon={AlertTriangle}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de Erros"
          value={errors.length}
          icon={AlertTriangle}
          color="rose"
        />
        <StatCard
          title="Temas Diferentes"
          value={topicStats.length}
          icon={BarChart3}
          color="blue"
        />
        <StatCard
          title="Revisão Devida"
          value={dueForReview.length}
          icon={Clock}
          color={dueForReview.length > 0 ? 'amber' : 'emerald'}
        />
        <StatCard
          title="Mais Frequente"
          value={reasonRanking[0]?.reason || '-'}
          icon={TrendingUp}
          color="violet"
        />
      </div>

      {dueForReview.length > 0 && (
        <div className="mb-6 rounded-xl border border-violet-500/20 bg-violet-500/5 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-violet-200">
              <Brain size={16} />
              Revisão Espacada — {dueForReview.length} erro{dueForReview.length > 1 ? 's' : ''} pendente{dueForReview.length > 1 ? 's' : ''}
            </h3>
          </div>
          <div className="space-y-3">
            {dueForReview.slice(0, 5).map((err) => (
              <div key={err.id} className="rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-4">
                <div className="mb-1 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-200">{err.topic}</p>
                    <p className="mt-0.5 text-xs text-zinc-500 line-clamp-2">{err.question}</p>
                  </div>
                  {err.sugestao_revisao && (
                    <span className="shrink-0 rounded bg-violet-500/10 px-2 py-0.5 text-xs text-violet-400">
                      {err.sugestao_revisao}
                    </span>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  {SRS_QUALITIES.map((q) => {
                    const Icon = q.icon
                    return (
                      <button
                        key={q.value}
                        onClick={() => handleReview(err.id, q.value)}
                        className={`flex flex-1 items-center justify-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${q.color}`}
                      >
                        <Icon size={12} />
                        {q.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {dueForReview.length > 0 && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => {
              const next = dueForReview[0]
              if (next) setFlashcardReview({ error: next, revealed: false })
            }}
            className="flex items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-300 transition-colors hover:bg-violet-500/20"
          >
            <Brain size={16} />
            Modo Flashcard ({dueForReview.length} pendente{dueForReview.length > 1 ? 's' : ''})
          </button>
        </div>
      )}

      {flashcardReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
            {!flashcardReview.revealed ? (
              <>
                <div className="mb-2 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">
                  {ERROR_REASONS.find((r) => r.value === flashcardReview.error.error_reason)?.label}
                </div>
                <h2 className="mb-2 text-center text-xl font-bold text-zinc-100">
                  {flashcardReview.error.topic}
                </h2>
                <p className="mb-6 text-center text-sm text-zinc-500">
                  Tente lembrar o detalhe que te fez errar da última vez...
                </p>
                <div className="flex justify-center">
                  <button
                    onClick={() => setFlashcardReview({ ...flashcardReview, revealed: true })}
                    className="rounded-lg bg-violet-600 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-violet-500"
                  >
                    Revelar Anotação
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-2 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">
                  {flashcardReview.error.topic}
                </div>
                <div className="mb-4 rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
                  <p className="text-sm leading-relaxed text-zinc-300">
                    {flashcardReview.error.question}
                  </p>
                </div>
                {flashcardReview.error.history_notes && flashcardReview.error.history_notes.length > 1 && (
                  <div className="mb-4 rounded-lg border border-amber-500/10 bg-amber-500/5 p-3">
                    <p className="mb-1 text-xs font-medium text-amber-400">
                      Já errou {flashcardReview.error.occurrence_count}x
                    </p>
                    <ul className="space-y-0.5">
                      {flashcardReview.error.history_notes.slice(-3).reverse().map((note, i) => (
                        <li key={i} className="text-xs text-zinc-500">• {note}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {flashcardReview.error.sugestao_revisao && (
                  <div className="mb-4 rounded-lg bg-violet-500/10 p-3 text-center text-xs text-violet-400">
                    {flashcardReview.error.sugestao_revisao}
                  </div>
                )}
                <p className="mb-3 text-center text-xs text-zinc-500">Como foi sua recuperação?</p>
                <div className="flex gap-2">
                  {SRS_QUALITIES.map((q) => {
                    const Icon = q.icon
                    return (
                      <button
                        key={q.value}
                        onClick={() => {
                          reviewErrorWithSRS(flashcardReview.error.id, q.value)
                          setFlashcardReview(null)
                        }}
                        className={`flex flex-1 flex-col items-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${q.color}`}
                      >
                        <Icon size={14} />
                        {q.label}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
            <button
              onClick={() => setFlashcardReview(null)}
              className="mt-4 w-full text-center text-xs text-zinc-600 hover:text-zinc-400"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="mb-4 text-sm font-semibold text-zinc-200">Assuntos Mais Errados</h3>
          <div className="space-y-2">
            {topicStats.slice(0, 8).map((item, i) => (
              <div key={item.topic} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="shrink-0 text-xs text-zinc-600">{i + 1}º</span>
                  <span className="truncate text-zinc-300">{item.topic}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-zinc-500">{item.lastDate ? formatDateShort(item.lastDate) : ''}</span>
                  <span className="font-medium text-zinc-400">{item.count}x</span>
                </div>
              </div>
            ))}
            {topicStats.length === 0 && (
              <p className="text-sm text-zinc-500">Nenhum erro registrado</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="mb-4 text-sm font-semibold text-zinc-200">Ranking de Motivos</h3>
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

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="mb-4 text-sm font-semibold text-zinc-200">Últimos Erros</h3>
          <div className="space-y-2">
            {lastErrors.map((e) => (
              <div key={e.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="truncate text-zinc-300">{e.topic}</span>
                </div>
                <span className="shrink-0 text-xs text-zinc-500">
                  {formatDateShort(e.created_at.split('T')[0])}
                </span>
              </div>
            ))}
            {lastErrors.length === 0 && (
              <p className="text-sm text-zinc-500">Nenhum erro registrado</p>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex flex-wrap gap-3">
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
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs font-medium text-zinc-500">
                <th className="px-4 py-3">Erro / Descrição</th>
                <th className="px-4 py-3">Tema</th>
                <th className="px-4 py-3">Recorrência</th>
                <th className="px-4 py-3">Motivo</th>
                <th className="px-4 py-3">Revisão</th>
                <th className="px-4 py-3">Última Ocorrência</th>
                <th className="px-4 py-3">Sugestão</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((err) => (
                <tr
                  key={err.id}
                  className="border-b border-zinc-800/50 text-zinc-300 last:border-b-0 hover:bg-zinc-800/30"
                >
                  <td className="max-w-xs break-words px-4 py-3" title={err.question}>{err.question}</td>
                  <td className="px-4 py-3 font-medium">{err.topic}</td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${err.recorrencia > 1 ? 'text-amber-400' : 'text-zinc-400'}`}>
                      {err.recorrencia}x
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={reasonColors[err.error_reason]}>
                      {ERROR_REASONS.find((r) => r.value === err.error_reason)?.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {reviewingId === err.id ? (
                      <div className="flex gap-1">
                        {SRS_QUALITIES.map((q) => {
                          const Icon = q.icon
                          return (
                            <button
                              key={q.value}
                              onClick={() => handleReview(err.id, q.value)}
                              className={`flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors border ${q.color}`}
                            >
                              <Icon size={10} />
                              {q.label}
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <button
                        onClick={() => setReviewingId(err.id)}
                        className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                          err.reviewed
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : err.next_review_date && new Date(err.next_review_date) <= new Date()
                            ? 'bg-violet-500/10 text-violet-400 hover:bg-violet-500/20'
                            : 'bg-zinc-700/50 text-zinc-400'
                        }`}
                      >
                        {err.reviewed ? 'Revisado' : 'Revisar'}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    <div className="flex flex-col gap-0.5">
                      <span>{err.ultima_ocorrencia ? formatDateShort(err.ultima_ocorrencia) : formatDateShort(err.created_at.split('T')[0])}</span>
                      <span className="text-[10px] text-zinc-600">
                        {err.reviewed ? `Próx: ${formatNextReview(err.next_review_date)}` : formatNextReview(err.next_review_date)}
                      </span>
                    </div>
                  </td>
                  <td className="max-w-xs break-words px-4 py-3 text-xs text-zinc-500" title={err.sugestao_revisao || ''}>
                    {err.sugestao_revisao || (err.recorrencia > 1 ? 'Rever com urgência' : err.needs_review ? 'Revisar' : '-')}
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
                    colSpan={8}
                    className="px-4 py-12 text-center text-sm text-zinc-500"
                  >
                    {errors.length === 0
                      ? 'Nenhum erro registrado. Os erros são extraídos automaticamente das observações dos registros de estudo.'
                      : 'Nenhum erro encontrado com os filtros atuais'}
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
