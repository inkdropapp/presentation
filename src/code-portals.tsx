import type { CodeComponentProps } from '@inkdropapp/types'
import React, { Suspense, useState } from 'react'
import { createPortal } from 'react-dom'

import { getEnv } from './env'

export interface CodeBlockTarget {
  el: HTMLElement
  lang: string
  code: string
  /** A code-block component a plugin registered for `lang` (e.g. mermaid, math). */
  Component?: React.ComponentType<CodeComponentProps>
}

type CodeHighlighter = React.ComponentType<{ lang: string; children: string }>

/**
 * Takes over the plain `<pre><code class="language-xxx">` blocks Marp emitted
 * (its highlighter is disabled) and returns each block's language and source.
 *
 * - When a plugin registered a component for the language in
 *   `markdownRenderer.remarkCodeComponents`, the whole `pre` is swapped for an
 *   empty `div` to render that component into, as the preview does.
 * - Otherwise the `code` is cleared for Inkdrop's CodeMirror-based highlighter,
 *   and the `pre` gets the preview's `codeblock` class so the app's syntax.css
 *   selectors (`.mde-preview .codeblock .tok-*`) match.
 *
 * Call it after Marp's browser script: where customized built-ins aren't
 * supported, that script swaps each `<pre is="marp-pre">` for an autonomous
 * `<marp-pre>` by rewriting its outerHTML, which would detach earlier targets.
 */
export function takeCodeBlocks(root: ParentNode): CodeBlockTarget[] {
  const { remarkCodeComponents } = getEnv().markdownRenderer
  const codes = root.querySelectorAll<HTMLElement>('pre > code, marp-pre > code')
  return Array.from(codes).flatMap(el => {
    const lang = /(?:^|\s)language-(\S+)/.exec(el.className)?.[1]
    const pre = el.parentElement
    if (!lang || !pre) return []
    const code = el.textContent ?? ''

    const Component = remarkCodeComponents[lang] as CodeBlockTarget['Component']
    if (Component) {
      const container = document.createElement('div')
      container.className = `presentation-code-component language-${lang}`
      pre.replaceWith(container)
      // markdown-it keeps the fence's trailing newline; mdast (what the
      // preview passes to these components) doesn't.
      return [{ el: container, lang, code: code.replace(/\n$/, ''), Component }]
    }

    el.textContent = ''
    pre.classList.add('codeblock')
    return [{ el, lang, code }]
  })
}

/**
 * Renders each block via portals: the plugin's code-block component when one
 * is registered for the language, otherwise the app's code highlighter
 * (`markdownRenderer.remarkReactComponents.codeHighlighter`). Portals keep them
 * inside Inkdrop's React tree, so Redux (`useSelector`) works, and they get the
 * markdown renderer context that components such as mermaid's read.
 */
export const CodePortals: React.FC<{ blocks: CodeBlockTarget[] }> = ({ blocks }) => {
  const [{ markdownRenderer, Highlighter }] = useState(() => {
    const { markdownRenderer } = getEnv()
    return {
      markdownRenderer,
      Highlighter: markdownRenderer.remarkReactComponents.codeHighlighter as
        | CodeHighlighter
        | undefined
    }
  })
  const [context] = useState(() => ({ renderer: markdownRenderer, printMode: false }))
  const { Context } = markdownRenderer

  return (
    <Context.Provider value={context}>
      {blocks.map(({ el, lang, code, Component }, i) =>
        createPortal(
          Component ? (
            <Suspense fallback={null}>
              <Component lang={lang} fenced className={`language-${lang}`}>
                {[code]}
              </Component>
            </Suspense>
          ) : Highlighter ? (
            <Highlighter lang={lang}>{code}</Highlighter>
          ) : (
            code
          ),
          el,
          String(i)
        )
      )}
    </Context.Provider>
  )
}
