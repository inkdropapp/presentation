import { getEnv } from './env'

export interface PresentationNote {
  _id: string
  title: string
  body: string
}

/** The slice of Inkdrop's (untyped) store state that the target lookup reads. */
interface TargetNoteState {
  noteListBar?: { actionTargetNoteIds?: string[] }
  editingNote?: PresentationNote | null
}

/**
 * Resolves the note a "Show presentation" context-menu click targets. Mirrors
 * the built-in export-as-html plugin: the editor-header "more" menu passes the
 * editing note's ID as command detail; the note-list context menu stores the
 * right-clicked note in `noteListBar.actionTargetNoteIds`. The open note is read
 * from the store so unsaved edits are included.
 */
export async function getTargetNote(detailNoteId?: string): Promise<PresentationNote | null> {
  const env = getEnv()
  const { noteListBar, editingNote } = env.store.getState() as TargetNoteState
  const noteId = detailNoteId ?? noteListBar?.actionTargetNoteIds?.[0] ?? editingNote?._id

  if (!noteId) return null
  if (noteId === editingNote?._id) return editingNote
  return env.localDB.notes.get(noteId)
}
