import type { StyleElement } from '@inkdropapp/types'
import { logger } from 'inkdrop'
import { useEffect, useState } from 'react'

import { getEnv } from './env'

const normalizePath = (path: string): string => path.replace(/\\/g, '/')

/**
 * The app loads `@inkdropapp/css/syntax.css` at runtime through its
 * StyleManager (ThemeManager#reloadBaseStylesheets), tagging the `<style>` with
 * the file path. It holds the `.mde-preview .codeblock .tok-*` rules that map
 * the code highlighter's token classes to the theme's `--syntax-*` variables.
 */
const isSyntaxStyleElement = (el: StyleElement): boolean =>
  !!el.sourcePath && normalizePath(el.sourcePath).endsWith('/@inkdropapp/css/syntax.css')

/**
 * Root directories of the active plugins other than this one. Themes are left
 * out: they only define variables, which already inherit into the shadow root.
 */
function pluginDirs(): string[] {
  return getEnv()
    .packages.getActivePackages()
    .filter(pkg => !pkg.isTheme() && pkg.name !== 'presentation')
    .map(pkg => normalizePath(pkg.path).replace(/\/?$/, '/'))
}

/**
 * The CSS the presentation's shadow root needs, which page styles can't reach:
 * the app's syntax.css (code highlighting), followed by every plugin's
 * stylesheets, so code-block components that plugins register (e.g. mermaid,
 * math) render as they do in the preview.
 */
function readShadowCss(): { css: string; hasSyntaxCss: boolean } {
  const elements = getEnv().styles.getStyleElements()
  const dirs = pluginDirs()
  const syntax = elements.find(isSyntaxStyleElement)
  const plugins = elements.filter(el => {
    const path = el.sourcePath && normalizePath(el.sourcePath)
    return !!path && dirs.some(dir => path.startsWith(dir))
  })
  const css = [syntax, ...plugins].map(el => el?.textContent ?? '').join('\n')
  return { css, hasSyntaxCss: !!syntax }
}

/**
 * Returns the CSS to copy into the presentation's shadow root, kept current as
 * the app adds, updates or removes stylesheets (e.g. a plugin is activated).
 */
export function useShadowCss(): string {
  const [css, setCss] = useState(() => {
    const { css, hasSyntaxCss } = readShadowCss()
    if (!hasSyntaxCss) {
      logger.warn('[presentation] syntax.css not found; code blocks render without colors')
    }
    return css
  })

  useEffect(() => {
    const { styles } = getEnv()
    const refresh = () => setCss(readShadowCss().css)
    const subs = [
      styles.onDidAddStyleElement(refresh),
      styles.onDidUpdateStyleElement(refresh),
      styles.onDidRemoveStyleElement(refresh)
    ]
    return () => subs.forEach(sub => sub.dispose())
  }, [])

  return css
}
