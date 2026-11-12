import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Note, type NoteProps } from '../../../src/components/Note/Note';
import type { BoardGeometry } from '../../../src/components/types';
import { type Note as NoteData, toNoteId } from '../../../src/model/types';
import { installDragEnvironment, moveTo, press, release } from '../../support/drag';
import { getNoteEditor } from '../../support/queries';

const note: NoteData = {
  id: toNoteId('a'),
  x: 10,
  y: 20,
  width: 200,
  height: 160,
  text: 'hello',
  color: 'pink',
  z: 3,
};

const TRASH = { x: 400, y: 500, width: 100, height: 40 };
const IN_TRASH = { x: 450, y: 520 };

const { setPointerCapture } = installDragEnvironment();

function renderNote({ editing = false, reactStrictMode = false } = {}) {
  // Client and board coordinates coincide, so points read like note positions.
  const geometry = {
    toBoardPoint: vi.fn<BoardGeometry['toBoardPoint']>((point) => point),
    getTrashRect: vi.fn<BoardGeometry['getTrashRect']>(() => TRASH),
  } satisfies BoardGeometry;
  const callbacks = {
    onPress: vi.fn<NoteProps['onPress']>(),
    onGeometryCommit: vi.fn<NoteProps['onGeometryCommit']>(),
    onTrash: vi.fn<NoteProps['onTrash']>(),
    onTrashStateChange: vi.fn<NoteProps['onTrashStateChange']>(),
    onEditStart: vi.fn<NoteProps['onEditStart']>(),
    onEditEnd: vi.fn<NoteProps['onEditEnd']>(),
  };
  const props: NoteProps = {
    note,
    selected: false,
    editing,
    geometry,
    ...callbacks,
  };
  const view = render(<Note {...props} />, { reactStrictMode });
  return {
    ...callbacks,
    geometry,
    element: screen.getByRole('article'),
    grip: screen.getByTestId('resize-grip'),
    trashStates: () => callbacks.onTrashStateChange.mock.calls.map(([s]) => s),
    rerender: (changes: Partial<NoteProps>) => {
      view.rerender(<Note {...props} {...changes} />);
    },
    unmount: view.unmount,
  };
}

describe('Note', () => {
  it('renders its text at its position, size, stacking order and colour', () => {
    const { element, rerender } = renderNote();

    expect(screen.getByText('hello').tagName).toBe('DIV');
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(element.style.transform).toBe('translate(10px, 20px)');
    expect(element.style.width).toBe('200px');
    expect(element.style.height).toBe('160px');
    expect(element.style.zIndex).toBe('3');
    expect(element.dataset.color).toBe('pink');
    expect(element.dataset.selected).toBe('false');

    rerender({ selected: true });
    expect(element.dataset.selected).toBe('true');
  });

  it('follows the pointer while moved and commits once, on release', () => {
    const { element, onPress, onGeometryCommit, onTrash, trashStates } = renderNote();

    press(element, { x: 50, y: 50 });
    expect(onPress).toHaveBeenCalledExactlyOnceWith(note.id);
    moveTo(element, { x: 80, y: 90 });
    expect(element.style.transform).toBe('translate(40px, 60px)');
    expect(onGeometryCommit).not.toHaveBeenCalled();

    release(element, { x: 80, y: 90 });
    expect(onGeometryCommit).toHaveBeenCalledExactlyOnceWith(note.id, {
      x: 40,
      y: 60,
      width: 200,
      height: 160,
    });
    expect(onTrash).not.toHaveBeenCalled();
    expect(trashStates()).toEqual(['armed', 'idle']);
  });

  it('commits nothing and reports no trash state for a press without movement', () => {
    const { element, onPress, onGeometryCommit, trashStates } = renderNote();

    press(element, { x: 50, y: 50 });
    release(element, { x: 50, y: 50 });

    expect(onPress).toHaveBeenCalledExactlyOnceWith(note.id);
    expect(onGeometryCommit).not.toHaveBeenCalled();
    expect(trashStates()).toEqual([]);
  });

  it('treats a press that strays a pixel or two as a click, so a double-click still edits', () => {
    const { element, onGeometryCommit, onEditStart, trashStates } = renderNote();

    press(element, { x: 50, y: 50 });
    moveTo(element, { x: 51, y: 52 });
    expect(element.style.transform).toBe('translate(10px, 20px)');
    release(element, { x: 51, y: 52 });
    press(element, { x: 51, y: 52 });
    moveTo(element, { x: 52, y: 51 });
    release(element, { x: 52, y: 51 });
    fireEvent.doubleClick(element);

    expect(onGeometryCommit).not.toHaveBeenCalled();
    expect(trashStates()).toEqual([]);
    expect(onEditStart).toHaveBeenCalledExactlyOnceWith(note.id);
  });

  it('moves once the pointer has travelled 5px', () => {
    const { element, onGeometryCommit } = renderNote();

    press(element, { x: 50, y: 50 });
    moveTo(element, { x: 53, y: 54 });
    expect(element.style.transform).toBe('translate(13px, 24px)');
    release(element, { x: 53, y: 54 });

    expect(onGeometryCommit).toHaveBeenCalledExactlyOnceWith(note.id, {
      x: 13,
      y: 24,
      width: 200,
      height: 160,
    });
  });

  it('is dropped on the trash when a move is released over it', () => {
    const { element, onGeometryCommit, onTrash, trashStates } = renderNote();

    press(element, { x: 50, y: 50 });
    moveTo(element, IN_TRASH);
    expect(element.dataset.overTrash).toBe('true');
    release(element, IN_TRASH);

    expect(onTrash).toHaveBeenCalledExactlyOnceWith(note.id);
    expect(onGeometryCommit).not.toHaveBeenCalled();
    expect(trashStates()).toEqual(['armed', 'hot', 'idle']);
  });

  it('reports the trash state only when the pointer crosses the trash edge', () => {
    const { element, geometry, onGeometryCommit, onTrash, trashStates } = renderNote();

    press(element, { x: 50, y: 50 });
    moveTo(element, { x: 100, y: 100 });
    moveTo(element, { x: 110, y: 110 });
    moveTo(element, IN_TRASH);
    moveTo(element, { x: 460, y: 525 });
    expect(trashStates()).toEqual(['armed', 'hot']);

    moveTo(element, { x: 100, y: 100 });
    expect(element.dataset.overTrash).toBe('false');
    release(element, { x: 100, y: 100 });

    expect(trashStates()).toEqual(['armed', 'hot', 'armed', 'idle']);
    expect(geometry.getTrashRect).toHaveBeenCalledTimes(1);
    expect(onTrash).not.toHaveBeenCalled();
    expect(onGeometryCommit).toHaveBeenCalledExactlyOnceWith(note.id, {
      x: 60,
      y: 70,
      width: 200,
      height: 160,
    });
  });

  it('resizes from the grip, keeping its position, without starting a move', () => {
    const { element, grip, onPress, onGeometryCommit, trashStates } = renderNote();

    press(grip, { x: 205, y: 175 });
    moveTo(grip, { x: 255, y: 185 });
    expect(element.style.width).toBe('250px');
    expect(element.style.height).toBe('170px');
    release(grip, { x: 255, y: 185 });

    expect(onPress).toHaveBeenCalledExactlyOnceWith(note.id);
    expect(onGeometryCommit).toHaveBeenCalledExactlyOnceWith(note.id, {
      x: 10,
      y: 20,
      width: 250,
      height: 170,
    });
    expect(trashStates()).toEqual([]);
  });

  it('never trashes a note when a resize is released over the trash', () => {
    const { grip, onGeometryCommit, onTrash, trashStates } = renderNote();

    press(grip, { x: 205, y: 175 });
    moveTo(grip, IN_TRASH);
    release(grip, IN_TRASH);

    expect(onTrash).not.toHaveBeenCalled();
    expect(onGeometryCommit).toHaveBeenCalledExactlyOnceWith(note.id, {
      x: 10,
      y: 20,
      width: 445,
      height: 505,
    });
    expect(trashStates()).toEqual([]);
  });

  it('returns to its original position and commits nothing on Escape', () => {
    const { element, onGeometryCommit, onTrash, trashStates } = renderNote();

    press(element, { x: 50, y: 50 });
    moveTo(element, IN_TRASH);
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(element.style.transform).toBe('translate(10px, 20px)');
    expect(element.dataset.overTrash).toBe('false');
    release(element, IN_TRASH);
    expect(onGeometryCommit).not.toHaveBeenCalled();
    expect(onTrash).not.toHaveBeenCalled();
    expect(trashStates()).toEqual(['armed', 'hot', 'idle']);
  });

  it('resets the trash state if it unmounts mid-move', () => {
    const { element, unmount, onGeometryCommit, onTrash, trashStates } = renderNote();

    press(element, { x: 50, y: 50 });
    moveTo(element, IN_TRASH);
    unmount();

    expect(trashStates()).toEqual(['armed', 'hot', 'idle']);
    expect(onGeometryCommit).not.toHaveBeenCalled();
    expect(onTrash).not.toHaveBeenCalled();
  });

  it('starts editing on double-click', () => {
    const { element, onEditStart } = renderNote();

    fireEvent.doubleClick(element);

    expect(onEditStart).toHaveBeenCalledExactlyOnceWith(note.id);
  });

  it('does not start editing when the double-click ends a drag', () => {
    const { element, onEditStart } = renderNote();

    // A press soon after a click counts as a double-click's second click.
    press(element, { x: 50, y: 50 });
    moveTo(element, { x: 80, y: 90 });
    release(element, { x: 80, y: 90 });
    fireEvent.doubleClick(element);

    expect(onEditStart).not.toHaveBeenCalled();
  });

  describe('while editing', () => {
    it('focuses a textarea holding the text and ends with the typed text on blur', () => {
      const { onEditEnd } = renderNote({ editing: true });
      const textarea = getNoteEditor();

      expect(textarea.value).toBe('hello');
      expect(document.activeElement).toBe(textarea);

      fireEvent.change(textarea, { target: { value: 'new text' } });
      act(() => {
        textarea.blur();
      });

      expect(onEditEnd).toHaveBeenCalledExactlyOnceWith(note.id, 'new text');
    });

    it("survives React's development-only effect replay", () => {
      const { onEditEnd } = renderNote({
        editing: true,
        reactStrictMode: true,
      });

      expect(document.activeElement).toBe(getNoteEditor());
      expect(onEditEnd).not.toHaveBeenCalled();
    });

    it('ends on Escape', () => {
      const { onEditEnd } = renderNote({ editing: true });
      const textarea = getNoteEditor();

      fireEvent.change(textarea, { target: { value: 'new text' } });
      fireEvent.keyDown(textarea, { key: 'Escape' });

      expect(document.activeElement).not.toBe(textarea);
      expect(onEditEnd).toHaveBeenCalledExactlyOnceWith(note.id, 'new text');
    });

    it('keeps editing through keys other than Escape', () => {
      const { onEditEnd } = renderNote({ editing: true });
      const textarea = getNoteEditor();

      fireEvent.keyDown(textarea, { key: 'Enter' });

      expect(document.activeElement).toBe(textarea);
      expect(onEditEnd).not.toHaveBeenCalled();
    });

    it('keeps the typed text when editing is ended from outside', () => {
      // Pressing another note or the board ends editing before any blur.
      const { onEditEnd, rerender } = renderNote({ editing: true });

      fireEvent.change(getNoteEditor(), { target: { value: 'new text' } });
      rerender({ editing: false });

      expect(screen.queryByRole('textbox')).toBeNull();
      expect(onEditEnd).toHaveBeenCalledExactlyOnceWith(note.id, 'new text');
    });

    it('lets the textarea take presses instead of starting a move', () => {
      const { element, onPress, onGeometryCommit, trashStates } = renderNote({
        editing: true,
      });

      press(getNoteEditor(), { x: 50, y: 50 });
      moveTo(getNoteEditor(), { x: 80, y: 90 });
      release(getNoteEditor(), { x: 80, y: 90 });

      expect(onPress).toHaveBeenCalledExactlyOnceWith(note.id);
      expect(setPointerCapture).not.toHaveBeenCalled();
      expect(element.style.transform).toBe('translate(10px, 20px)');
      expect(onGeometryCommit).not.toHaveBeenCalled();
      expect(trashStates()).toEqual([]);
    });

    it('moves when pressed on its padding, ending the edit with the typed text', () => {
      const { element, onPress, onEditEnd, onGeometryCommit } = renderNote({
        editing: true,
      });
      fireEvent.change(getNoteEditor(), { target: { value: 'new text' } });

      press(element, { x: 50, y: 50 });
      // A browser blurs the textarea when a press lands outside it; jsdom does not.
      act(() => {
        getNoteEditor().blur();
      });
      moveTo(element, { x: 80, y: 90 });
      expect(element.style.transform).toBe('translate(40px, 60px)');
      release(element, { x: 80, y: 90 });

      expect(onPress).toHaveBeenCalledExactlyOnceWith(note.id);
      expect(onEditEnd).toHaveBeenCalledExactlyOnceWith(note.id, 'new text');
      expect(onGeometryCommit).toHaveBeenCalledExactlyOnceWith(note.id, {
        x: 40,
        y: 60,
        width: 200,
        height: 160,
      });
    });
  });
});
