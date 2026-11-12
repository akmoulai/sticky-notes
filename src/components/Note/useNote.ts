import { useRef, useState } from 'react';
import { type PointerDragHandlers, usePointerDrag } from '../../hooks/usePointerDrag';
import { applyGesture, containsPoint, type Gesture, rectsEqual } from '../../model/geometry';
import type { Point, Rect } from '../../model/types';
import type { NoteProps } from './Note';

type NoteGesture = Extract<Gesture, { kind: 'move' | 'resize' }>;

// The rectangle in flight is local state: a gesture re-renders only this note.
export function useNote({
  note,
  geometry,
  onPress,
  onGeometryCommit,
  onTrash,
  onTrashStateChange,
  onEditStart,
}: NoteProps) {
  const { id } = note;
  // Whether the latest press moved or resized the note.
  // A press soon after a click counts as a double-click's second click; dragging with it must not also start editing.
  const changedByLastPress = useRef(false);
  const [draft, setDraft] = useState<Rect | null>(null);
  const [overTrash, setOverTrash] = useState(false);

  function beginDrag(kind: NoteGesture['kind'], press: Point): PointerDragHandlers {
    const { x, y, width, height } = note;
    const gesture: NoteGesture = {
      kind,
      start: geometry.toBoardPoint(press),
      initial: { x, y, width, height },
    };
    // Moves only: the trash, measured on the first frame, and whether the pointer is over it.
    let trash: { readonly rect: Rect; over: boolean } | null = null;
    changedByLastPress.current = false;

    const rectAt = (point: Point) => applyGesture(gesture, geometry.toBoardPoint(point));

    function trackTrash(point: Point): void {
      if (trash === null) {
        trash = { rect: geometry.getTrashRect(), over: false };
        onTrashStateChange('armed');
      }
      const over = containsPoint(trash.rect, point);
      if (over === trash.over) {
        return;
      }
      trash.over = over;
      setOverTrash(over);
      onTrashStateChange(over ? 'hot' : 'armed');
    }

    function reset(): void {
      setDraft(null);
      setOverTrash(false);
      if (trash !== null) {
        onTrashStateChange('idle');
      }
    }

    return {
      onMove(point) {
        setDraft(rectAt(point));
        if (kind === 'move') {
          trackTrash(point);
        }
      },
      onEnd(point) {
        reset();
        if (trash !== null && containsPoint(trash.rect, point)) {
          onTrash(id);
          return;
        }
        const rect = rectAt(point);
        if (rectsEqual(rect, gesture.initial)) {
          return;
        }
        changedByLastPress.current = true;
        onGeometryCommit(id, rect);
      },
      onCancel: reset, // Also runs if the note unmounts mid-gesture: the trash must not stay hot.
    };
  }

  const { onPointerDown: onBodyPointerDown } = usePointerDrag((point, event) => {
    onPress(id);
    // Presses on the editor belong to it (caret, selection).
    // A press on the padding still moves the note; the editor's blur ends the edit.
    if (event.target instanceof HTMLTextAreaElement) {
      return null;
    }
    return beginDrag('move', point);
  });

  const { onPointerDown: onGripPointerDown } = usePointerDrag((point, event) => {
    event.stopPropagation(); // The grip is inside the body: keep the body from starting a move too.
    onPress(id);
    return beginDrag('resize', point);
  });

  return {
    rect: draft ?? note,
    overTrash,
    onBodyPointerDown,
    onGripPointerDown,
    onDoubleClick() {
      if (!changedByLastPress.current) {
        onEditStart(id);
      }
    },
  };
}
