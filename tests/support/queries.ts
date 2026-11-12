import { screen } from '@testing-library/react';

// Checked at runtime to be a textarea.
export function getNoteEditor(): HTMLTextAreaElement {
  const editor = screen.getByRole('textbox', { name: 'Note text' });
  if (!(editor instanceof HTMLTextAreaElement)) {
    throw new Error('The note editor is not a textarea');
  }
  return editor;
}
