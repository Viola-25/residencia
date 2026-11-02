import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  RotateCcw,
  Search,
  Shuffle,
  Trash2,
  XCircle,
} from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'
import { Badge } from '../components/Badge'
import { useData } from '../hooks/useData'
import { formatDateShort } from '../lib/dates'
import { isErrorDue } from '../lib/calculations'
import { stripHtml } from '../lib/html'
import { ReviewSession } from '../components/review/ReviewSession'
import { QuestionContent } from '../components/review/QuestionContent'
import type { ErrorEntry, MedicalArea, ReviewRating } from '../types'
import {
  AREA_LABELS,
  MEDICAL_AREAS,
  PLATFORM_DIFFICULTY_LABELS,
  REVIEW_RATINGS,
} from '../types'

const SESSION_LIMIT = 20

function localDateKey(value: string | Date): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const date = typeof value === 'string' ? new Date(value) : value
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatNextReview(dateStr: string | null): string {
  if (!dateStr) return 'Sem data'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const reviewDate = new Date(dateStr)
  reviewDate.setHours(0, 0, 0, 0)
  const diff = Math.round((reviewDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return `Atrasada ${Math.abs(diff)}d`
  if (diff === 0) return 'Hoje'
  if (diff === 1) return 'Amanhã'
  if (diff <= 7) return `Em ${diff} dias`
  return formatDateShort(localDateKey(dateStr))
}

function isOverdue(error: ErrorEntry): boolean {
  if (!error.next_review_date) return !error.reviewed
  const reviewDate = new Date(error.next_review_date)
  reviewDate.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return reviewDate < today
}

const difficultyVariant: Record<'EASY' | 'MEDIUM' | 'HARD', 'green' | 'yellow' | 'red'> = {
  EASY: 'green',
  MEDIUM: 'yellow',
  HARD: 'red',
}

const ratingVariant: Record<ReviewRating, 'green' | 'blue' | 'yellow' | 'red'> = {
  easy: 'green',
  medium: 'blue',
  hard: 'yellow',
  guess: 'red',
}

export function Review() {
  const { errors: rawErrors, attempts, loading, submitReview, deleteError } = useData()
  const [search, setSearch] = useState('')
  const [filterArea, setFilterArea] = useState<MedicalArea | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'due' | 'reviewed' | 'unseen'>('all')
  const [filterTag, setFilterTag] = useState('all')
  const [visibleCount, setVisibleCount] = useState(30)
  const [sessionQueue, setSessionQueue] = useState<ErrorEntry[] | null>(null)
  const [detail, setDetail] = useState<ErrorEntry | null>(null)

  const errors = useMemo(() => rawErrors || [], [rawErrors])

  const dueForReview = useMemo(
    () =>
      errors
        .filter((e) => isErrorDue(e))
        .sort((a, b) => (a.next_review_date || '').localeCompare(b.next_review_date || '')),
    [errors]
  )

  const overdueCount = useMemo(() => errors.filter(isOverdue).length, [errors])

  const reviewStats = useMemo(() => {
    const totalReviews = errors.reduce((sum, e) => sum + (e.review_count || 0), 0)
    const totalCorrect = errors.reduce((sum, e) => sum + (e.correct_count || 0), 0)
    const accuracy = totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : null
    const guesses = attempts.filter((a) => a.rating === 'guess').length
    const guessRate = attempts.length > 0 ? Math.round((guesses / attempts.length) * 100) : null
    return { totalReviews, totalCorrect, accuracy, guessRate }
  }, [errors, attempts])

  const tagStats = useMemo(() => {
    const counts = new Map<string, number>()
    for (const e of errors) {
      for (const tag of e.tags || []) {
        counts.set(tag, (counts.get(tag) || 0) + 1)
      }
    }
    return Array.from(counts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
  }, [errors])

  const calibration = useMemo(
    () =>
      REVIEW_RATINGS.map((rating) => {
        const list = attempts.filter((a) => a.rating === rating.value)
        const correct = list.filter((a) => a.result === 'correct').length
        return {
          ...rating,
          count: list.length,
          accuracy: list.length > 0 ? Math.round((correct / list.length) * 100) : null,
        }
      }),
    [attempts]
  )

  const forecast = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayKey = localDateKey(today)
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today)
      date.setDate(date.getDate() + i)
      const key = localDateKey(date)
      const count = errors.filter((e) => {
        if (!e.next_review_date) return i === 0 && !e.reviewed
        const dueKey = localDateKey(e.next_review_date)
        return i === 0 ? dueKey <= todayKey : dueKey === key
      }).length
      return { date, count, label: i === 0 ? 'Hoje' : formatDateShort(key).slice(0, 5) }
    })
  }, [errors])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return errors
      .filter((e) => {
        if (
          term &&
          !e.question.toLowerCase().includes(term) &&
          !e.topic.toLowerCase().includes(term) &&
          !(e.tags || []).some((tag) => tag.toLowerCase().includes(term))
        )
          return false
        if (filterArea !== 'all' && e.area !== filterArea) return false
        if (filterTag !== 'all' && !(e.tags || []).includes(filterTag)) return false
        if (filterStatus === 'due' && !isErrorDue(e)) return false
        if (filterStatus === 'reviewed' && !e.reviewed) return false
        if (filterStatus === 'unseen' && e.review_count > 0) return false
        return true
      })
      .sort((a, b) => {
        const aDue = isErrorDue(a) ? 0 : 1
        const bDue = isErrorDue(b) ? 0 : 1
        if (aDue !== bDue) return aDue - bDue
        return (a.next_review_date || '').localeCompare(b.next_review_date || '')
      })
  }, [errors, search, filterArea, filterStatus, filterTag])

  const detailAttempts = useMemo(
    () => (detail ? attempts.filter((a) => a.error_id === detail.id).slice(0, 8) : []),
    [attempts, detail]
  )

  const startSession = (list: ErrorEntry[]) => {
    if (list.length === 0) return
    setSessionQueue(list.slice(0, SESSION_LIMIT))
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-950 text-white">
        <p className="animate-pulse text-lg">Carregando revisão...</p>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Revisão"
        description="Questões erradas com alternativas, comentários e revisão espaçada"
        icon={RotateCcw}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Questões no banco" value={errors.length} icon={BookOpen} color="blue" />
        <StatCard
          title="Na fila hoje"
          value={dueForReview.length}
          subtitle={overdueCount > 0 ? `${overdueCount} atrasada${overdueCount > 1 ? 's' : ''}` : 'em dia'}
          icon={Clock}
          color={dueForReview.length > 0 ? 'amber' : 'emerald'}
        />
        <StatCard
          title="Acerto na revisão"
          value={reviewStats.accuracy !== null ? `${reviewStats.accuracy}%` : '-'}
          subtitle={`${reviewStats.totalReviews} revisões`}
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Chutei"
          value={reviewStats.guessRate !== null ? `${reviewStats.guessRate}%` : '-'}
          subtitle={`${attempts.length} respostas registradas`}
          icon={Shuffle}
          color="rose"
        />
      </div>

      <div className="mb-6 rounded-xl border border-violet-500/20 bg-violet-500/5 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-violet-200">
              <CalendarDays size={16} />
              {dueForReview.length > 0
                ? `${dueForReview.length} questão${dueForReview.length > 1 ? 'ões' : ''} para revisar hoje`
                : 'Nenhuma questão vencida'}
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              Responda a alternativa, veja o comentário e avalie como foi: fácil, médio, difícil ou chutei.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => startSession(dueForReview)}
              disabled={dueForReview.length === 0}
              className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw size={16} />
              Revisar {Math.min(dueForReview.length, SESSION_LIMIT)} de {dueForReview.length}
            </button>
            {errors.length > 0 && (
              <button
                onClick={() => startSession(errors)}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800"
              >
                Modo livre
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="mb-4 text-sm font-semibold text-zinc-200">Próximos 7 dias</h3>
          <div className="flex items-end gap-2">
            {forecast.map((day) => {
              const max = Math.max(...forecast.map((d) => d.count), 1)
              return (
                <div key={day.label} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[11px] text-zinc-500">{day.count || ''}</span>
                  <div className="flex h-20 w-full items-end">
                    <div
                      className={`w-full rounded-t ${day.count > 0 ? 'bg-violet-500/60' : 'bg-zinc-800'}`}
                      style={{ height: `${Math.max((day.count / max) * 100, 4)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-zinc-600">{day.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="mb-1 text-sm font-semibold text-zinc-200">Calibração</h3>
          <p className="mb-4 text-xs text-zinc-500">O que você sente vs. o que acerta de fato.</p>
          <div className="space-y-3">
            {calibration.map((item) => (
              <div key={item.value}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-zinc-400">{item.label}</span>
                  <span className="text-zinc-500">
                    {item.accuracy !== null ? `${item.accuracy}% de acerto` : 'sem dados'}
                    {item.count > 0 && <span className="ml-1 text-zinc-600">({item.count})</span>}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className={`h-full rounded-full ${
                      item.value === 'easy'
                        ? 'bg-emerald-500'
                        : item.value === 'medium'
                          ? 'bg-sky-500'
                          : item.value === 'hard'
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                    }`}
                    style={{ width: `${item.accuracy ?? 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por enunciado, tema ou tag..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setVisibleCount(30)
            }}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-9 pr-3 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
          />
        </div>
        <select
          value={filterArea}
          onChange={(e) => {
            setFilterArea(e.target.value as MedicalArea | 'all')
            setVisibleCount(30)
          }}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none max-sm:flex-1"
        >
          <option value="all">Todas as áreas</option>
          {MEDICAL_AREAS.map((area) => (
            <option key={area.value} value={area.value}>
              {area.label}
            </option>
          ))}
        </select>
        <select
          value={filterTag}
          onChange={(e) => {
            setFilterTag(e.target.value)
            setVisibleCount(30)
          }}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none max-sm:flex-1"
        >
          <option value="all">Todas as tags</option>
          {tagStats.slice(0, 60).map((tag) => (
            <option key={tag.tag} value={tag.tag}>
              {tag.tag} ({tag.count})
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value as 'all' | 'due' | 'reviewed' | 'unseen')
            setVisibleCount(30)
          }}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none max-sm:flex-1"
        >
          <option value="all">Todas</option>
          <option value="due">Vencidas</option>
          <option value="reviewed">Já revisadas</option>
          <option value="unseen">Nunca revisadas</option>
        </select>
      </div>

      <div className="space-y-3">
        {filtered.slice(0, visibleCount).map((error) => {
          const due = isErrorDue(error)
          const accuracy =
            error.review_count > 0
              ? Math.round((error.correct_count / error.review_count) * 100)
              : null
          return (
            <div
              key={error.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-zinc-700"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                    {error.area && <Badge variant="blue">{AREA_LABELS[error.area]}</Badge>}
                    {error.platform_difficulty && (
                      <Badge variant={difficultyVariant[error.platform_difficulty]}>
                        {PLATFORM_DIFFICULTY_LABELS[error.platform_difficulty]}
                      </Badge>
                    )}
                    {!error.alternatives?.length && <Badge variant="zinc">sem alternativas</Badge>}
                    {(error.tags || []).slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-500"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm font-medium text-zinc-200">{error.topic}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
                    {stripHtml(error.statement_html || error.question)}
                  </p>
                  {error.exam_name && (
                    <p className="mt-1 text-[11px] text-zinc-600">
                      {error.exam_name}
                      {error.question_year ? ` · ${error.question_year}` : ''}
                      {error.institution ? ` · ${error.institution}` : ''}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-xs font-medium ${due ? 'text-amber-400' : 'text-zinc-500'}`}>
                    {formatNextReview(error.next_review_date)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-zinc-600">
                    {accuracy !== null ? `${accuracy}% em ${error.review_count}x` : 'nunca revisada'}
                  </p>
                  {error.lapses > 0 && (
                    <p className="text-[11px] text-rose-500/70">{error.lapses} lapso(s)</p>
                  )}
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => startSession([error])}
                  className="flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-300 transition-colors hover:bg-violet-500/20"
                >
                  <RotateCcw size={13} /> Revisar
                </button>
                <button
                  onClick={() => setDetail(error)}
                  className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-800"
                >
                  Ver questão
                </button>
                <button
                  onClick={() => {
                    if (confirm('Excluir esta questão do banco de revisão?')) deleteError(error.id)
                  }}
                  className="ml-auto rounded p-1.5 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-rose-400"
                  title="Excluir"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-12 text-center">
            <AlertTriangle size={28} className="mx-auto mb-3 text-zinc-600" />
            <p className="text-sm text-zinc-500">
              {errors.length === 0
                ? 'Nenhuma questão no banco. Sincronize pelo MedCof para importar as questões erradas.'
                : 'Nenhuma questão encontrada com os filtros atuais.'}
            </p>
          </div>
        )}

        {filtered.length > visibleCount && (
          <button
            onClick={() => setVisibleCount((n) => n + 30)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 py-3 text-sm text-zinc-400 transition-colors hover:bg-zinc-900"
          >
            <ChevronDown size={16} /> Mostrar mais ({filtered.length - visibleCount})
          </button>
        )}
      </div>

      {sessionQueue && (
        <ReviewSession
          queue={sessionQueue}
          onExit={() => setSessionQueue(null)}
          onSubmit={submitReview}
        />
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:items-center">
          <div className="w-full max-w-3xl rounded-xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-zinc-100">{detail.topic}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {detail.area && <Badge variant="blue">{AREA_LABELS[detail.area]}</Badge>}
                  {detail.platform_difficulty && (
                    <Badge variant={difficultyVariant[detail.platform_difficulty]}>
                      {PLATFORM_DIFFICULTY_LABELS[detail.platform_difficulty]}
                    </Badge>
                  )}
                  {detail.last_result && (
                    <Badge variant={detail.last_result === 'correct' ? 'green' : 'red'}>
                      {detail.last_result === 'correct' ? 'último: acertou' : 'último: errou'}
                    </Badge>
                  )}
                  {detail.last_rating && (
                    <Badge variant={ratingVariant[detail.last_rating]}>
                      {REVIEW_RATINGS.find((r) => r.value === detail.last_rating)?.label}
                    </Badge>
                  )}
                </div>
              </div>
              <button
                onClick={() => setDetail(null)}
                className="rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
              >
                <XCircle size={18} />
              </button>
            </div>

            <QuestionContent error={detail} selectedId={detail.chosen_answer_id} revealed readonly />

            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: 'Revisões', value: detail.review_count },
                { label: 'Acertos', value: detail.correct_count },
                { label: 'Lapsos', value: detail.lapses },
                { label: 'Intervalo', value: `${detail.interval_days}d` },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-zinc-800 bg-zinc-800/40 p-3 text-center">
                  <p className="text-lg font-semibold text-zinc-200">{item.value}</p>
                  <p className="text-[11px] text-zinc-500">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 text-xs text-zinc-500">
              <p>
                Próxima revisão: <span className="text-zinc-300">{formatNextReview(detail.next_review_date)}</span>
                {' · '}Fator de facilidade: <span className="text-zinc-300">{detail.ease_factor.toFixed(2)}</span>
              </p>
              {detail.success_rate !== null && (
                <p className="mt-1">
                  Acerto global da questão no MedCof:{' '}
                  <span className="text-zinc-300">{Math.round(detail.success_rate * 100)}%</span>
                </p>
              )}
            </div>

            {detailAttempts.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Histórico de revisões
                </p>
                <div className="space-y-1.5">
                  {detailAttempts.map((attempt) => (
                    <div
                      key={attempt.id}
                      className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-800/30 px-3 py-2 text-xs"
                    >
                      <span className="flex items-center gap-2">
                        {attempt.result === 'correct' ? (
                          <CheckCircle2 size={13} className="text-emerald-400" />
                        ) : (
                          <XCircle size={13} className="text-rose-400" />
                        )}
                        <span className="text-zinc-400">
                          {REVIEW_RATINGS.find((r) => r.value === attempt.rating)?.label}
                        </span>
                      </span>
                      <span className="text-zinc-600">
                        {formatDateShort(localDateKey(attempt.answered_at))} · volta em {attempt.interval_after}d
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
