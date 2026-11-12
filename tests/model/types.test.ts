import { describe, expect, it } from 'vitest';
import { createNoteId, isNote, toNoteId } from '../../src/model/types';

const valid = {
  id: toNoteId('a'),
  text: 'hello',
  color: 'yellow',
  x: 10,
  y: 20,
  width: 200,
  height: 160,
  z: 1,
};

describe('isNote', () => {
  it('accepts a valid note', () => {
    expect(isNote(valid)).toBe(true);
  });

  it('rejects null and arrays', () => {
    expect(isNote(null)).toBe(false);
    expect(isNote([])).toBe(false);
  });

  it('rejects an unknown colour', () => {
    expect(isNote({ ...valid, color: 'red' })).toBe(false);
  });

  it('rejects non-finite numbers', () => {
    expect(isNote({ ...valid, x: NaN })).toBe(false);
    expect(isNote({ ...valid, z: Infinity })).toBe(false);
  });

  it('rejects a numeric field that is a string', () => {
    expect(isNote({ ...valid, width: '200' })).toBe(false);
  });

  it('rejects a missing text field', () => {
    expect(
      isNote({
        id: valid.id,
        color: valid.color,
        x: valid.x,
        y: valid.y,
        width: valid.width,
        height: valid.height,
        z: valid.z,
      }),
    ).toBe(false);
  });
});

describe('createNoteId', () => {
  it('returns a different id each call', () => {
    expect(createNoteId()).not.toBe(createNoteId());
  });
});
