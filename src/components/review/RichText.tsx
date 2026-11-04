import { useMemo } from 'react'
import { normalizeRichText } from '../../lib/html'

export const richTextClass =
  'min-w-0 break-words leading-relaxed ' +
  '[&_p]:mb-2 [&_p:last-child]:mb-0 ' +
  '[&_strong]:font-semibold [&_strong]:text-zinc-100 ' +
  '[&_em]:italic [&_em]:text-zinc-200 ' +
  '[&_a]:break-words [&_a]:text-violet-300 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-violet-200 ' +
  '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_li]:pl-0.5 ' +
  '[&_h1]:mb-2 [&_h1]:text-base [&_h1]:font-semibold [&_h1]:text-zinc-100 ' +
  '[&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-zinc-100 ' +
  '[&_h3]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-zinc-100 ' +
  '[&_h4]:mb-2 [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-zinc-100 ' +
  '[&_h5]:mb-2 [&_h5]:text-sm [&_h5]:font-semibold [&_h5]:text-zinc-100 ' +
  '[&_h6]:mb-2 [&_h6]:text-sm [&_h6]:font-semibold [&_h6]:text-zinc-100 ' +
  '[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-zinc-600 [&_blockquote]:pl-3 [&_blockquote]:text-zinc-400 ' +
  '[&_code]:rounded [&_code]:bg-zinc-800 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_code]:text-zinc-200 ' +
  '[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-zinc-950 [&_pre]:p-3 ' +
  '[&_.table-wrap]:my-2 [&_.table-wrap]:overflow-x-auto ' +
  '[&_table]:w-full [&_table]:border-collapse [&_table]:text-xs ' +
  '[&_caption]:mb-1 [&_caption]:text-xs [&_caption]:text-zinc-500 ' +
  '[&_th]:border [&_th]:border-zinc-700 [&_th]:bg-zinc-800/60 [&_th]:p-1.5 [&_th]:text-left [&_th]:align-top [&_th]:font-semibold [&_th]:text-zinc-200 ' +
  '[&_td]:border [&_td]:border-zinc-700 [&_td]:p-1.5 [&_td]:align-top ' +
  '[&_img]:my-2 [&_img]:max-w-full [&_img]:rounded-lg [&_img]:border [&_img]:border-zinc-700/60 ' +
  '[&_.ref-line]:mt-3 [&_.ref-line]:border-t [&_.ref-line]:border-zinc-700/60 [&_.ref-line]:pt-2 [&_.ref-line]:text-[11px] [&_.ref-line]:italic [&_.ref-line]:text-zinc-500'

interface RichTextProps {
  value?: string | null
  className?: string
  as?: 'div' | 'span'
}

export function RichText({ value, className = '', as: Tag = 'div' }: RichTextProps) {
  const html = useMemo(() => normalizeRichText(value), [value])

  if (!html) return null

  return (
    <Tag
      className={className ? `${richTextClass} ${className}` : richTextClass}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
