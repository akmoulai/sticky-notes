import { act, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, type Mock, vi } from 'vitest';
import type { Point } from '../../src/model/types';

// The pointer every gesture helper below uses.
export const POINTER_ID = 1;

type CaptureStub = Mock<(pointerId: number) => void>;

// Applies around every test in the calling file or `describe`. Pointer capture is stubbed because jsdom lacks it;
// animation frames are faked because drags deliver moves once per frame (advance them with `nextFrame`).
export function installDragEnvironment(): {
  readonly setPointerCapture: CaptureStub;
  readonly releasePointerCapture: CaptureStub;
} {
  const setPointerCapture: CaptureStub = vi.fn();
  const releasePointerCapture: CaptureStub = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['requestAnimationFrame', 'cancelAnimationFrame'],
    });
    setPointerCapture.mockReset();
    releasePointerCapture.mockReset();
    Object.defineProperties(HTMLElement.prototype, {
      setPointerCapture: { value: setPointerCapture, configurable: true },
      releasePointerCapture: {
        value: releasePointerCapture,
        configurable: true,
      },
    });
  });

  afterEach(() => {
    // Unmount while the stubs still exist: unmounting mid-gesture releases capture.
    cleanup();
    vi.useRealTimers();
    Reflect.deleteProperty(HTMLElement.prototype, 'setPointerCapture');
    Reflect.deleteProperty(HTMLElement.prototype, 'releasePointerCapture');
  });

  return { setPointerCapture, releasePointerCapture };
}

// Runs the pending animation frame, which delivers the latest pointer move.
export function nextFrame(): void {
  act(() => {
    vi.advanceTimersToNextFrame();
  });
}

export function press(target: Element, { x, y }: Point): void {
  fireEvent.pointerDown(target, {
    button: 0,
    pointerId: POINTER_ID,
    clientX: x,
    clientY: y,
  });
}

// Moves the pointer, then runs the frame that hands the move to the drag.
export function moveTo(target: Element, { x, y }: Point): void {
  fireEvent.pointerMove(target, {
    pointerId: POINTER_ID,
    clientX: x,
    clientY: y,
  });
  nextFrame();
}

export function release(target: Element, { x, y }: Point): void {
  fireEvent.pointerUp(target, {
    pointerId: POINTER_ID,
    clientX: x,
    clientY: y,
  });
}
