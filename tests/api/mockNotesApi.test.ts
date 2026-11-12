import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockNotesApi, STORAGE_KEY } from '../../src/api/mockNotesApi';
import { type Note, toNoteId } from '../../src/model/types';

const DELAY_MS = 300;

const note: Note = {
  id: toNoteId('a'),
  text: 'hello',
  color: 'yellow',
  x: 10,
  y: 20,
  width: 200,
  height: 160,
  z: 1,
};

function makeApi(storage: Storage = localStorage) {
  return createMockNotesApi({ storage, delayMs: DELAY_MS });
}

// Resolves a call by advancing the fake clock past the simulated latency.
async function settle<T>(promise: Promise<T>): Promise<T> {
  await vi.advanceTimersByTimeAsync(DELAY_MS);
  return promise;
}

describe('createMockNotesApi', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('create stays pending and writes nothing until delayMs elapses', async () => {
    const api = makeApi();
    let resolved = false;
    const pending = api.create(note).then(() => {
      resolved = true;
    });

    await vi.advanceTimersByTimeAsync(DELAY_MS - 1);
    expect(resolved).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    await vi.advanceTimersByTimeAsync(1);
    await pending;
    expect(resolved).toBe(true);
    expect(await settle(api.list())).toEqual([note]);
  });

  it('update merges the patch and leaves other fields alone', async () => {
    const api = makeApi();
    await settle(api.create(note));
    await settle(api.update(note.id, { x: 5, text: 'hi' }));
    expect(await settle(api.list())).toEqual([{ ...note, x: 5, text: 'hi' }]);
  });

  it('remove deletes the note', async () => {
    const api = makeApi();
    await settle(api.create(note));
    await settle(api.remove(note.id));
    expect(await settle(api.list())).toEqual([]);
  });

  it('update and remove of an unknown id resolve without changing storage', async () => {
    const api = makeApi();
    await settle(api.create(note));
    const before = localStorage.getItem(STORAGE_KEY);

    await settle(api.update(toNoteId('missing'), { x: 1 }));
    await settle(api.remove(toNoteId('missing')));

    expect(localStorage.getItem(STORAGE_KEY)).toBe(before);
  });

  describe('reading tolerates anything in storage', () => {
    it('treats unparseable JSON as empty', async () => {
      localStorage.setItem(STORAGE_KEY, 'not json');
      expect(await settle(makeApi().list())).toEqual([]);
    });

    it('treats a non-array as empty', async () => {
      localStorage.setItem(STORAGE_KEY, '{"a":1}');
      expect(await settle(makeApi().list())).toEqual([]);
    });

    it('drops entries that are not notes', async () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([note, { id: 1 }, null]));
      expect(await settle(makeApi().list())).toEqual([note]);
    });
  });
});
