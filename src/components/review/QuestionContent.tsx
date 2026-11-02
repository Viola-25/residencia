import { CheckCircle2, XCircle } from 'lucide-react'
import type { ErrorEntry } from '../../types'
import { sanitizeQuestionHtml } from '../../lib/html'

interface QuestionContentProps {
  error: ErrorEntry
  selectedId?: string | null
  revealed?: boolean
  onSelect?: (id: string) => void
  readonly?: boolean
}

const richTextClass =
  'text-sm leading-relaxed text-zinc-300 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_img]:my-2 [&_img]:max-w-full [&_img]:rounded-lg [&_table]:w-full [&_table]:text-xs [&_td]:border [&_td]:border-zinc-700 [&_td]:p-1.5 [&_th]:border [&_th]:border-zinc-700 [&_th]:p-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:text-zinc-100 [&_em]:text-zinc-200'

export function QuestionContent({
  error,
  selectedId = null,
  revealed = false,
  onSelect,
  readonly = false,
}: QuestionContentProps) {
  const alternatives = error.alternatives || []
  const statement = error.statement_html || error.question
  const isHtml = Boolean(error.statement_html)
  const legacyNotes = (error.history_notes || []).filter(
    (note) => !note.includes('<') && !note.startsWith('Reincid')
  )

  return (
    <div className="space-y-4">
      {isHtml ? (
        <div
          className={richTextClass}
          dangerouslySetInnerHTML={{ __html: sanitizeQuestionHtml(statement) }}
        />
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{statement}</p>
      )}

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
                  <span
                    className={`${richTextClass} min-w-0 flex-1 [&_p]:mb-0`}
                    dangerouslySetInnerHTML={{ __html: sanitizeQuestionHtml(alt.text) }}
                  />
                  {showCorrect && <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-400" />}
                  {showWrong && <XCircle size={16} className="mt-0.5 shrink-0 text-rose-400" />}
                </button>
                {showComment && (
                  <div
                    className={`ml-9 mt-1.5 rounded-lg border p-3 text-xs leading-relaxed ${
                      showCorrect
                        ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-100/80'
                        : 'border-rose-500/20 bg-rose-500/5 text-rose-100/80'
                    } ${richTextClass} [&_p]:mb-1`}
                    dangerouslySetInnerHTML={{ __html: sanitizeQuestionHtml(alt.comment || '') }}
                  />
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
        <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-4">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-violet-400">
            Take home message
          </p>
          <div
            className={`${richTextClass} text-violet-100/90`}
            dangerouslySetInnerHTML={{ __html: sanitizeQuestionHtml(error.take_home_message) }}
          />
        </div>
      )}

      {revealed && error.overall_comment && (
        <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/40 p-4">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Comentário do professor
          </p>
          <div
            className={richTextClass}
            dangerouslySetInnerHTML={{ __html: sanitizeQuestionHtml(error.overall_comment) }}
          />
        </div>
      )}
    </div>
  )
}
