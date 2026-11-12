export type NoteId = string & { readonly __brand: 'NoteId' };

export const NOTE_COLORS = ['yellow', 'pink', 'blue', 'green'] as const;
export type NoteColor = (typeof NOTE_COLORS)[number];

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Rect extends Point, Size {}

export interface Note extends Rect {
  readonly id: NoteId;
  readonly text: string;
  readonly color: NoteColor;
  readonly z: number;
}

export const MIN_SIZE: Size = { width: 80, height: 60 };
export const DEFAULT_SIZE: Size = { width: 200, height: 160 };

// The single place a plain string is branded as a NoteId.
export function toNoteId(value: string): NoteId {
  // biome-ignore lint/nursery/noUnsafeTypeAssertion: a brand is a compile-time-only tag; there is no runtime check to narrow with
  return value as NoteId;
}

export function createNoteId(): NoteId {
  return toNoteId(crypto.randomUUID());
}

function isNoteColor(value: unknown): value is NoteColor {
  return NOTE_COLORS.some((color) => color === value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isNote(value: unknown): value is Note {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return (
    'id' in value &&
    typeof value.id === 'string' &&
    'text' in value &&
    typeof value.text === 'string' &&
    'color' in value &&
    isNoteColor(value.color) &&
    'x' in value &&
    isFiniteNumber(value.x) &&
    'y' in value &&
    isFiniteNumber(value.y) &&
    'width' in value &&
    isFiniteNumber(value.width) &&
    'height' in value &&
    isFiniteNumber(value.height) &&
    'z' in value &&
    isFiniteNumber(value.z)
  );
}
