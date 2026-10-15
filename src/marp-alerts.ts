/** Minimal markdown-it token shapes used by the plugin. */
interface Token {
  type: string
  content: string
  children: Token[] | null
  block: boolean
  attrJoin(name: string, value: string): void
}
interface StateCore {
  tokens: Token[]
  Token: new (type: string, tag: string, nesting: number) => Token
}
interface MarkdownIt {
  core: { ruler: { after(after: string, name: string, rule: (state: StateCore) => void): void } }
}

const ALERT_TYPES: Record<string, string> = {
  NOTE: 'Note',
  TIP: 'Tip',
  IMPORTANT: 'Important',
  WARNING: 'Warning',
  CAUTION: 'Caution'
}
const ALERT_MARKER = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]$/

/**
 * GitHub alerts (`> [!WARNING]` followed by quoted text). Marp core doesn't
 * know them, so the marker would show as literal text. Emits the same markup as
 * Inkdrop's preview (`blockquote.gfm-alert.gfm-alert-type-*` with a bold
 * `p.gfm-alert-title`), which the inkdrop theme styles.
 */
export function alertsPlugin(md: MarkdownIt): void {
  md.core.ruler.after('inline', 'inkdrop_alerts', state => {
    const { tokens } = state
    for (let i = 0; i + 2 < tokens.length; i++) {
      const [quote, para, inline] = [tokens[i], tokens[i + 1], tokens[i + 2]]
      if (
        quote?.type !== 'blockquote_open' ||
        para?.type !== 'paragraph_open' ||
        inline?.type !== 'inline'
      ) {
        continue
      }
      const first = inline.children?.[0]
      const type = first?.type === 'text' ? ALERT_MARKER.exec(first.content)?.[1] : undefined
      if (!first || !type) continue

      quote.attrJoin('class', `gfm-alert gfm-alert-type-${type.toLowerCase()}`)
      // The title goes in its own paragraph; the quoted text follows it.
      const title = ALERT_TYPES[type] ?? type
      const open = new state.Token('paragraph_open', 'p', 1)
      open.block = true
      open.attrJoin('class', 'gfm-alert-title')
      const titleInline = new state.Token('inline', '', 0)
      titleInline.content = title
      const titleText = new state.Token('text', '', 0)
      titleText.content = title
      titleInline.children = [titleText]
      const close = new state.Token('paragraph_close', 'p', -1)
      close.block = true
      tokens.splice(i + 1, 0, open, titleInline, close)

      // Drop the marker and the line break after it from the quoted text.
      inline.children?.splice(0, next(inline.children) ? 2 : 1)
    }
  })
}

const next = (children: Token[]): boolean =>
  children[1]?.type === 'softbreak' || children[1]?.type === 'hardbreak'
