import type { RefObject } from 'react';
import { NOTE_COLORS, type NoteColor } from '../../model/types';
import type { TrashState } from '../types';

const COLOR_NAMES: Record<NoteColor, string> = {
  yellow: 'Yellow',
  pink: 'Pink',
  blue: 'Blue',
  green: 'Green',
};

interface DockProps {
  readonly color: NoteColor; // For the next note drawn.
  readonly onColorChange: (color: NoteColor) => void;
  readonly trashState: TrashState;
  readonly trashRef: RefObject<HTMLDivElement | null>;
}

// The trash has fixed dimensions; its state only changes colours.
export function Dock({ color, onColorChange, trashState, trashRef }: DockProps) {
  return (
    <div className="dock">
      <fieldset className="dock-swatches" aria-label="Note colour">
        {NOTE_COLORS.map((swatch) => (
          <button
            key={swatch}
            type="button"
            className="swatch"
            data-color={swatch}
            aria-label={COLOR_NAMES[swatch]}
            aria-pressed={swatch === color}
            onMouseDown={(event) => {
              event.preventDefault(); // Keeps focus in the note being edited.
            }}
            onClick={() => {
              onColorChange(swatch);
            }}
          />
        ))}
      </fieldset>
      <div className="dock-divider" />
      <div ref={trashRef} className="trash" data-state={trashState}>
        Trash
      </div>
    </div>
  );
}
