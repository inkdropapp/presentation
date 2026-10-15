import { readFile } from 'node:fs/promises'

import { defineConfig } from 'tsdown'

/**
 * Loads `*.css?text` imports as a string module. The Marp theme is registered
 * with Marp as text, and tsdown's CSS guard rejects plain `.css` imports
 * without `@tsdown/css`.
 */
const cssTextPlugin = {
  name: 'css-text',
  load: {
    filter: { id: /\.css\?text$/ },
    async handler(id) {
      const css = await readFile(id.slice(0, -'?text'.length), 'utf8')
      return { code: `export default ${JSON.stringify(css)}`, moduleType: 'js' }
    }
  }
}

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'lib',
  format: ['cjs'],
  minify: true,
  sourcemap: true,
  clean: true,
  outExtensions: () => ({ js: '.js' }),
  treeshake: true,
  plugins: [cssTextPlugin],
  deps: {
    // Provided by the host app at runtime. react-dom must be the app's copy so
    // the code-block portals join Inkdrop's React tree.
    neverBundle: [
      'react',
      'react/jsx-runtime',
      'react-dom',
      'inkdrop',
      'event-kit',
      'inkdrop-model',
      'react-redux'
    ]
  },
  outputOptions: {
    codeSplitting: {
      groups: [
        {
          name: 'env',
          test: /[\\/]src[\\/]env\./,
          priority: 20
        },
        {
          // Marp core and everything it pulls in (markdown-it, MathJax, KaTeX,
          // highlight.js…), kept out of the eager entry chunk and loaded on the
          // first "Show presentation".
          name: 'marp',
          test: /node_modules|[\\/]src[\\/](marp-|code-portals|syntax-css)/,
          priority: 10
        }
      ]
    }
  }
})
