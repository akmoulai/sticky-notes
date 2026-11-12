import type { NotesApi } from '../../api/notesApi';
import { Dock } from '../Dock/Dock';
import { DrawLayer } from '../DrawLayer/DrawLayer';
import { Note } from '../Note/Note';
import { SaveStatus } from '../SaveStatus/SaveStatus';
import { useBoard } from './useBoard';

export function Board({ api }: { readonly api: NotesApi }) {
  const board = useBoard(api);
  const { notes, size, selection } = board;

  if (board.loading) {
    return (
      <main className="board">
        <p className="board-message">Loading…</p>
      </main>
    );
  }

  return (
    <>
      <main ref={board.boardRef} className="board">
        <div className="surface" style={{ width: size.width, height: size.height }}>
          <DrawLayer
            geometry={board.geometry}
            onPress={board.clearSelection}
            onDraw={board.createNote}
            onDoubleClick={board.createDefaultNote}
          />
          {notes.size === 0 && (
            <p className="board-message board-hint">Drag to draw a note · double-click for a quick one</p>
          )}
          {/* Map order, so DOM order never changes: stacking is z-index only. */}
          {Array.from(notes.values(), (note) => (
            <Note
              key={note.id}
              note={note}
              selected={note.id === selection?.id}
              editing={note.id === selection?.id && selection.editing}
              geometry={board.geometry}
              onPress={board.pressNote}
              onGeometryCommit={board.commitGeometry}
              onTrash={board.trashNote}
              onTrashStateChange={board.setTrashState}
              onEditStart={board.startEdit}
              onEditEnd={board.endEdit}
            />
          ))}
        </div>
      </main>
      <Dock
        color={board.color}
        onColorChange={board.changeColor}
        trashState={board.trashState}
        trashRef={board.trashRef}
      />
      <SaveStatus status={board.writeStatus} />
    </>
  );
}
