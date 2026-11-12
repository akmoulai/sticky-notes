import { isNote, type Note, type NoteId } from '../model/types';
import type { NotePatch, NotesApi } from './notesApi';

export const STORAGE_KEY = 'sticky-notes/v1';

export interface MockNotesApiOptions {
  readonly storage: Storage;
  readonly delayMs: number; // Simulated network latency applied to every call.
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// Anything unusable reads as empty; invalid entries are dropped.
function readNotes(storage: Storage): Note[] {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  return Array.isArray(parsed) ? parsed.filter(isNote) : [];
}

function writeNotes(storage: Storage, notes: readonly Note[]): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

// Behaves like a slow remote service: every call waits `delayMs`, then reads, modifies and writes the whole list.
export function createMockNotesApi({ storage, delayMs }: MockNotesApiOptions): NotesApi {
  async function mutate(change: (notes: readonly Note[]) => readonly Note[]): Promise<void> {
    await wait(delayMs);
    writeNotes(storage, change(readNotes(storage)));
  }

  return {
    async list() {
      await wait(delayMs);
      return readNotes(storage);
    },
    create: (note: Note) => mutate((notes) => [...notes, note]),
    update: (id: NoteId, patch: NotePatch) =>
      mutate((notes) => notes.map((n) => (n.id === id ? { ...n, ...patch } : n))),
    remove: (id: NoteId) => mutate((notes) => notes.filter((n) => n.id !== id)),
  };
}
