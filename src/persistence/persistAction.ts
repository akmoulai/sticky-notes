import type { NotesApi } from '../api/notesApi';
import type { NotesAction, NotesState } from '../model/notesReducer';

// Null when there is nothing to persist.
// Values the reducer computes (a new or raised note's `z`) are read from `next`, so the backend matches the UI.
export function persistAction(api: NotesApi, action: NotesAction, next: NotesState): (() => Promise<void>) | null {
  if (next.status !== 'ready') {
    return null;
  }

  switch (action.type) {
    case 'loaded':
      return null;
    case 'deleted':
      return () => api.remove(action.id);
    case 'created': {
      const note = next.notes.get(action.id);
      return note === undefined ? null : () => api.create(note);
    }
    case 'geometryChanged': {
      const note = next.notes.get(action.id);
      if (note === undefined) {
        return null;
      }
      const { x, y, width, height } = note; // Only the geometry fields: `action.rect` may be a wider object (a Note).
      return () => api.update(action.id, { x, y, width, height });
    }
    case 'textChanged': {
      if (!next.notes.has(action.id)) {
        return null;
      }
      return () => api.update(action.id, { text: action.text });
    }
    case 'colorChanged': {
      if (!next.notes.has(action.id)) {
        return null;
      }
      return () => api.update(action.id, { color: action.color });
    }
    case 'raised': {
      const note = next.notes.get(action.id);
      return note === undefined ? null : () => api.update(action.id, { z: note.z });
    }
  }
}
