import type { Environment, IInkdropPlugin } from '@inkdropapp/types'
import { setEnv } from './env'
import { PresentationMessageDialog } from './PresentationMessageDialog'

class InkdropPlugin implements IInkdropPlugin {
  activate(env: Environment) {
    setEnv(env)
    env.components.registerClass(PresentationMessageDialog)
    env.layouts.addComponentToLayout('modals', 'PresentationMessageDialog')
  }

  deactivate(env: Environment) {
    env.layouts.removeComponentFromLayout('modals', 'PresentationMessageDialog')
    env.components.deleteClass(PresentationMessageDialog)
    setEnv(undefined)
  }
}

export default new InkdropPlugin()
