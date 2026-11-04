import { useState } from 'react'
import { Brain, CheckCircle2, Sparkles, TrendingDown, Shuffle, XCircle } from 'lucide-react'
import type { ErrorEntry, ReviewRating, ReviewResult } from '../../types'
import { REVIEW_RATINGS } from '../../types'
import { QuestionContent } from './QuestionContent'

interface ReviewSessionProps {
  queue: ErrorEntry[]
  onExit: () => void
  onSubmit: (
    id: string,
    result: ReviewResult,
    rating: ReviewRating,
    chosenAnswerId: string | null
  ) => Promise<{ interval_days: number } | null>
}

const ratingStyles: Record<ReviewRating, { icon: typeof Sparkles; color: string }> = {
  easy: { icon: Sparkles, color: 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/15' },
  medium: { icon: Brain, color: 'border-sky-500/30 text-sky-400 hover:bg-sky-500/15' },
  hard: { icon: TrendingDown, color: 'border-amber-500/30 text-amber-400 hover:bg-amber-500/15' },
  guess: { icon: Shuffle, color: 'border-rose-500/30 text-rose-400 hover:bg-rose-500/15' },
}

const emptyRatingCounts = (): Record<ReviewRating, number> => ({
  easy: 0,
  medium: 0,
  hard: 0,
  guess: 0,
})

export function ReviewSession({ queue, onExit, onSubmit }: ReviewSessionProps) {
  const [index, setIndex] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [result, setResult] = useState<ReviewResult | null>(null)
  const [saving, setSaving] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [incorrectCount, setIncorrectCount] = useState(0)
  const [ratingCounts, setRatingCounts] = useState<Record<ReviewRating, number>>(emptyRatingCounts)

  const error = queue[index]
  const finished = index >= queue.length

  const resetQuestion = () => {
    setSelectedId(null)
    setRevealed(false)
    setResult(null)
    setSaving(false)
  }

  const handleSelect = (id: string) => {
    if (revealed || !error) return
    const selected = (error.alternatives || []).find((alt) => String(alt.id) === String(id))
    setSelectedId(id)
    setRevealed(true)
    setResult(selected?.is_correct ? 'correct' : 'incorrect')
  }

  const handleRate = async (rating: ReviewRating) => {
    if (!error || !result || saving) return
    setSaving(true)
    const srs = await onSubmit(error.id, result, rating, selectedId)
    if (srs) {
      if (result === 'correct') setCorrectCount((n) => n + 1)
      else setIncorrectCount((n) => n + 1)
      setRatingCounts((prev) => ({ ...prev, [rating]: prev[rating] + 1 }))
      setIndex((i) => i + 1)
      resetQuestion()
    } else {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:p-6 md:p-8">
      <div className="my-auto w-full max-w-3xl rounded-xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl sm:p-6">
        {finished ? (
          <div className="flex flex-col items-center py-6">
            <CheckCircle2 size={48} className="mb-4 text-emerald-400" />
            <p className="text-lg font-semibold text-zinc-100">Sessão concluída</p>
            <p className="mt-1 text-sm text-zinc-500">
              {queue.length} questão{queue.length > 1 ? 'ões' : ''} revisada{queue.length > 1 ? 's' : ''}
            </p>

            <div className="mt-6 grid w-full max-w-sm grid-cols-2 gap-3">
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
                <p className="text-2xl font-bold text-emerald-400">{correctCount}</p>
                <p className="text-xs text-emerald-500/80">acertos</p>
              </div>
              <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 text-center">
                <p className="text-2xl font-bold text-rose-400">{incorrectCount}</p>
                <p className="text-xs text-rose-500/80">erros</p>
              </div>
            </div>

            <div className="mt-4 flex w-full max-w-sm flex-wrap justify-center gap-2">
              {REVIEW_RATINGS.map((r) => (
                <span
                  key={r.value}
                  className="rounded-full border border-zinc-700 bg-zinc-800/50 px-3 py-1 text-xs text-zinc-400"
                >
                  {r.label}: <strong className="text-zinc-200">{ratingCounts[r.value]}</strong>
                </span>
              ))}
            </div>

            <button
              onClick={onExit}
              className="mt-6 w-full max-w-sm rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500"
            >
              Fechar
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between gap-4">
              <span className="text-xs text-zinc-500">
                {index + 1} / {queue.length}
              </span>
              <button onClick={onExit} className="text-xs text-zinc-500 hover:text-zinc-300">
                Sair
              </button>
            </div>

            <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-violet-500 transition-all"
                style={{ width: `${(index / queue.length) * 100}%` }}
              />
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
              {error.topic && (
                <span className="rounded-full bg-violet-500/10 px-2.5 py-0.5 font-medium text-violet-300">
                  {error.topic}
                </span>
              )}
              {(error.tags || []).slice(0, 3).map((tag) => (
                <span key={tag} className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-zinc-400">
                  {tag}
                </span>
              ))}
              {error.review_count > 0 && (
                <span className="ml-auto text-zinc-600">
                  {error.correct_count}/{error.review_count} acertos
                </span>
              )}
            </div>

            <QuestionContent
              error={error}
              selectedId={selectedId}
              revealed={revealed}
              onSelect={handleSelect}
            />

            <div className="mt-6">
              {!error.alternatives?.length && !revealed && (
                <button
                  onClick={() => setRevealed(true)}
                  className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500"
                >
                  Revelar resposta
                </button>
              )}

              {revealed && !result && (
                <div>
                  <p className="mb-2 text-center text-xs text-zinc-500">Você lembrou a resposta?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setResult('correct')}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-emerald-500/30 py-2 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/15"
                    >
                      <CheckCircle2 size={15} /> Acertei
                    </button>
                    <button
                      onClick={() => setResult('incorrect')}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-rose-500/30 py-2 text-sm font-medium text-rose-400 transition-colors hover:bg-rose-500/15"
                    >
                      <XCircle size={15} /> Errei
                    </button>
                  </div>
                </div>
              )}

              {result && (
                <div>
                  <div
                    className={`mb-3 rounded-lg border p-3 text-center text-sm font-medium ${
                      result === 'correct'
                        ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'
                        : 'border-rose-500/20 bg-rose-500/5 text-rose-400'
                    }`}
                  >
                    {result === 'correct' ? 'Você acertou' : 'Você errou'}
                  </div>
                  <p className="mb-2 text-center text-xs text-zinc-500">Como foi essa recuperação?</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {REVIEW_RATINGS.map((r) => {
                      const { icon: Icon, color } = ratingStyles[r.value]
                      return (
                        <button
                          key={r.value}
                          disabled={saving}
                          onClick={() => handleRate(r.value)}
                          className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors disabled:opacity-50 ${color}`}
                        >
                          <Icon size={15} />
                          {r.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
