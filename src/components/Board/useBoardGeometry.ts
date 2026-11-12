import { type RefObject, useRef, useState } from 'react';
import type { BoardGeometry } from '../types';

function mounted<T>(ref: RefObject<T | null>, name: string): T {
  const element = ref.current;
  if (element === null) {
    throw new Error(`${name} is not mounted`);
  }
  return element;
}

// Measures the DOM on every call rather than caching, so it stays correct across scrolling and window resizes.
// Call it from event handlers only, while both elements are mounted.
export function useBoardGeometry(): {
  readonly geometry: BoardGeometry;
  readonly boardRef: RefObject<HTMLElement | null>;
  readonly trashRef: RefObject<HTMLDivElement | null>;
} {
  const boardRef = useRef<HTMLElement>(null);
  const trashRef = useRef<HTMLDivElement>(null);
  const [geometry] = useState<BoardGeometry>(() => ({
    toBoardPoint({ x, y }) {
      const board = mounted(boardRef, 'Board');
      const { left, top } = board.getBoundingClientRect();
      // Page zoom makes client coordinates fractional.
      return {
        x: Math.round(x - left + board.scrollLeft),
        y: Math.round(y - top + board.scrollTop),
      };
    },
    getTrashRect() {
      const trash = mounted(trashRef, 'Trash');
      const { left, top, width, height } = trash.getBoundingClientRect();
      return { x: left, y: top, width, height };
    },
  }));
  return { geometry, boardRef, trashRef };
}
