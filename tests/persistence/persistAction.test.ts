import { describe, expect, it, vi } from 'vitest';
import type { NotesApi } from '../../src/api/notesApi';
import { type NotesAction, type NotesState, notesReducer } from '../../src/model/notesReducer';
import { type Note, toNoteId } from '../../src/model/types';
import { persistAction } from '../../src/persistence/persistAction';

const id = toNoteId('a');
const rect = { x: 5, y: 6, width: 100, height: 90 };
const note: Note = { id, ...rect, text: 'hi', color: 'blue', z: 3 };
const ready: NotesState = { status: 'ready', notes: new Map([[id, note]]) };

function makeApi() {
  return {
    list: vi.fn(() => Promise.resolve([])),
    create: vi.fn(() => Promise.resolve()),
    update: vi.fn(() => Promise.resolve()),
    remove: vi.fn(() => Promise.resolve()),
  } satisfies NotesApi;
}

// Applies the action, then runs whatever write persistAction returns.
async function persist(action: NotesAction, state: NotesState = ready) {
  const api = makeApi();
  const next = notesReducer(state, action);
  const write = persistAction(api, action, next);
  await write?.();
  return { api, write };
}

describe('persistAction', () => {
  it('creates the full note read from next', async () => {
    const newId = toNoteId('b');
    const { api } = await persist({
      type: 'created',
      id: newId,
      rect,
      color: 'pink',
    });
    expect(api.create).toHaveBeenCalledWith({
      id: newId,
      ...rect,
      text: '',
      color: 'pink',
      z: 4,
    });
  });

  it('updates geometry with the rect', async () => {
    const newRect = { x: 1, y: 2, width: 300, height: 200 };
    const { api } = await persist({
      type: 'geometryChanged',
      id,
      rect: newRect,
    });
    expect(api.update).toHaveBeenCalledWith(id, newRect);
  });

  it('sends only the four geometry fields even if the rect carries extras', async () => {
    const wider = { ...note, x: 50, text: 'stale', z: 0 };
    const { api } = await persist({
      type: 'geometryChanged',
      id,
      rect: wider,
    });
    expect(api.update).toHaveBeenCalledWith(id, {
      x: 50,
      y: 6,
      width: 100,
      height: 90,
    });
  });

  it('updates text', async () => {
    const { api } = await persist({ type: 'textChanged', id, text: 'yo' });
    expect(api.update).toHaveBeenCalledWith(id, { text: 'yo' });
  });

  it('updates color', async () => {
    const { api } = await persist({ type: 'colorChanged', id, color: 'green' });
    expect(api.update).toHaveBeenCalledWith(id, { color: 'green' });
  });

  it('sends the z from next when raised', async () => {
    const other: Note = { ...note, id: toNoteId('c'), z: 9 };
    const state: NotesState = {
      status: 'ready',
      notes: new Map([
        [id, note],
        [other.id, other],
      ]),
    };
    const { api } = await persist({ type: 'raised', id }, state);
    expect(api.update).toHaveBeenCalledWith(id, { z: 10 });
  });

  it('removes on delete, even though the id is gone from next', async () => {
    const { api } = await persist({ type: 'deleted', id });
    expect(api.remove).toHaveBeenCalledWith(id);
  });

  it('returns null for loaded', () => {
    const action: NotesAction = { type: 'loaded', notes: [note] };
    expect(persistAction(makeApi(), action, ready)).toBeNull();
  });

  it('returns null when next is not ready', () => {
    const action: NotesAction = { type: 'textChanged', id, text: 'x' };
    expect(persistAction(makeApi(), action, { status: 'loading' })).toBeNull();
  });

  const missing = toNoteId('missing');
  const onAbsentNote: NotesAction[] = [
    { type: 'created', id: missing, rect, color: 'pink' },
    { type: 'geometryChanged', id: missing, rect },
    { type: 'textChanged', id: missing, text: 'x' },
    { type: 'colorChanged', id: missing, color: 'green' },
    { type: 'raised', id: missing },
  ];

  it.each(onAbsentNote)('returns null for $type when next lacks the note', (action) => {
    expect(persistAction(makeApi(), action, ready)).toBeNull();
  });
});
