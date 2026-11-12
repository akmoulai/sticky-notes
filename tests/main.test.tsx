import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEY } from '../src/api/mockNotesApi';
import { type Note, toNoteId } from '../src/model/types';

const saved: Note = {
  id: toNoteId('a'),
  x: 10,
  y: 20,
  width: 200,
  height: 160,
  text: 'from last time',
  color: 'green',
  z: 1,
};

afterEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
  vi.resetModules();
});

describe('main', () => {
  it('mounts the board in #root, showing the notes kept in localStorage', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([saved]));
    const root = document.createElement('div');
    root.id = 'root';
    document.body.append(root);

    await import('../src/main');

    expect(await screen.findByText('from last time')).toBeDefined();
    expect(root.contains(screen.getByRole('status'))).toBe(true);
  });

  it('fails loudly when the page has no #root', async () => {
    await expect(import('../src/main')).rejects.toThrow('Root element #root not found');
  });
});
