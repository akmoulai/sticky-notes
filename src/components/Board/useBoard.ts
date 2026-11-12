import { useCallback, useMemo, useState } from 'react';
import type { NotesApi } from '../../api/notesApi';
import { useNotes } from '../../hooks/useNotes';
import { centredRect } from '../../model/geometry';
import { DEFAULT_SIZE, type Note, type NoteColor, type NoteId, type Point, type Rect } from '../../model/types';
import type { TrashState } from '../types';
import { surfaceSize } from './helpers';
import { useBoardGeometry } from './useBoardGeometry';

const NO_NOTES: ReadonlyMap<NoteId, Note> = new Map();

// One value, so that the note being edited is always the selected one.
type Selection = { readonly id: NoteId; readonly editing: boolean } | null;

// The callbacks it returns keep stable identities, so a memoized note re-renders only when its own props change.
export function useBoard(api: NotesApi) {
  const { state, actions, writeStatus } = useNotes(api);
  const [selection, setSelection] = useState<Selection>(null);
  const selectedId = selection?.id ?? null;
  const [color, setColor] = useState<NoteColor>('yellow');
  const [trashState, setTrashState] = useState<TrashState>('idle');
  const { geometry, boardRef, trashRef } = useBoardGeometry();

  const notes = state.status === 'ready' ? state.notes : NO_NOTES;
  const size = useMemo(() => surfaceSize(notes.values()), [notes]);

  const createNote = useCallback(
    (rect: Rect) => {
      const id = actions.create(rect, color);
      setSelection({ id, editing: true });
    },
    [actions, color],
  );

  const createDefaultNote = useCallback(
    (centre: Point) => {
      createNote(centredRect(centre, DEFAULT_SIZE));
    },
    [createNote],
  );

  const clearSelection = useCallback(() => {
    setSelection(null);
  }, []);

  const changeColor = useCallback(
    (next: NoteColor) => {
      setColor(next);
      if (selectedId !== null) {
        actions.setColor(selectedId, next);
      }
    },
    [actions, selectedId],
  );

  const pressNote = useCallback(
    (id: NoteId) => {
      actions.raise(id);
      setSelection((current) => (current?.id === id ? current : { id, editing: false }));
    },
    [actions],
  );

  const trashNote = useCallback(
    (id: NoteId) => {
      actions.remove(id);
      setSelection(null); // The press that started the drag selected this note.
    },
    [actions],
  );

  const startEdit = useCallback((id: NoteId) => {
    setSelection({ id, editing: true });
  }, []);

  const endEdit = useCallback(
    (id: NoteId, text: string) => {
      actions.setText(id, text);
      setSelection((current) => (current?.id === id ? { id, editing: false } : current));
    },
    [actions],
  );

  return {
    loading: state.status === 'loading',
    notes,
    size,
    selection,
    color,
    trashState,
    writeStatus,
    geometry,
    boardRef,
    trashRef,
    createNote,
    createDefaultNote,
    clearSelection,
    changeColor,
    pressNote,
    commitGeometry: actions.setGeometry,
    trashNote,
    setTrashState,
    startEdit,
    endEdit,
  };
}
