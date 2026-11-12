import type { Rect, Size } from '../../model/types';

// Room kept beyond the furthest note, so there is always space to draw or drag further out.
const SURFACE_MARGIN = 240;

// The surface is never smaller than the viewport; CSS enforces that.
export function surfaceSize(notes: Iterable<Rect>): Size {
  let right = 0;
  let bottom = 0;
  for (const note of notes) {
    right = Math.max(right, note.x + note.width);
    bottom = Math.max(bottom, note.y + note.height);
  }
  return { width: right + SURFACE_MARGIN, height: bottom + SURFACE_MARGIN };
}
