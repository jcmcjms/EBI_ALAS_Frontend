import DOMPurify from 'dompurify'

const ALLOWED_TAGS = ['p', 'strong', 'em', 'ul', 'ol', 'li', 'br']

export const RICH_TEXT_MAX_CHARS = 2000

const TAG_PATTERN = /<[^>]*>/g
const HTML_LOOKALIKE = /<[a-z][a-z0-9]*\b[^>]*>/i
const BLOCK_CLOSE = /<\/(p|li|ul|ol)>/gi
const ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}


export function sanitizeRichText(html: string): string {
  if (typeof window === 'undefined') {
    return escapeHtml(richTextToPlainText(html))
  }
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: [],
    ALLOW_DATA_ATTR: false,
  })
}


export function richTextToPlainText(html: string): string {
  return html
    .replace(BLOCK_CLOSE, '\n')
    .replace(TAG_PATTERN, '')
    .replace(
      /(&amp;|&lt;|&gt;|&quot;|&#39;|&nbsp;)/g,
      (entity) => ENTITY_MAP[entity],
    )
    .replace(/\u00a0/g, ' ')
    .trim()
}

export function isRichTextEmpty(html: string): boolean {
  return richTextToPlainText(html).length === 0
}


export function toRichText(value: string): string {
  if (!value) return ''
  if (HTML_LOOKALIKE.test(value)) return sanitizeRichText(value)
  return sanitizeRichText(
    value
      .split(/\r?\n/)
      .map((line) => `<p>${escapeHtml(line)}</p>`)
      .join(''),
  )
}
