import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { NotesApi } from '../../../src/api/notesApi';
import { Board } from '../../../src/components/Board/Board';
import { type Note, type Point, toNoteId } from '../../../src/model/types';
import { installDragEnvironment, moveTo, press, release } from '../../support/drag';
import { getNoteEditor } from '../../support/queries';

const one: Note = {
  id: toNoteId('one'),
  x: 10,
  y: 20,
  width: 200,
  height: 160,
  text: 'one',
  color: 'yellow',
  z: 1,
};
const two: Note = {
  ...one,
  id: toNoteId('two'),
  x: 100,
  y: 100,
  text: 'two',
  z: 2,
};

function makeApi(notes: readonly Note[] = []) {
  return {
    list: vi.fn<NotesApi['list']>(() => Promise.resolve(notes)),
    create: vi.fn<NotesApi['create']>(() => Promise.resolve()),
    update: vi.fn<NotesApi['update']>(() => Promise.resolve()),
    remove: vi.fn<NotesApi['remove']>(() => Promise.resolve()),
  } satisfies NotesApi;
}

// jsdom lays nothing out, so client and board coordinates coincide.
async function renderReady(notes: readonly Note[] = []) {
  const api = makeApi(notes);
  render(<Board api={api} />);
  await screen.findByRole('status');
  return { api, layer: screen.getByTestId('draw-layer') };
}

function draw(layer: HTMLElement, from: Point, to: Point) {
  press(layer, from);
  moveTo(layer, to);
  release(layer, to);
}

// Lets any write the gesture queued reach the api.
async function settle() {
  await act(() => Promise.resolve());
}

function statusText() {
  return screen.getByRole('status').textContent;
}

function swatch(name: string) {
  return screen.getByRole('button', { name });
}

// Clicks as a browser does.
// jsdom leaves out mousedown's default action, which moves focus to the button unless a handler prevents it.
function clickWithFocus(button: HTMLElement) {
  if (fireEvent.mouseDown(button)) {
    act(() => {
      button.focus();
    });
  }
  fireEvent.mouseUp(button);
  fireEvent.click(button);
}

function noteShowing(text: string): HTMLElement {
  const note = screen.getByText(text).closest('article');
  if (note === null) {
    throw new Error(`"${text}" is not inside a note`);
  }
  return note;
}

describe('Board', () => {
  it('shows loading, then the dock and save status; a swatch picks the colour', async () => {
    render(<Board api={makeApi()} />);
    expect(screen.queryByText('Loading…')).not.toBeNull();
    expect(screen.queryByRole('button')).toBeNull();

    const colours = await screen.findByRole('group', { name: 'Note colour' });
    const swatches = within(colours).getAllByRole('button');
    expect(swatches.map((s) => s.getAttribute('aria-label'))).toEqual(['Yellow', 'Pink', 'Blue', 'Green']);
    expect(screen.queryByText('Trash')).not.toBeNull();
    expect(statusText()).toBe('Saved');
    expect(screen.queryByText('Loading…')).toBeNull();

    expect(swatch('Pink').getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(swatch('Pink'));
    expect(swatch('Pink').getAttribute('aria-pressed')).toBe('true');
    expect(swatch('Yellow').getAttribute('aria-pressed')).toBe('false');
  });

  describe('on the empty board', () => {
    installDragEnvironment();

    it('says how to make a note until there is one', async () => {
      const { layer } = await renderReady();
      const hint = 'Drag to draw a note · double-click for a quick one';
      expect(screen.queryByText(hint)).not.toBeNull();

      draw(layer, { x: 100, y: 100 }, { x: 300, y: 260 });
      await settle();

      expect(screen.queryByText(hint)).toBeNull();
    });

    it('previews the size while drawing, then creates the note in the chosen colour', async () => {
      const { api, layer } = await renderReady();
      fireEvent.click(swatch('Blue'));

      // Drawn up and to the left: the rectangle is normalized.
      press(layer, { x: 300, y: 200 });
      moveTo(layer, { x: 180, y: 110 });
      expect(screen.queryByText('120 × 90')).not.toBeNull();

      release(layer, { x: 180, y: 110 });
      expect(screen.queryByText('120 × 90')).toBeNull();
      expect(statusText()).toBe('Saving…');
      await waitFor(() => {
        expect(statusText()).toBe('Saved');
      });
      expect(api.create).toHaveBeenCalledTimes(1);
      expect(api.create.mock.calls[0]?.[0]).toMatchObject({
        x: 180,
        y: 110,
        width: 120,
        height: 90,
        color: 'blue',
      });
    });

    it('creates nothing for a drag below the minimum size, or a click', async () => {
      const { api, layer } = await renderReady();

      press(layer, { x: 100, y: 100 });
      moveTo(layer, { x: 179, y: 159 });
      expect(screen.queryByText('79 × 59')).not.toBeNull();
      release(layer, { x: 179, y: 159 });
      draw(layer, { x: 300, y: 300 }, { x: 300, y: 300 });
      await settle();

      expect(screen.queryByText('79 × 59')).toBeNull();
      expect(api.create).not.toHaveBeenCalled();
      expect(statusText()).toBe('Saved');
    });

    it('discards the drawing on Escape', async () => {
      const { api, layer } = await renderReady();

      press(layer, { x: 100, y: 100 });
      moveTo(layer, { x: 300, y: 260 });
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByText('200 × 160')).toBeNull();
      release(layer, { x: 300, y: 260 });
      await settle();

      expect(api.create).not.toHaveBeenCalled();
    });

    it('creates a default-size note centred on a double-click', async () => {
      const { api, layer } = await renderReady();

      fireEvent.doubleClick(layer, { clientX: 400, clientY: 300 });
      await settle();

      expect(api.create).toHaveBeenCalledTimes(1);
      expect(api.create.mock.calls[0]?.[0]).toMatchObject({
        x: 300,
        y: 220,
        width: 200,
        height: 160,
        color: 'yellow',
      });
    });

    it('creates only the drawn note when the draw ends a double-click', async () => {
      const { api, layer } = await renderReady();

      // A press soon after a click counts as a double-click's second click.
      draw(layer, { x: 100, y: 100 }, { x: 300, y: 260 });
      fireEvent.doubleClick(layer, { clientX: 300, clientY: 260 });
      await settle();
      expect(api.create).toHaveBeenCalledTimes(1);
      expect(api.create.mock.calls[0]?.[0]).toMatchObject({
        x: 100,
        y: 100,
        width: 200,
        height: 160,
      });

      // A real double-click afterwards still creates a default note.
      draw(layer, { x: 600, y: 400 }, { x: 600, y: 400 });
      fireEvent.doubleClick(layer, { clientX: 600, clientY: 400 });
      await settle();
      expect(api.create).toHaveBeenCalledTimes(2);
    });

    it('recolours the note just drawn, until a press on the board deselects it', async () => {
      const { api, layer } = await renderReady();
      draw(layer, { x: 100, y: 100 }, { x: 300, y: 260 });
      await settle();
      const id = api.create.mock.calls[0]?.[0].id;

      fireEvent.click(swatch('Pink'));
      await settle();
      expect(api.update).toHaveBeenCalledWith(id, { color: 'pink' });

      draw(layer, { x: 500, y: 500 }, { x: 500, y: 500 });
      fireEvent.click(swatch('Green'));
      await settle();
      expect(api.update).toHaveBeenCalledTimes(1);
      expect(swatch('Green').getAttribute('aria-pressed')).toBe('true');
    });

    it('keeps editing the new note while a swatch recolours it', async () => {
      const { api, layer } = await renderReady();
      draw(layer, { x: 100, y: 100 }, { x: 300, y: 260 });
      await settle();
      const id = api.create.mock.calls[0]?.[0].id;

      clickWithFocus(swatch('Pink'));
      await settle();

      expect(document.activeElement).toBe(getNoteEditor());
      expect(getNoteEditor().closest('article')?.dataset.color).toBe('pink');
      expect(api.update).toHaveBeenCalledExactlyOnceWith(id, {
        color: 'pink',
      });
    });

    it('opens a new note for editing and saves its text when the board is pressed', async () => {
      const { api, layer } = await renderReady();
      draw(layer, { x: 100, y: 100 }, { x: 300, y: 260 });
      expect(document.activeElement).toBe(getNoteEditor());

      fireEvent.change(getNoteEditor(), { target: { value: 'buy milk' } });
      draw(layer, { x: 600, y: 400 }, { x: 600, y: 400 });
      await settle();

      expect(screen.queryByRole('textbox')).toBeNull();
      expect(noteShowing('buy milk').dataset.selected).toBe('false');
      const id = api.create.mock.calls[0]?.[0].id;
      expect(api.update).toHaveBeenCalledExactlyOnceWith(id, {
        text: 'buy milk',
      });
    });
  });

  describe('with notes', () => {
    installDragEnvironment();

    it('raises and selects the lower of two notes when it is pressed', async () => {
      const { api } = await renderReady([one, two]);
      const lower = noteShowing('one');
      expect(lower.style.transform).toBe('translate(10px, 20px)');
      expect(lower.style.zIndex).toBe('1');

      press(lower, { x: 50, y: 50 });
      release(lower, { x: 50, y: 50 });
      await settle();

      expect(lower.style.zIndex).toBe('3');
      expect(lower.dataset.selected).toBe('true');
      expect(noteShowing('two').dataset.selected).toBe('false');
      expect(api.update).toHaveBeenCalledExactlyOnceWith(one.id, { z: 3 });
    });

    it('moves a note and saves its position once, on release', async () => {
      const { api } = await renderReady([one, two]);
      const note = noteShowing('two');

      press(note, { x: 150, y: 150 });
      moveTo(note, { x: 200, y: 180 });
      moveTo(note, { x: 210, y: 190 });
      await settle();
      expect(api.update).not.toHaveBeenCalled();

      release(note, { x: 210, y: 190 });
      await settle();
      expect(note.style.transform).toBe('translate(160px, 140px)');
      expect(api.update).toHaveBeenCalledExactlyOnceWith(two.id, {
        x: 160,
        y: 140,
        width: 200,
        height: 160,
      });
    });

    it('saves nothing for clicks that stray a pixel, and edits on the double-click they make', async () => {
      const { api } = await renderReady([one, two]);
      // Already on top, so pressing it raises nothing.
      const note = noteShowing('two');

      press(note, { x: 150, y: 150 });
      moveTo(note, { x: 151, y: 152 });
      release(note, { x: 151, y: 152 });
      press(note, { x: 151, y: 152 });
      moveTo(note, { x: 150, y: 151 });
      release(note, { x: 150, y: 151 });
      fireEvent.doubleClick(note);
      await settle();

      expect(note.style.transform).toBe('translate(100px, 100px)');
      expect(api.update).not.toHaveBeenCalled();
      expect(getNoteEditor().value).toBe('two');
    });

    it('lights the trash while a note is dragged over it, and deletes the note dropped there', async () => {
      const { api } = await renderReady([one, two]);
      const trash = screen.getByText('Trash');
      vi.spyOn(trash, 'getBoundingClientRect').mockReturnValue(new DOMRect(400, 500, 100, 40));
      const note = noteShowing('one');

      press(note, { x: 50, y: 50 });
      moveTo(note, { x: 100, y: 100 });
      expect(trash.dataset.state).toBe('armed');
      moveTo(note, { x: 450, y: 520 });
      expect(trash.dataset.state).toBe('hot');
      release(note, { x: 450, y: 520 });
      await settle();

      expect(trash.dataset.state).toBe('idle');
      expect(screen.queryByText('one')).toBeNull();
      expect(api.remove).toHaveBeenCalledExactlyOnceWith(one.id);
    });

    it('edits a note on double-click, and saves the text when another note is pressed', async () => {
      const { api } = await renderReady([one, two]);

      fireEvent.doubleClick(noteShowing('two'));
      expect(getNoteEditor().value).toBe('two');
      fireEvent.change(getNoteEditor(), { target: { value: 'two, edited' } });
      press(noteShowing('one'), { x: 50, y: 50 });
      release(noteShowing('one'), { x: 50, y: 50 });
      await settle();

      expect(screen.queryByRole('textbox')).toBeNull();
      expect(noteShowing('two, edited').dataset.selected).toBe('false');
      expect(api.update).toHaveBeenCalledWith(two.id, { text: 'two, edited' });
    });

    it('saves the text and keeps the note selected when Escape ends the edit', async () => {
      const { api } = await renderReady([one, two]);

      fireEvent.doubleClick(noteShowing('two'));
      fireEvent.change(getNoteEditor(), { target: { value: 'two, edited' } });
      fireEvent.keyDown(getNoteEditor(), { key: 'Escape' });
      await settle();

      expect(screen.queryByRole('textbox')).toBeNull();
      expect(noteShowing('two, edited').dataset.selected).toBe('true');
      expect(api.update).toHaveBeenCalledWith(two.id, { text: 'two, edited' });
    });

    it('keeps editing a note when its own text is pressed', async () => {
      await renderReady([one, two]);

      fireEvent.doubleClick(noteShowing('two'));
      const editor = getNoteEditor();
      press(editor, { x: 150, y: 150 });
      release(editor, { x: 150, y: 150 });

      expect(getNoteEditor()).toBe(editor);
      expect(noteShowing('two').dataset.selected).toBe('true');
    });
  });
});
