import type { Note, NoteId } from '../model/types';

export type NotePatch = Partial<Omit<Note, 'id'>>;

// Persistence boundary: the UI depends on this, never on a concrete backend.
export interface NotesApi {
  list(): Promise<readonly Note[]>;
  create(note: Note): Promise<void>;
  update(id: NoteId, patch: NotePatch): Promise<void>;
  remove(id: NoteId): Promise<void>;
}
