import React, { useEffect, useCallback } from 'react'
import { logger, useModal } from 'inkdrop'
import type { Dialog as DialogClass } from '@inkdropapp/types'
import { getEnv } from './env'

export const PresentationMessageDialog: React.FC = () => {
  const modal = useModal()
  const Dialog = inkdrop.components.getComponentClass('Dialog') as DialogClass

  const toggle = useCallback(() => {
    modal.show()
    logger.debug('Presentation was toggled!')
  }, [modal])

  useEffect(() => {
    const sub = getEnv().commands.add(document.body, {
      'presentation:toggle': toggle
    })
    return () => sub.dispose()
  }, [toggle])

  return (
    <Dialog {...modal.state} onBackdropClick={modal.close}>
      <Dialog.Title>Presentation</Dialog.Title>
      <Dialog.Content>Presentation was toggled!</Dialog.Content>
      <Dialog.Actions>
        <button className="ui button" onClick={modal.close}>
          Close
        </button>
      </Dialog.Actions>
    </Dialog>
  )
}
