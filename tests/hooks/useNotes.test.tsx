import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { NotesApi } from '../../src/api/notesApi';
import { useNotes } from '../../src/hooks/useNotes';
import { type Note, toNoteId } from '../../src/model/types';

const bottom: Note = {
  id: toNoteId('a'),
  x: 10,
  y: 20,
  width: 200,
  height: 160,
  text: 'one',
  color: 'yellow',
  z: 1,
};
const top: Note = { ...bottom, id: toNoteId('b'), text: 'two', z: 2 };

function makeApi(list: () => Promise<readonly Note[]> = () => Promise.resolve([bottom, top])) {
  return {
    list: vi.fn(list),
    create: vi.fn(() => Promise.resolve()),
    update: vi.fn(() => Promise.resolve()),
    remove: vi.fn(() => Promise.resolve()),
  } satisfies NotesApi;
}

async function renderReady(api: NotesApi) {
  const hook = renderHook(() => useNotes(api));
  await waitFor(() => {
    expect(hook.result.current.state.status).toBe('ready');
  });
  return hook;
}

describe('useNotes', () => {
  it('starts loading, then holds the listed notes', async () => {
    const api = makeApi();
    const { result } = renderHook(() => useNotes(api));
    expect(result.current.state.status).toBe('loading');
    await waitFor(() => {
      expect(result.current.state.status).toBe('ready');
    });
    const { state } = result.current;
    if (state.status !== 'ready') {
      throw new Error('expected ready');
    }
    expect([...state.notes.values()]).toEqual([bottom, top]);
  });

  it('ignores the load of an effect that React has since replaced', async () => {
    // Strict mode runs the load effect twice; only the second load counts.
    let resolveSecond: (notes: readonly Note[]) => void = () => {};
    const list = vi
      .fn<NotesApi['list']>()
      .mockResolvedValueOnce([bottom])
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveSecond = resolve;
        }),
      );
    const api = makeApi(list);
    const { result } = renderHook(() => useNotes(api), {
      reactStrictMode: true,
    });

    await act(() => Promise.resolve());
    expect(result.current.state.status).toBe('loading');

    await act(async () => {
      resolveSecond([top]);
      await Promise.resolve();
    });
    const { state } = result.current;
    if (state.status !== 'ready') {
      throw new Error('expected ready');
    }
    expect([...state.notes.values()]).toEqual([top]);
  });

  it('creates a note optimistically and persists it', async () => {
    const api = makeApi();
    const { result } = await renderReady(api);
    const rect = { x: 1, y: 2, width: 200, height: 160 };

    let id = toNoteId('unset');
    act(() => {
      id = result.current.actions.create(rect, 'pink');
    });

    const { state } = result.current;
    if (state.status !== 'ready') {
      throw new Error('expected ready');
    }
    expect(state.notes.get(id)).toMatchObject({ ...rect, color: 'pink', z: 3 });
    await waitFor(() => {
      expect(api.create).toHaveBeenCalledWith(state.notes.get(id));
    });
    await waitFor(() => {
      expect(result.current.writeStatus).toBe('idle');
    });
  });

  it('keeps one actions identity across re-renders', async () => {
    const api = makeApi();
    const { result, rerender } = await renderReady(api);
    const before = result.current.actions;
    rerender();
    act(() => {
      result.current.actions.setText(bottom.id, 'changed');
    });
    expect(result.current.actions).toBe(before);
    await waitFor(() => {
      expect(result.current.writeStatus).toBe('idle');
    });
  });

  it('does nothing for actions that change nothing', async () => {
    const api = makeApi();
    const { result } = await renderReady(api);
    const stateBefore = result.current.state;

    // Async act drains the queue's microtasks, so a stray write would be seen.
    await act(async () => {
      result.current.actions.setGeometry(bottom.id, bottom);
      result.current.actions.raise(top.id);
      result.current.actions.setText(bottom.id, bottom.text);
      result.current.actions.remove(toNoteId('missing'));
      await Promise.resolve();
    });

    expect(result.current.state).toBe(stateBefore);
    expect(api.create).not.toHaveBeenCalled();
    expect(api.update).not.toHaveBeenCalled();
    expect(api.remove).not.toHaveBeenCalled();
    expect(result.current.writeStatus).toBe('idle');
  });

  it('persists a raise with the new z', async () => {
    const api = makeApi();
    const { result } = await renderReady(api);
    act(() => {
      result.current.actions.raise(bottom.id);
    });
    await waitFor(() => {
      expect(api.update).toHaveBeenCalledWith(bottom.id, { z: 3 });
    });
    await waitFor(() => {
      expect(result.current.writeStatus).toBe('idle');
    });
  });

  it('persists removal', async () => {
    const api = makeApi();
    const { result } = await renderReady(api);
    act(() => {
      result.current.actions.remove(top.id);
    });
    await waitFor(() => {
      expect(api.remove).toHaveBeenCalledWith(top.id);
    });
    await waitFor(() => {
      expect(result.current.writeStatus).toBe('idle');
    });
  });
});
