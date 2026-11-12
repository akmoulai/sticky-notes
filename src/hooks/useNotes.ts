import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NotesApi } from '../api/notesApi';
import { initialNotesState, type NotesAction, type NotesState, notesReducer } from '../model/notesReducer';
import { createNoteId, type NoteColor, type NoteId, type Rect } from '../model/types';
import { persistAction } from '../persistence/persistAction';
import { createWriteQueue, type WriteStatus } from '../persistence/writeQueue';

export interface NotesActions {
  create(rect: Rect, color: NoteColor): NoteId;
  setGeometry(id: NoteId, rect: Rect): void;
  setText(id: NoteId, text: string): void;
  setColor(id: NoteId, color: NoteColor): void;
  raise(id: NoteId): void;
  remove(id: NoteId): void;
}

// `useState` plus a ref rather than `useReducer`: a reducer must stay pure,
// and the write needs the next state synchronously (a raised note's new `z`).
export function useNotes(api: NotesApi): {
  readonly state: NotesState;
  readonly actions: NotesActions;
  readonly writeStatus: WriteStatus;
} {
  const [state, setState] = useState<NotesState>(initialNotesState);
  const [writeStatus, setWriteStatus] = useState<WriteStatus>('idle');
  const stateRef = useRef(state);
  const [queue] = useState(() => createWriteQueue(setWriteStatus));

  const dispatch = useCallback(
    (action: NotesAction): void => {
      const current = stateRef.current;
      const next = notesReducer(current, action);
      if (next === current) {
        return;
      }
      stateRef.current = next;
      setState(next);
      const write = persistAction(api, action, next);
      if (write !== null) {
        queue.enqueue(write);
      }
    },
    [api, queue],
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const notes = await api.list();
      if (!cancelled) {
        dispatch({ type: 'loaded', notes });
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [api, dispatch]);

  const actions = useMemo<NotesActions>(() => {
    return {
      create(rect, color) {
        const id = createNoteId();
        dispatch({ type: 'created', id, rect, color });
        return id;
      },
      setGeometry: (id, rect) => {
        dispatch({ type: 'geometryChanged', id, rect });
      },
      setText: (id, text) => {
        dispatch({ type: 'textChanged', id, text });
      },
      setColor: (id, color) => {
        dispatch({ type: 'colorChanged', id, color });
      },
      raise: (id) => {
        dispatch({ type: 'raised', id });
      },
      remove: (id) => {
        dispatch({ type: 'deleted', id });
      },
    };
  }, [dispatch]);

  return { state, actions, writeStatus };
}
