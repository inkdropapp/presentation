import { resolveFileProtocolUri } from '@inkdropapp/protocol-utils'
import type { ButtonProps } from '@inkdropapp/types'
import { Marp } from '@marp-team/marp-core'
import { browser } from '@marp-team/marp-core/browser'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { type CodeBlockTarget, CodePortals, takeCodeBlocks } from './code-portals'
import { getEnv } from './env'
import { alertsPlugin } from './marp-alerts'
import { toPresentationMarkdown } from './marp-markdown'
import { taskListsPlugin } from './marp-task-lists'
import { useShadowCss } from './shadow-css'

import inkdropThemeCss from './marp-theme/inkdrop.css?text'

/**
 * Shows one slide at a time, letterboxed to the stage, and fits mermaid
 * diagrams to the slide. Injected after Marp's CSS with Marpit's own
 * `div.marpit > svg` selector form, so it wins over any Marp rule by both order
 * and specificity.
 *
 * Fitting: a slide with a top-level mermaid block becomes a flex column (Marp's
 * themes already set `flex-flow: column`) and the diagram takes the remaining
 * height, never below 240px (scrollable slides scroll instead). The diagram
 * internals mirror the `fill` variant of @inkdropapp/mermaid's CSS: the SVG
 * drops its natural max-width and scales to fit both axes via its viewBox.
 */
const SLIDE = 'div.marpit > svg > foreignObject > section'
const DIAGRAM = '.presentation-code-component .mermaid-diagram'
const STAGE_CSS = `
:host { display: block; width: 100%; height: 100%; }
.mde-preview, div.marpit { width: 100%; height: 100%; }
div.marpit > svg[data-marpit-svg] { display: none; width: 100%; height: 100%; }
div.marpit > svg[data-marpit-svg][data-active] { display: block; }

${SLIDE}:has(> .presentation-code-component .mermaid-diagram) { display: flex; }
${SLIDE} > .presentation-code-component:has(.mermaid-diagram) {
  flex: 1 1 0; min-height: 240px; display: flex; flex-direction: column;
}
${DIAGRAM} { flex: 1 1 0; min-height: 0; display: flex; flex-direction: column; }
${DIAGRAM} > .mermaid-diagram-content { flex: 1 1 0; min-height: 0; }
${DIAGRAM} > .mermaid-diagram-content > div { width: 100%; height: 100%; }
${DIAGRAM} > .mermaid-diagram-content svg { max-width: none !important; width: 100%; height: 100%; }
`

let marp: Marp | undefined

function getMarp(): Marp {
  if (!marp) {
    marp = new Marp({ script: false }).use(taskListsPlugin).use(alertsPlugin)
    // Fenced code is left plain here and highlighted by Inkdrop's own
    // highlighter afterwards (see code-portals.tsx).
    marp.highlighter = () => ''
    marp.themeSet.default = marp.themeSet.add(inkdropThemeCss)
  }
  return marp
}

/** `inkdrop://file:<id>` attachment URIs → the app's `inkdrop-file://<id>` protocol. */
const resolveAttachmentUris = (markdown: string): string =>
  markdown.replace(/inkdrop:\/\/file:[\w-]+/g, resolveFileProtocolUri)

export interface MarpSlidesProps {
  markdown: string
}

/**
 * Renders a note as Marp slides inside a shadow root (so Marp's theme CSS and
 * Inkdrop's UI CSS can't affect each other) and shows one slide at a time with
 * keyboard / button navigation. Lazy-loaded by presentation-viewer.tsx.
 */
export default function MarpSlides({ markdown }: MarpSlidesProps) {
  const [Button] = useState(() => getEnv().components.getComponentClass<ButtonProps>('Button')!)
  const hostRef = useRef<HTMLDivElement>(null)
  const appCss = useShadowCss()
  const { html, css } = useMemo(
    () => getMarp().render(resolveAttachmentUris(toPresentationMarkdown(markdown))),
    [markdown]
  )
  const [slides, setSlides] = useState<SVGElement[]>([])
  const [codeBlocks, setCodeBlocks] = useState<CodeBlockTarget[]>([])
  const [index, setIndex] = useState(0)

  // Inject once per render result. Never re-set innerHTML while code portals
  // are mounted into the previous DOM — this component is remounted per open.
  useLayoutEffect(() => {
    const host = hostRef.current
    if (!host) return
    const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' })
    root.innerHTML =
      `<style data-app></style><style>${css}</style><style>${STAGE_CSS}</style>` +
      `<div class="mde-preview">${html}</div>`
    const marpBrowser = browser(root)
    setSlides(Array.from(root.querySelectorAll<SVGElement>('div.marpit > svg[data-marpit-svg]')))
    setCodeBlocks(takeCodeBlocks(root))
    return () => marpBrowser.cleanup()
  }, [html, css])

  useLayoutEffect(() => {
    const style = hostRef.current?.shadowRoot?.querySelector('style[data-app]')
    if (style) style.textContent = appCss
  }, [appCss, html])

  const count = slides.length
  const current = Math.min(index, Math.max(count - 1, 0))

  useLayoutEffect(() => {
    slides.forEach((svg, i) => svg.toggleAttribute('data-active', i === current))
  }, [slides, current])

  useEffect(() => {
    const go = (to: number) => setIndex(Math.max(0, Math.min(to, count - 1)))
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
          go(current + 1)
          break
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          go(current - 1)
          break
        case ' ':
          go(e.shiftKey ? current - 1 : current + 1)
          break
        case 'Home':
          go(0)
          break
        case 'End':
          go(count - 1)
          break
        default:
          return
      }
      e.preventDefault()
      e.stopPropagation()
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [current, count])

  return (
    <div className="presentation-slides">
      <div ref={hostRef} className="presentation-slides-host" />
      <CodePortals blocks={codeBlocks} />
      {/* Rendered only when there's a slide to go to (a disabled Semantic UI
          button forces its own opacity, so it can't be hidden by CSS alone). */}
      {current > 0 && (
        <Button
          className="presentation-nav prev"
          icon="arrow-left"
          tooltip="Previous"
          onClick={() => setIndex(current - 1)}
        />
      )}
      {current < count - 1 && (
        <Button
          className="presentation-nav next"
          icon="arrow-right"
          tooltip="Next"
          onClick={() => setIndex(current + 1)}
        />
      )}
      {count > 0 && (
        <>
          <div className="presentation-counter">
            {current + 1} / {count}
          </div>
          <div className="presentation-progress">
            <div
              className="presentation-progress-bar"
              style={{ width: `${count > 1 ? (current / (count - 1)) * 100 : 0}%` }}
            />
          </div>
        </>
      )}
    </div>
  )
}
