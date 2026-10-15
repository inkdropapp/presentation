import React, { useState } from 'react'
import { createPortal } from 'react-dom'

import { getEnv } from './env'

export interface CodeBlockTarget {
  el: HTMLElement
  lang: string
  code: string
}

type CodeHighlighter = React.ComponentType<{ lang: string; children: string }>

/**
 * Takes over the plain `<pre><code class="language-xxx">` blocks Marp emitted
 * (its highlighter is disabled) so Inkdrop's own CodeMirror-based highlighter
 * can tokenize them. Clears each block and returns its language and source.
 * The `pre` gets the preview's `codeblock` class so the app's syntax.css
 * selectors (`.mde-preview .codeblock .tok-*`) match.
 *
 * Call it after Marp's browser script: where customized built-ins aren't
 * supported, that script swaps each `<pre is="marp-pre">` for an autonomous
 * `<marp-pre>` by rewriting its outerHTML, which would detach earlier targets.
 */
export function takeCodeBlocks(root: ParentNode): CodeBlockTarget[] {
  const codes = root.querySelectorAll<HTMLElement>('pre > code, marp-pre > code')
  return Array.from(codes).flatMap(el => {
    const lang = /(?:^|\s)language-(\S+)/.exec(el.className)?.[1]
    if (!lang) return []
    const code = el.textContent ?? ''
    el.textContent = ''
    el.parentElement?.classList.add('codeblock')
    return [{ el, lang, code }]
  })
}

/**
 * Renders the app's code highlighter (registered as
 * `markdownRenderer.remarkReactComponents.codeHighlighter`) into each block via
 * portals. Portals keep the highlighter inside Inkdrop's React tree, so its
 * Redux `useSelector` for plugin-added languages works.
 */
export const CodePortals: React.FC<{ blocks: CodeBlockTarget[] }> = ({ blocks }) => {
  const [Highlighter] = useState<CodeHighlighter | undefined>(
    () => getEnv().markdownRenderer.remarkReactComponents.codeHighlighter
  )

  return (
    <>
      {blocks.map(({ el, lang, code }, i) =>
        createPortal(
          Highlighter ? <Highlighter lang={lang}>{code}</Highlighter> : code,
          el,
          String(i)
        )
      )}
    </>
  )
}
