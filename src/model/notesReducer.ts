import { rectsEqual } from './geometry';
import type { Note, NoteColor, NoteId, Rect } from './types';

export type NotesState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly notes: ReadonlyMap<NoteId, Note> };

export type NotesAction =
  | { readonly type: 'loaded'; readonly notes: readonly Note[] }
  | {
      readonly type: 'created';
      readonly id: NoteId;
      readonly rect: Rect;
      readonly color: NoteColor;
    }
  | {
      readonly type: 'geometryChanged';
      readonly id: NoteId;
      readonly rect: Rect;
    }
  | { readonly type: 'textChanged'; readonly id: NoteId; readonly text: string }
  | {
      readonly type: 'colorChanged';
      readonly id: NoteId;
      readonly color: NoteColor;
    }
  | { readonly type: 'raised'; readonly id: NoteId }
  | { readonly type: 'deleted'; readonly id: NoteId };

export const initialNotesState: NotesState = { status: 'loading' };

// Highest z among the other notes; 0 when there are none.
function highestZ(notes: ReadonlyMap<NoteId, Note>, except?: NoteId): number {
  let highest = 0;
  for (const note of notes.values()) {
    if (note.id !== except && note.z > highest) {
      highest = note.z;
    }
  }
  return highest;
}

function withNote(notes: ReadonlyMap<NoteId, Note>, note: Note): NotesState {
  return { status: 'ready', notes: new Map(notes).set(note.id, note) };
}

// Returns the same state object when an action changes nothing, so callers can detect changes by reference equality.
export function notesReducer(state: NotesState, action: NotesAction): NotesState {
  if (state.status === 'loading') {
    if (action.type !== 'loaded') {
      return state;
    }
    return {
      status: 'ready',
      notes: new Map(action.notes.map((note) => [note.id, note])),
    };
  }

  const { notes } = state;
  switch (action.type) {
    case 'loaded':
      return state;
    case 'created': {
      if (notes.has(action.id)) {
        return state;
      }
      return withNote(notes, {
        id: action.id,
        ...action.rect,
        text: '',
        color: action.color,
        z: highestZ(notes) + 1,
      });
    }
    case 'geometryChanged': {
      const note = notes.get(action.id);
      if (note === undefined || rectsEqual(note, action.rect)) {
        return state;
      }
      const { x, y, width, height } = action.rect;
      return withNote(notes, { ...note, x, y, width, height });
    }
    case 'textChanged': {
      const note = notes.get(action.id);
      if (note === undefined || note.text === action.text) {
        return state;
      }
      return withNote(notes, { ...note, text: action.text });
    }
    case 'colorChanged': {
      const note = notes.get(action.id);
      if (note === undefined || note.color === action.color) {
        return state;
      }
      return withNote(notes, { ...note, color: action.color });
    }
    case 'raised': {
      const note = notes.get(action.id);
      if (note === undefined) {
        return state;
      }
      const othersHighest = highestZ(notes, action.id);
      if (note.z > othersHighest) {
        return state;
      }
      return withNote(notes, { ...note, z: othersHighest + 1 });
    }
    case 'deleted': {
      if (!notes.has(action.id)) {
        return state;
      }
      const remaining = new Map(notes);
      remaining.delete(action.id);
      return { status: 'ready', notes: remaining };
    }
  }
}
