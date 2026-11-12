import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { type PointerDragHandlers, type PointerDragStart, usePointerDrag } from '../../src/hooks/usePointerDrag';
import { installDragEnvironment, nextFrame, POINTER_ID } from '../support/drag';

function makeHandlers() {
  return {
    onMove: vi.fn(),
    onEnd: vi.fn(),
    onCancel: vi.fn(),
  } satisfies PointerDragHandlers;
}

function Target({ onStart }: { onStart: PointerDragStart }) {
  const { onPointerDown } = usePointerDrag(onStart);
  return <div data-testid="t" onPointerDown={onPointerDown} />;
}

const { setPointerCapture, releasePointerCapture } = installDragEnvironment();

function setup({ declines = false } = {}) {
  const handlers = makeHandlers();
  const onStart = vi.fn<PointerDragStart>(() => (declines ? null : handlers));
  const view = render(<Target onStart={onStart} />);
  return { handlers, onStart, view, target: screen.getByTestId('t') };
}

function press(target: Element, x = 10, y = 20, init: PointerEventInit = {}) {
  fireEvent.pointerDown(target, {
    clientX: x,
    clientY: y,
    button: 0,
    pointerId: POINTER_ID,
    ...init,
  });
}

function move(target: Element, x: number, y: number, pointerId = POINTER_ID) {
  fireEvent.pointerMove(target, { clientX: x, clientY: y, pointerId });
}

describe('usePointerDrag', () => {
  it('starts with the client point and captures the pointer, without moving', () => {
    const { handlers, onStart, target } = setup();
    press(target, 10, 20);
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledWith({ x: 10, y: 20 }, expect.objectContaining({ pointerId: POINTER_ID }));
    expect(setPointerCapture).toHaveBeenCalledWith(POINTER_ID);
    nextFrame();
    expect(handlers.onMove).not.toHaveBeenCalled();
  });

  it('coalesces moves into one onMove per frame with the latest point', () => {
    const { handlers, target } = setup();
    press(target);
    move(target, 30, 40);
    move(target, 31, 41);
    move(target, 32, 42);
    expect(handlers.onMove).not.toHaveBeenCalled();
    nextFrame();
    expect(handlers.onMove).toHaveBeenCalledTimes(1);
    expect(handlers.onMove).toHaveBeenCalledWith({ x: 32, y: 42 });
  });

  it('ignores moves under 4px from the press, and then ends at the press point', () => {
    const { handlers, target } = setup();
    press(target, 10, 20);
    move(target, 12, 23);
    nextFrame();
    expect(handlers.onMove).not.toHaveBeenCalled();

    fireEvent.pointerUp(target, {
      clientX: 12,
      clientY: 23,
      pointerId: POINTER_ID,
    });
    expect(handlers.onEnd).toHaveBeenCalledExactlyOnceWith({ x: 10, y: 20 });
  });

  it('engages 5px from the press, then follows the pointer anywhere', () => {
    const { handlers, target } = setup();
    press(target, 10, 20);
    // 5px away, though neither axis alone has moved 4px.
    move(target, 13, 24);
    nextFrame();
    expect(handlers.onMove).toHaveBeenCalledExactlyOnceWith({ x: 13, y: 24 });

    move(target, 11, 21);
    nextFrame();
    expect(handlers.onMove).toHaveBeenLastCalledWith({ x: 11, y: 21 });
    fireEvent.pointerUp(target, {
      clientX: 11,
      clientY: 21,
      pointerId: POINTER_ID,
    });
    expect(handlers.onEnd).toHaveBeenCalledExactlyOnceWith({ x: 11, y: 21 });
  });

  it('ends with the release point and releases capture', () => {
    const { handlers, target } = setup();
    press(target);
    move(target, 30, 40);
    nextFrame();
    fireEvent.pointerUp(target, {
      clientX: 50,
      clientY: 60,
      pointerId: POINTER_ID,
    });
    expect(handlers.onEnd).toHaveBeenCalledTimes(1);
    expect(handlers.onEnd).toHaveBeenCalledWith({ x: 50, y: 60 });
    expect(handlers.onCancel).not.toHaveBeenCalled();
    expect(releasePointerCapture).toHaveBeenCalledWith(POINTER_ID);
  });

  it('cancels a pending frame on release so onMove never fires', () => {
    const { handlers, target } = setup();
    press(target);
    move(target, 30, 40);
    fireEvent.pointerUp(target, {
      clientX: 50,
      clientY: 60,
      pointerId: POINTER_ID,
    });
    nextFrame();
    expect(handlers.onMove).not.toHaveBeenCalled();
    expect(handlers.onEnd).toHaveBeenCalledTimes(1);
  });

  it('re-emits the last point on scroll once engaged, so board coordinates stay correct', () => {
    const { handlers, target } = setup();
    press(target);
    move(target, 30, 40);
    nextFrame();
    fireEvent.scroll(window);
    nextFrame();
    expect(handlers.onMove).toHaveBeenCalledTimes(2);
    expect(handlers.onMove).toHaveBeenLastCalledWith({ x: 30, y: 40 });
  });

  it('engages on scroll during a still press, because the content moved under the pointer', () => {
    const { handlers, target } = setup();
    press(target, 10, 20);
    fireEvent.scroll(window);
    nextFrame();
    expect(handlers.onMove).toHaveBeenCalledTimes(1);
    expect(handlers.onMove).toHaveBeenLastCalledWith({ x: 10, y: 20 });
  });

  it('engages on scroll at the last pointer position, even under the drag threshold', () => {
    const { handlers, target } = setup();
    press(target, 10, 20);
    move(target, 12, 22);
    nextFrame();
    expect(handlers.onMove).not.toHaveBeenCalled();
    fireEvent.scroll(window);
    nextFrame();
    expect(handlers.onMove).toHaveBeenCalledTimes(1);
    expect(handlers.onMove).toHaveBeenLastCalledWith({ x: 12, y: 22 });
    fireEvent.pointerUp(target, {
      clientX: 12,
      clientY: 22,
      pointerId: POINTER_ID,
    });
    expect(handlers.onEnd).toHaveBeenCalledWith({ x: 12, y: 22 });
  });

  it('ignores events from other pointers', () => {
    const { handlers, target } = setup();
    press(target);
    move(target, 99, 99, POINTER_ID + 1);
    fireEvent.pointerUp(target, { pointerId: POINTER_ID + 1 });
    fireEvent.pointerCancel(target, { pointerId: POINTER_ID + 1 });
    nextFrame();
    expect(handlers.onMove).not.toHaveBeenCalled();
    expect(handlers.onEnd).not.toHaveBeenCalled();
    expect(handlers.onCancel).not.toHaveBeenCalled();
  });

  it('carries on through keys other than Escape', () => {
    const { handlers, target } = setup();
    press(target);
    fireEvent.keyDown(target, { key: 'Shift' });
    move(target, 30, 40);
    nextFrame();
    expect(handlers.onCancel).not.toHaveBeenCalled();
    expect(handlers.onMove).toHaveBeenCalledExactlyOnceWith({ x: 30, y: 40 });
  });

  it('ignores a second press while a gesture is active', () => {
    const { onStart, target } = setup();
    press(target);
    press(target, 5, 5, { pointerId: POINTER_ID + 1 });
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  type Ending = (target: Element, unmount: () => void) => void;
  const endings: [string, Ending][] = [
    [
      'Escape',
      (target) => {
        fireEvent.keyDown(target, { key: 'Escape' });
      },
    ],
    [
      'pointercancel',
      (target) => {
        fireEvent.pointerCancel(target, { pointerId: POINTER_ID });
      },
    ],
    [
      'unmount',
      (_target, unmount) => {
        unmount();
      },
    ],
  ];

  describe.each(endings)('%s mid-gesture', (_name, trigger) => {
    it('cancels exactly once and stops listening', () => {
      const { handlers, target, view } = setup();
      press(target);
      move(target, 30, 40);
      trigger(target, view.unmount);
      expect(handlers.onCancel).toHaveBeenCalledTimes(1);
      expect(releasePointerCapture).toHaveBeenCalledWith(POINTER_ID);
      move(target, 50, 60);
      fireEvent.pointerUp(target, { pointerId: POINTER_ID });
      nextFrame();
      expect(handlers.onMove).not.toHaveBeenCalled();
      expect(handlers.onEnd).not.toHaveBeenCalled();
      expect(handlers.onCancel).toHaveBeenCalledTimes(1);
    });
  });

  it('does not cancel on unmount when no gesture is active', () => {
    const { handlers, view } = setup();
    view.unmount();
    expect(handlers.onCancel).not.toHaveBeenCalled();
  });

  it('does not listen when onStart declines', () => {
    const { handlers, target } = setup({ declines: true });
    press(target);
    move(target, 30, 40);
    fireEvent.pointerUp(target, { pointerId: POINTER_ID });
    nextFrame();
    expect(setPointerCapture).not.toHaveBeenCalled();
    expect(handlers.onMove).not.toHaveBeenCalled();
    expect(handlers.onEnd).not.toHaveBeenCalled();
  });

  it('ignores non-primary buttons', () => {
    const { onStart, target } = setup();
    press(target, 10, 20, { button: 2 });
    expect(onStart).not.toHaveBeenCalled();
  });

  it('calls the latest onStart', () => {
    const first = vi.fn<PointerDragStart>(() => null);
    const second = vi.fn<PointerDragStart>(() => null);
    const { rerender } = render(<Target onStart={first} />);
    rerender(<Target onStart={second} />);
    press(screen.getByTestId('t'));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
