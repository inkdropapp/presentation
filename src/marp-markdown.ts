const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/
const FENCE = /^\s*(`{3,}|~{3,})/
const ATX_HEADING = /^(#{1,6})[ \t]/

/** Whether the note opts into Marp with `marp: true` in its YAML front matter. */
export function isMarpDeck(markdown: string): boolean {
  const yaml = FRONT_MATTER.exec(markdown)?.[1]
  return !!yaml && /^marp:[ \t]*true[ \t]*$/m.test(yaml)
}

/**
 * The heading level to split a regular note into slides at: the shallowest
 * level that occurs at least twice (so a lone `# Title` doesn't make the whole
 * note one slide). Headings inside fenced code are ignored. Returns 0 when the
 * note has no repeated heading level.
 */
function sectionHeadingLevel(markdown: string): number {
  const counts = [0, 0, 0, 0, 0, 0, 0]
  let fence: string | null = null
  for (const line of markdown.split('\n')) {
    const marker = FENCE.exec(line)?.[1]
    if (marker) {
      if (!fence) fence = marker[0]
      else if (marker[0] === fence) fence = null
      continue
    }
    if (fence) continue
    const hashes = ATX_HEADING.exec(line)?.[1]
    if (hashes) counts[hashes.length]++
  }
  const level = counts.findIndex((count, level) => level > 0 && count >= 2)
  return Math.max(level, 0)
}

/**
 * Prepares a note for Marp. A note with `marp: true` is a deck and is passed
 * through as written. Any other note is a regular note presented in "auto"
 * mode: its own front matter is dropped, slides break before each section
 * heading (Marp's `headingDivider`), and every slide scrolls when its content
 * is taller than the slide (the `scroll` class of the inkdrop theme).
 */
export function toPresentationMarkdown(markdown: string): string {
  if (isMarpDeck(markdown)) return markdown

  const body = markdown.replace(FRONT_MATTER, '')
  const level = sectionHeadingLevel(body)
  const directives = [level > 0 && `headingDivider: ${level}`, 'class: scroll'].filter(Boolean)
  return `---\n${directives.join('\n')}\n---\n\n${body}`
}
