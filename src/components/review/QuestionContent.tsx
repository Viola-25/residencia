import { BookOpen, CheckCircle2, Lightbulb, XCircle } from 'lucide-react'
import type { ErrorEntry } from '../../types'
import { RichText } from './RichText'

interface QuestionContentProps {
  error: ErrorEntry
  selectedId?: string | null
  revealed?: boolean
  onSelect?: (id: string) => void
  readonly?: boolean
}

export function QuestionContent({
  error,
  selectedId = null,
  revealed = false,
  onSelect,
  readonly = false,
}: QuestionContentProps) {
  const alternatives = error.alternatives || []
  const statement = error.statement_html || error.question
  const legacyNotes = (error.history_notes || []).filter(
    (note) => !note.includes('<') && !note.startsWith('Reincid')
  )

  return (
    <div className="space-y-4">
      {statement && <RichText value={statement} className="text-sm text-zinc-300" />}

      {alternatives.length > 0 ? (
        <div className="space-y-2">
          {alternatives.map((alt, i) => {
            const letter = alt.letter || String.fromCharCode(65 + i)
            const isSelected = selectedId === alt.id
            const showCorrect = revealed && alt.is_correct
            const showWrong = revealed && isSelected && !alt.is_correct
            const showComment = revealed && (showCorrect || showWrong) && alt.comment

            return (
              <div key={alt.id}>
                <button
                  type="button"
                  disabled={readonly || revealed}
                  onClick={() => onSelect?.(alt.id)}
                  className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                    showCorrect
                      ? 'border-emerald-500/40 bg-emerald-500/10'
                      : showWrong
                        ? 'border-rose-500/40 bg-rose-500/10'
                        : isSelected
                          ? 'border-violet-500/50 bg-violet-500/10'
                          : 'border-zinc-700/60 bg-zinc-800/30 enabled:hover:border-zinc-500 enabled:hover:bg-zinc-800/60'
                  } ${readonly ? 'cursor-default' : revealed ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                      showCorrect
                        ? 'border-emerald-500/50 text-emerald-300'
                        : showWrong
                          ? 'border-rose-500/50 text-rose-300'
                          : 'border-zinc-600 text-zinc-400'
                    }`}
                  >
                    {letter}
                  </span>
                  <RichText
                    as="span"
                    value={alt.text}
                    className="flex-1 text-sm text-zinc-300 [&_p]:mb-0"
                  />
                  {showCorrect && <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-400" />}
                  {showWrong && <XCircle size={16} className="mt-0.5 shrink-0 text-rose-400" />}
                </button>
                {showComment && (
                  <div
                    className={`ml-9 mt-1.5 rounded-lg border p-3 ${
                      showCorrect
                        ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-100/80'
                        : 'border-rose-500/20 bg-rose-500/5 text-rose-100/80'
                    }`}
                  >
                    <RichText value={alt.comment} className="text-xs [&_p]:mb-1" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        revealed &&
        (error.sugestao_revisao || legacyNotes.length > 0) && (
          <div className="space-y-2 rounded-lg border border-zinc-700/50 bg-zinc-800/40 p-4">
            {error.sugestao_revisao && (
              <p className="text-sm font-medium text-violet-300">{error.sugestao_revisao}</p>
            )}
            {legacyNotes.slice(-3).map((note, i) => (
              <p key={i} className="text-xs text-zinc-400">
                • {note}
              </p>
            ))}
          </div>
        )
      )}

      {revealed && error.take_home_message && (
        <section className="rounded-xl border border-violet-500/25 bg-violet-500/[0.06] p-4">
          <div className="mb-2 flex items-center gap-2">
            <Lightbulb size={14} className="shrink-0 text-violet-400" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-400">
                Take home message
              </p>
              <p className="text-[10px] text-violet-300/60">Resumo do aprendizado</p>
            </div>
          </div>
          <RichText value={error.take_home_message} className="text-sm text-violet-50/90" />
        </section>
      )}

      {revealed && error.overall_comment && (
        <section className="rounded-xl border border-zinc-700/60 bg-zinc-800/40 p-4">
          <div className="mb-2 flex items-center gap-2">
            <BookOpen size={14} className="shrink-0 text-sky-400" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Comentário do professor
              </p>
              <p className="text-[10px] text-zinc-500">Discussão do caso</p>
            </div>
          </div>
          <RichText value={error.overall_comment} className="text-sm text-zinc-300" />
        </section>
      )}
    </div>
  )
}
