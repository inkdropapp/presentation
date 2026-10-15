import type { Environment, IInkdropPlugin } from '@inkdropapp/types'

import { EditorHeaderPresentationButton } from './editor-header-button'
import { setEnv } from './env'
import { PresentationViewer } from './presentation-viewer'

class InkdropPlugin implements IInkdropPlugin {
  activate(env: Environment) {
    setEnv(env)
    env.components.registerClass(PresentationViewer, 'PresentationViewer')
    env.layouts.addComponentToLayout('modal', 'PresentationViewer')
    env.components.registerClass(EditorHeaderPresentationButton, 'EditorHeaderPresentationButton')
    env.layouts.insertComponentToLayoutBefore(
      'editor-header',
      'EditorHeaderMore',
      'EditorHeaderPresentationButton'
    )
  }

  deactivate(env: Environment) {
    env.layouts.removeComponentFromLayout('editor-header', 'EditorHeaderPresentationButton')
    env.components.deleteClass(EditorHeaderPresentationButton, 'EditorHeaderPresentationButton')
    env.layouts.removeComponentFromLayout('modal', 'PresentationViewer')
    env.components.deleteClass(PresentationViewer, 'PresentationViewer')
    setEnv(undefined)
  }
}

export default new InkdropPlugin()
