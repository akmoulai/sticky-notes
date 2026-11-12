import { memo } from 'react';
import type { Note as NoteData, NoteId, Rect } from '../../model/types';
import type { BoardGeometry, TrashState } from '../types';
import { NoteEditor } from './NoteEditor';
import { useNote } from './useNote';

export interface NoteProps {
  readonly note: NoteData;
  readonly selected: boolean;
  readonly editing: boolean;
  readonly geometry: BoardGeometry;
  readonly onPress: (id: NoteId) => void;
  readonly onGeometryCommit: (id: NoteId, rect: Rect) => void; // Only if it changed.
  readonly onTrash: (id: NoteId) => void;
  // Moves only: `armed` on the first frame, `hot` or `armed` as the pointer crosses the trash edge, `idle` at the end.
  readonly onTrashStateChange: (state: TrashState) => void;
  readonly onEditStart: (id: NoteId) => void;
  readonly onEditEnd: (id: NoteId, text: string) => void; // Blur, Escape or `editing` off.
}

export const Note = memo(function Note(props: NoteProps) {
  const { note, selected, editing, onEditEnd } = props;
  const { rect, overTrash, onBodyPointerDown, onGripPointerDown, onDoubleClick } = useNote(props);

  return (
    <article
      className="note"
      data-color={note.color}
      data-selected={selected}
      data-over-trash={overTrash}
      style={{
        transform: `translate(${String(rect.x)}px, ${String(rect.y)}px)`,
        width: rect.width,
        height: rect.height,
        zIndex: note.z,
      }}
      onPointerDown={onBodyPointerDown}
      onDoubleClick={onDoubleClick}
    >
      {editing ? (
        <NoteEditor
          text={note.text}
          onDone={(text) => {
            onEditEnd(note.id, text);
          }}
        />
      ) : (
        <div className="note-text">{note.text}</div>
      )}
      <div className="note-grip" data-testid="resize-grip" onPointerDown={onGripPointerDown} />
    </article>
  );
});
