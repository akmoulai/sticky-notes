import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useBoardGeometry } from '../../../src/components/Board/useBoardGeometry';

function placed<T extends HTMLElement>(element: T, rect: DOMRect, scroll = { left: 0, top: 0 }): T {
  Object.defineProperties(element, {
    getBoundingClientRect: { value: () => rect },
    scrollLeft: { value: scroll.left },
    scrollTop: { value: scroll.top },
  });
  return element;
}

describe('useBoardGeometry', () => {
  it('maps client points into the board, past its offset and scroll', () => {
    const { result } = renderHook(() => useBoardGeometry());
    result.current.boardRef.current = placed(document.createElement('main'), new DOMRect(10, 20, 800, 600), {
      left: 300,
      top: 150,
    });

    expect(result.current.geometry.toBoardPoint({ x: 110, y: 70 })).toEqual({
      x: 400,
      y: 200,
    });
  });

  it('rounds to whole pixels, so previews, size checks and notes agree', () => {
    // Fractional client coordinates come from page zoom.
    const { result } = renderHook(() => useBoardGeometry());
    result.current.boardRef.current = placed(document.createElement('main'), new DOMRect(0.4, 0, 800, 600));

    expect(result.current.geometry.toBoardPoint({ x: 80.3, y: 59.6 })).toEqual({
      x: 80,
      y: 60,
    });
  });

  it('reads the trash rectangle in client coordinates', () => {
    const { result } = renderHook(() => useBoardGeometry());
    result.current.trashRef.current = placed(document.createElement('div'), new DOMRect(460, 700, 96, 36));

    expect(result.current.geometry.getTrashRect()).toEqual({
      x: 460,
      y: 700,
      width: 96,
      height: 36,
    });
  });

  it('refuses to measure before the board and trash are mounted', () => {
    const { geometry } = renderHook(() => useBoardGeometry()).result.current;

    expect(() => geometry.toBoardPoint({ x: 0, y: 0 })).toThrow('Board is not mounted');
    expect(() => geometry.getTrashRect()).toThrow('Trash is not mounted');
  });

  it('keeps one geometry across renders', () => {
    const { result, rerender } = renderHook(() => useBoardGeometry());
    const first = result.current.geometry;
    rerender();
    expect(result.current.geometry).toBe(first);
  });
});
