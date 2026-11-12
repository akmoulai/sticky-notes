import { describe, expect, it } from 'vitest';
import type { NotesAction, NotesState } from '../../src/model/notesReducer';
import { initialNotesState, notesReducer } from '../../src/model/notesReducer';
import type { Note, NoteId } from '../../src/model/types';
import { toNoteId } from '../../src/model/types';

const a = toNoteId('a');
const b = toNoteId('b');
const missing = toNoteId('missing');

function note(id: NoteId, overrides: Partial<Note> = {}): Note {
  return {
    id,
    x: 10,
    y: 20,
    width: 200,
    height: 160,
    text: 'hello',
    color: 'yellow',
    z: 1,
    ...overrides,
  };
}

function readyWith(...notes: Note[]): NotesState {
  return notesReducer(initialNotesState, { type: 'loaded', notes });
}

function notesOf(state: NotesState): ReadonlyMap<NoteId, Note> {
  if (state.status !== 'ready') {
    throw new Error('expected ready state');
  }
  return state.notes;
}

describe('notesReducer', () => {
  it('starts in loading', () => {
    expect(initialNotesState).toEqual({ status: 'loading' });
  });

  it('loaded moves loading to ready, keyed by id', () => {
    const state = readyWith(note(a), note(b, { z: 2 }));
    expect(state.status).toBe('ready');
    expect(notesOf(state).get(a)).toEqual(note(a));
    expect(notesOf(state).get(b)).toEqual(note(b, { z: 2 }));
    expect(notesOf(state).size).toBe(2);
  });

  it('loaded when already ready is a no-op', () => {
    const state = readyWith(note(a));
    expect(notesReducer(state, { type: 'loaded', notes: [] })).toBe(state);
  });

  it('returns the same state for every other action while loading', () => {
    const rect = { x: 0, y: 0, width: 100, height: 100 };
    const actions: NotesAction[] = [
      { type: 'created', id: a, rect, color: 'pink' },
      { type: 'geometryChanged', id: a, rect },
      { type: 'textChanged', id: a, text: 'x' },
      { type: 'colorChanged', id: a, color: 'blue' },
      { type: 'raised', id: a },
      { type: 'deleted', id: a },
    ];
    for (const action of actions) {
      expect(notesReducer(initialNotesState, action)).toBe(initialNotesState);
    }
  });

  describe('created', () => {
    it('adds an empty note at z 1 on an empty board', () => {
      const rect = { x: 5, y: 6, width: 100, height: 90 };
      const state = notesReducer(readyWith(), {
        type: 'created',
        id: a,
        rect,
        color: 'green',
      });
      expect(notesOf(state).get(a)).toEqual({
        id: a,
        ...rect,
        text: '',
        color: 'green',
        z: 1,
      });
    });

    it('places the note one above the current highest z', () => {
      const state = notesReducer(readyWith(note(a, { z: 3 }), note(b, { z: 7 })), {
        type: 'created',
        id: toNoteId('c'),
        rect: { x: 0, y: 0, width: 80, height: 60 },
        color: 'blue',
      });
      expect(notesOf(state).get(toNoteId('c'))?.z).toBe(8);
    });

    it('is a no-op when the id already exists', () => {
      const state = readyWith(note(a));
      const next = notesReducer(state, {
        type: 'created',
        id: a,
        rect: { x: 0, y: 0, width: 80, height: 60 },
        color: 'pink',
      });
      expect(next).toBe(state);
    });
  });

  describe('geometryChanged', () => {
    it('replaces only the rect fields', () => {
      const state = readyWith(note(a, { text: 'keep', color: 'pink', z: 4 }));
      const next = notesReducer(state, {
        type: 'geometryChanged',
        id: a,
        rect: { x: 1, y: 2, width: 90, height: 70 },
      });
      expect(notesOf(next).get(a)).toEqual(
        note(a, {
          x: 1,
          y: 2,
          width: 90,
          height: 70,
          text: 'keep',
          color: 'pink',
          z: 4,
        }),
      );
    });

    it('returns the same state for an identical rect', () => {
      const state = readyWith(note(a));
      const next = notesReducer(state, {
        type: 'geometryChanged',
        id: a,
        rect: { x: 10, y: 20, width: 200, height: 160 },
      });
      expect(next).toBe(state);
    });
  });

  describe('textChanged', () => {
    it('updates the text', () => {
      const next = notesReducer(readyWith(note(a)), {
        type: 'textChanged',
        id: a,
        text: 'new',
      });
      expect(notesOf(next).get(a)).toEqual(note(a, { text: 'new' }));
    });

    it('returns the same state for unchanged text', () => {
      const state = readyWith(note(a));
      expect(notesReducer(state, { type: 'textChanged', id: a, text: 'hello' })).toBe(state);
    });
  });

  describe('colorChanged', () => {
    it('updates the colour', () => {
      const next = notesReducer(readyWith(note(a)), {
        type: 'colorChanged',
        id: a,
        color: 'blue',
      });
      expect(notesOf(next).get(a)).toEqual(note(a, { color: 'blue' }));
    });

    it('returns the same state for an unchanged colour', () => {
      const state = readyWith(note(a));
      expect(notesReducer(state, { type: 'colorChanged', id: a, color: 'yellow' })).toBe(state);
    });
  });

  describe('raised', () => {
    it('moves a buried note one above the highest z', () => {
      const state = readyWith(note(a, { z: 1 }), note(b, { z: 5 }));
      const next = notesReducer(state, { type: 'raised', id: a });
      expect(notesOf(next).get(a)?.z).toBe(6);
      expect(notesOf(next).get(b)?.z).toBe(5);
    });

    it('returns the same state for the note already on top', () => {
      const state = readyWith(note(a, { z: 1 }), note(b, { z: 5 }));
      expect(notesReducer(state, { type: 'raised', id: b })).toBe(state);
    });

    it('breaks a z tie in favour of the raised note', () => {
      const state = readyWith(note(a, { z: 2 }), note(b, { z: 2 }));
      const next = notesReducer(state, { type: 'raised', id: a });
      expect(notesOf(next).get(a)?.z).toBe(3);
    });
  });

  it('deleted removes the note', () => {
    const next = notesReducer(readyWith(note(a), note(b)), {
      type: 'deleted',
      id: a,
    });
    expect(notesOf(next).has(a)).toBe(false);
    expect(notesOf(next).has(b)).toBe(true);
  });

  it('returns the same state for every id-carrying action with an unknown id', () => {
    const state = readyWith(note(a));
    const rect = { x: 0, y: 0, width: 100, height: 100 };
    const actions: NotesAction[] = [
      { type: 'geometryChanged', id: missing, rect },
      { type: 'textChanged', id: missing, text: 'x' },
      { type: 'colorChanged', id: missing, color: 'blue' },
      { type: 'raised', id: missing },
      { type: 'deleted', id: missing },
    ];
    for (const action of actions) {
      expect(notesReducer(state, action)).toBe(state);
    }
  });

  it('does not mutate the previous state', () => {
    const state = readyWith(note(a, { z: 1 }), note(b, { z: 2 }));
    notesReducer(state, { type: 'textChanged', id: a, text: 'changed' });
    notesReducer(state, { type: 'raised', id: a });
    notesReducer(state, { type: 'deleted', id: b });
    notesReducer(state, {
      type: 'created',
      id: toNoteId('c'),
      rect: { x: 0, y: 0, width: 80, height: 60 },
      color: 'pink',
    });
    expect(notesOf(state).get(a)).toEqual(note(a, { z: 1 }));
    expect(notesOf(state).has(b)).toBe(true);
    expect(notesOf(state).size).toBe(2);
  });
});
