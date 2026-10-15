/** Minimal markdown-it token / state shapes used by the plugin. */
interface Token {
  type: string
  level: number
  content: string
  children: Token[] | null
  attrGet(name: string): string | null
  attrJoin(name: string, value: string): void
  attrSet(name: string, value: string): void
}
interface StateCore {
  tokens: Token[]
  Token: new (type: string, tag: string, nesting: number) => Token
}
interface MarkdownIt {
  core: { ruler: { after(after: string, name: string, rule: (state: StateCore) => void): void } }
  renderer: { rules: Record<string, (tokens: Token[], idx: number) => string> }
}

const TASK_MARKER = /^\[([ xX])\][ \t]+/

/** Index of the list open token enclosing the list item at `itemIndex`. */
function findListOpen(tokens: Token[], itemIndex: number): number {
  const level = tokens[itemIndex]!.level - 1
  for (let i = itemIndex - 1; i >= 0; i--) {
    const { type } = tokens[i]!
    if (
      tokens[i]!.level === level &&
      (type === 'bullet_list_open' || type === 'ordered_list_open')
    ) {
      return i
    }
  }
  return -1
}

/**
 * GFM task lists (`- [ ] todo` / `- [x] done`) for Marp, which doesn't parse
 * them. Emits the same markup as Inkdrop's preview (`contains-task-list`,
 * `task-list-item`, `checked`, a disabled `input.task-list-item-checkbox`), so
 * both Marp's `default` theme and the inkdrop theme style it. The checkbox is
 * its own token type, so it doesn't go through Marp's HTML allowlist.
 */
export function taskListsPlugin(md: MarkdownIt): void {
  md.core.ruler.after('inline', 'inkdrop_task_lists', state => {
    const { tokens } = state
    for (let i = 2; i < tokens.length; i++) {
      const inline = tokens[i]!
      if (
        inline.type !== 'inline' ||
        tokens[i - 1]!.type !== 'paragraph_open' ||
        tokens[i - 2]!.type !== 'list_item_open'
      ) {
        continue
      }
      const first = inline.children?.[0]
      const match = first?.type === 'text' ? TASK_MARKER.exec(first.content) : null
      if (!first || !match) continue

      const checked = match[1] !== ' '
      first.content = first.content.slice(match[0].length)
      const checkbox = new state.Token('task_list_checkbox', 'input', 0)
      if (checked) checkbox.attrSet('checked', '')
      inline.children!.unshift(checkbox)

      tokens[i - 2]!.attrJoin('class', checked ? 'task-list-item checked' : 'task-list-item')
      const listOpen = findListOpen(tokens, i - 2)
      const list = tokens[listOpen]
      if (list && !list.attrGet('class')?.split(' ').includes('contains-task-list')) {
        list.attrJoin('class', 'contains-task-list')
      }
    }
  })

  md.renderer.rules.task_list_checkbox = (tokens, idx) =>
    `<input class="task-list-item-checkbox" type="checkbox" disabled${
      tokens[idx]!.attrGet('checked') === null ? '' : ' checked'
    }>`
}
