// `*.css?text` imports are loaded as a string (see tsdown.config.js).
declare module '*.css?text' {
  const css: string
  export default css
}
