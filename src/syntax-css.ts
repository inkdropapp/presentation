import type { StyleElement } from '@inkdropapp/types'
import { logger } from 'inkdrop'
import { useEffect, useState } from 'react'

import { getEnv } from './env'

/**
 * The app loads `@inkdropapp/css/syntax.css` at runtime through its
 * StyleManager (ThemeManager#reloadBaseStylesheets), tagging the `<style>` with
 * the file path. It holds the `.mde-preview .codeblock .tok-*` rules that map
 * the code highlighter's token classes to the theme's `--syntax-*` variables.
 */
const isSyntaxStyleElement = (el: StyleElement): boolean =>
  !!el.sourcePath?.replace(/\\/g, '/').endsWith('/@inkdropapp/css/syntax.css')

function readSyntaxCss(): string | null {
  const el = getEnv().styles.getStyleElements().find(isSyntaxStyleElement)
  return el?.textContent ?? null
}

/**
 * Returns the text of the app's loaded `syntax.css`, kept current across base
 * stylesheet reloads, so it can be copied into the presentation's shadow root
 * (page styles don't cross a shadow boundary).
 */
export function useSyntaxCss(): string {
  const [css, setCss] = useState(() => {
    const text = readSyntaxCss()
    if (text === null) {
      logger.warn('[presentation] syntax.css not found; code blocks render without colors')
    }
    return text ?? ''
  })

  useEffect(() => {
    const { styles } = getEnv()
    const refresh = (el: StyleElement) => {
      if (isSyntaxStyleElement(el)) setCss(readSyntaxCss() ?? '')
    }
    const subs = [styles.onDidAddStyleElement(refresh), styles.onDidUpdateStyleElement(refresh)]
    return () => subs.forEach(sub => sub.dispose())
  }, [])

  return css
}
