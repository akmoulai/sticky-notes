import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { Point } from '../model/types';

// CSS pixels the pointer must travel before a gesture engages, so that the jitter in a click moves nothing.
const DRAG_THRESHOLD = 4;

// Points are client coordinates.
export interface PointerDragHandlers {
  // At most once per animation frame, with the latest pointer position.
  // Not called until the gesture engages: the pointer travelled `DRAG_THRESHOLD`, or the page scrolled under it.
  onMove(point: Point): void;
  onEnd(point: Point): void; // With the release point, or the press point if the gesture never engaged.
  onCancel(): void;
}

// Returns the handlers for the gesture this press starts, or null to decline.
export type PointerDragStart = (point: Point, event: React.PointerEvent<HTMLElement>) => PointerDragHandlers | null;

function pointOf(event: Pick<MouseEvent, 'clientX' | 'clientY'>): Point {
  return { x: event.clientX, y: event.clientY };
}

// A gesture's handlers are created by its press, so they can hold its state in a closure and see that render's props.
export function usePointerDrag(onStart: PointerDragStart): {
  readonly onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
} {
  const onStartRef = useRef(onStart);
  useLayoutEffect(() => {
    onStartRef.current = onStart;
  });

  const cancelActive = useRef<(() => void) | null>(null); // Cancels the gesture in progress, if any.
  useEffect(() => () => cancelActive.current?.(), []);

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || cancelActive.current) {
      return;
    }
    const start = pointOf(event);
    const handlers = onStartRef.current(start, event);
    if (handlers === null) {
      return;
    }

    const target: HTMLElement = event.currentTarget;
    const { pointerId } = event;
    const listeners = new AbortController();
    const { signal } = listeners;
    let pointer = start;
    let engaged = false;
    let frame: number | null = null;

    // Engages the gesture, and reports the pointer on the next frame.
    const scheduleMove = () => {
      engaged = true;
      frame ??= requestAnimationFrame(() => {
        frame = null;
        handlers.onMove(pointer);
      });
    };
    const finish = () => {
      if (frame !== null) {
        cancelAnimationFrame(frame);
      }
      listeners.abort();
      cancelActive.current = null;
      target.releasePointerCapture(pointerId);
    };
    const cancel = () => {
      finish();
      handlers.onCancel();
    };

    target.setPointerCapture(pointerId);
    cancelActive.current = cancel;

    target.addEventListener(
      'pointermove',
      (e) => {
        if (e.pointerId !== pointerId) {
          return;
        }
        pointer = pointOf(e);
        const travelled = Math.hypot(pointer.x - start.x, pointer.y - start.y);
        if (engaged || travelled >= DRAG_THRESHOLD) {
          scheduleMove();
        }
      },
      { signal },
    );
    target.addEventListener(
      'pointerup',
      (e) => {
        if (e.pointerId !== pointerId) {
          return;
        }
        finish();
        // A press that never engaged was a click: it ends where it started.
        handlers.onEnd(engaged ? pointOf(e) : start);
      },
      { signal },
    );
    target.addEventListener(
      'pointercancel',
      (e) => {
        if (e.pointerId === pointerId) {
          cancel();
        }
      },
      { signal },
    );
    window.addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'Escape') {
          cancel();
        }
      },
      { signal },
    );
    // A scroll moves the content under a stationary pointer, so it engages the gesture and re-emits the position.
    // Capture phase: scroll does not bubble, and the board scrolls, not the window.
    window.addEventListener('scroll', scheduleMove, {
      signal,
      capture: true,
    });
  }, []);

  return { onPointerDown };
}
