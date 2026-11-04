import DOMPurify from 'dompurify'
import { marked } from 'marked'

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'del',
  'ul',
  'ol',
  'li',
  'blockquote',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'code',
  'pre',
  'a',
  'img',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'caption',
  'span',
  'div',
  'sub',
  'sup',
]

const ALLOWED_ATTR = ['href', 'target', 'rel', 'src', 'alt', 'title', 'colspan', 'rowspan', 'class']

const ENTITY_MAP: Record<string, string> = {
  '&lt;': '<',
  '&gt;': '>',
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
}

function decodeBasicEntities(text: string): string {
  return text.replace(/&(?:lt|gt|amp|quot|#39|apos|nbsp);/g, (entity) => ENTITY_MAP[entity] ?? entity)
}

function looksDoubleEscaped(text: string): boolean {
  return /&lt;\/?[a-z][\s\S]*?&gt;/i.test(text)
}

function decodeEscapedMarkup(text: string): string {
  let decoded = text
  // Alguns campos vêm com o HTML inteiro escapado (&lt;p&gt;...). Desescapa
  // até duas camadas, mas para assim que o conteúdo já parecer HTML normal.
  for (let i = 0; i < 2 && looksDoubleEscaped(decoded); i++) {
    decoded = decodeBasicEntities(decoded)
  }
  return decoded
}

function stripVideoArtifacts(text: string): string {
  return (
    text
      // tags de embed/vídeo cruas
      .replace(/<\/?(?:video|iframe|audio|source|track|embed)\b[^>]*>/gi, '')
      .replace(/\{\{\s*video[^}]*\}\}/gi, '')
      // [video-tag-...] / ![video-tag-...]
      .replace(/!?\[\s*video[-_ ]?tag[^\]]*\]/gi, '')
      // imagens Markdown: remove as que são thumbnails/embeds de vídeo,
      // mantém imagens de verdade renderizadas como <img>
      .replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_match, alt, src) => {
        if (/video|tag|embed|youtube|youtu\.be|vimeo/i.test(`${alt} ${src}`)) return ''
        return `<img src="${src}" alt="${alt}" />`
      })
      // restos de imagem Markdown sem URL
      .replace(/!\[[^\]]*\]/g, '')
  )
}

function markReferenceParagraphs(html: string): string {
  return html.replace(
    /<p>(\s*(?:(?:<strong>|<em>)\s*)?(?:refer[êe]ncias?\b|fontes?\b|bibliografia\b|leitura(?: complementar| recomendada)?\b|\[\d+\]))/gi,
    '<p class="ref-line">$1'
  )
}

function wrapTables(html: string): string {
  return html.replace(
    /<table\b[\s\S]*?<\/table>/gi,
    (table) => `<div class="table-wrap">${table}</div>`
  )
}

/**
 * Converte texto misto (HTML + Markdown + lixo de embed) em HTML normalizado.
 * Não sanitiza — use `normalizeRichText` para renderizar com segurança.
 */
export function buildRichTextHtml(input?: string | null): string {
  if (!input) return ''

  let text = String(input).replace(/\r\n/g, '\n').trim()
  if (!text) return ''

  text = decodeEscapedMarkup(text)
  text = stripVideoArtifacts(text)

  const html = marked.parse(text, {
    async: false,
    gfm: true,
    breaks: true,
  }) as string

  return markReferenceParagraphs(html)
}

export function normalizeRichText(input?: string | null): string {
  return wrapTables(sanitizeQuestionHtml(buildRichTextHtml(input)))
}

export function sanitizeQuestionHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_TAGS: [
      'script',
      'style',
      'iframe',
      'video',
      'audio',
      'object',
      'embed',
      'form',
      'input',
      'button',
      'textarea',
      'select',
      'option',
      'svg',
      'math',
    ],
    FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick'],
  })
}

export function stripHtml(html: string): string {
  return decodeBasicEntities(String(html))
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
