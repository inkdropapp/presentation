import type { ButtonProps, ModalProps } from '@inkdropapp/types'
import { logger } from 'inkdrop'
import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react'

import { getEnv } from './env'
import { getTargetNote, type PresentationNote } from './target-note'

export type PresentationCommands = {
  'presentation:show': { noteId?: string } | undefined
}

// Lazy-loaded so Marp core (and KaTeX / MathJax / highlight.js it pulls in)
// stays out of the eager entry bundle — this host is registered at activate()
// and must import nothing heavy.
const MarpSlides = lazy(() => import('./marp-slides'))

/**
 * Top-level singleton presentation viewer, registered into the `modal` layout
 * in index.ts so Inkdrop's `Modal` covers the whole window. Listens for the
 * `presentation:show` command dispatched by the note-list / editor-header
 * context menus and presents the target note as Marp slides.
 */
/** Live value of the `presentation.transparentBackground` setting. */
function useTransparentBackground(): boolean {
  const { config } = getEnv()
  const [value, setValue] = useState<boolean>(() =>
    config.get('presentation.transparentBackground')
  )
  useEffect(() => {
    const sub = config.observe('presentation.transparentBackground', setValue)
    return () => sub.dispose()
  }, [config])
  return value
}

export const PresentationViewer: React.FC = () => {
  const [{ Modal, Button }] = useState(() => ({
    Modal: getEnv().components.getComponentClass<ModalProps>('Modal')!,
    Button: getEnv().components.getComponentClass<ButtonProps>('Button')!
  }))
  // `openId` remounts the slides on every open, so a re-opened (and possibly
  // edited) note never reuses the previous render's DOM.
  const [presentation, setPresentation] = useState<{
    note: PresentationNote
    openId: number
  } | null>(null)
  const close = useCallback(() => setPresentation(null), [])
  const transparent = useTransparentBackground()

  useEffect(() => {
    const sub = getEnv().commands.add<PresentationCommands>(document.body, {
      'presentation:show': {
        hiddenInCommandPalette: true,
        didDispatch: async e => {
          try {
            const target = await getTargetNote(e.detail?.noteId)
            if (target) setPresentation(prev => ({ note: target, openId: (prev?.openId ?? 0) + 1 }))
            else getEnv().notifications.addWarning('No note to present')
          } catch (error) {
            logger.error('[presentation] Failed to load the note:', error)
            getEnv().notifications.addError('Failed to load the note to present', {
              detail: error instanceof Error ? error.message : String(error),
              dismissable: true
            })
          }
        }
      }
    })
    return () => sub.dispose()
  }, [])

  return (
    <Modal
      visible={!!presentation}
      autofocus
      className={transparent ? 'presentation-viewer transparent' : 'presentation-viewer'}
      onEscKeyDown={close}
    >
      <div className="presentation-stage">
        {presentation && (
          <Suspense fallback={null}>
            <MarpSlides key={presentation.openId} markdown={presentation.note.body} />
          </Suspense>
        )}
        {/* Draggable strip along the top edge holding the close button. */}
        <div className="presentation-topbar">
          <Button className="close-button" icon="close" tooltip="Close" onClick={close} />
        </div>
      </div>
    </Modal>
  )
}

PresentationViewer.displayName = 'PresentationViewer'
