import { getEnv } from './env'
import type { PresentationCommands } from './presentation-viewer'

/**
 * Streamline Ultimate "presentation-board" — not part of Inkdrop's icon set.
 * Rendered like the uikit's `StreamlineIcon` (1em box, same classes); without
 * an explicit size a viewBox-only SVG collapses inside the header button.
 */
const PresentationBoardIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    className="svg-icon streamline presentation-board"
  >
    <g
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    >
      <path d="m12 17.25 0 6" />
      <path d="m12 17.25 -6 6" />
      <path d="m12 17.25 6 6" />
      <path d="M3 0.75h18s1.5 0 1.5 1.5v13.5s0 1.5 -1.5 1.5H3s-1.5 0 -1.5 -1.5V2.25S1.5 0.75 3 0.75" />
      <path d="m1.5 5.25 21 0" />
    </g>
  </svg>
)

/**
 * Editor header bar button that presents the note open in the editor.
 * Registered before `EditorHeaderMore` in the `editor-header` layout.
 */
export const EditorHeaderPresentationButton = () => {
  const env = getEnv()
  const { AppHeaderButton } = env.components.classes
  if (!AppHeaderButton) return null

  const handleClick = () => {
    // Pass the editing note explicitly: `noteListBar.actionTargetNoteIds` may
    // still hold an earlier note-list right-click target.
    const noteId: string | undefined = env.store.getState().editingNote?._id
    env.commands.dispatch<PresentationCommands, 'presentation:show'>(
      document.body,
      'presentation:show',
      { noteId }
    )
  }

  return (
    <AppHeaderButton className="icon" title="Show Presentation" onClick={handleClick}>
      <PresentationBoardIcon />
    </AppHeaderButton>
  )
}
