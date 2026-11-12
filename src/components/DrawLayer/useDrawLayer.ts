import { useRef, useState } from 'react';
import { usePointerDrag } from '../../hooks/usePointerDrag';
import { applyGesture, type Gesture, meetsMinSize } from '../../model/geometry';
import type { Point, Rect } from '../../model/types';
import type { DrawLayerProps } from './DrawLayer';

// The preview is local state, so drawing re-renders only this layer.
export function useDrawLayer({ geometry, onPress, onDraw, onDoubleClick }: DrawLayerProps) {
  // Whether the latest press drew a note.
  // A press soon after a click counts as a double-click's second click, so its dblclick must not add another.
  const drewNote = useRef(false);
  const [preview, setPreview] = useState<Rect | null>(null);

  const { onPointerDown } = usePointerDrag((press) => {
    onPress();
    drewNote.current = false;
    const gesture: Gesture = {
      kind: 'draw',
      start: geometry.toBoardPoint(press),
    };
    const rectAt = (point: Point) => applyGesture(gesture, geometry.toBoardPoint(point));

    return {
      onMove(point) {
        setPreview(rectAt(point));
      },
      onEnd(point) {
        setPreview(null);
        const rect = rectAt(point);
        if (!meetsMinSize(rect)) {
          return;
        }
        drewNote.current = true;
        onDraw(rect);
      },
      onCancel() {
        setPreview(null);
      },
    };
  });

  return {
    preview,
    onPointerDown,
    onDoubleClick(event: React.MouseEvent) {
      if (drewNote.current) {
        return;
      }
      onDoubleClick(geometry.toBoardPoint({ x: event.clientX, y: event.clientY }));
    },
  };
}
