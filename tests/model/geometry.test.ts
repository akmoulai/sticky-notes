import { describe, expect, it } from 'vitest';
import { applyGesture, centredRect, containsPoint, meetsMinSize, rectsEqual } from '../../src/model/geometry';
import { DEFAULT_SIZE } from '../../src/model/types';

const initial = { x: 10, y: 10, width: 200, height: 160 };

describe('applyGesture: move', () => {
  const start = { x: 100, y: 100 };

  it('translates by the pointer delta', () => {
    expect(applyGesture({ kind: 'move', start, initial }, { x: 130, y: 140 })).toEqual({
      x: 40,
      y: 50,
      width: 200,
      height: 160,
    });
  });

  it('clamps x and y to zero and keeps the size', () => {
    expect(applyGesture({ kind: 'move', start, initial }, { x: 0, y: 0 })).toEqual({
      x: 0,
      y: 0,
      width: 200,
      height: 160,
    });
  });
});

describe('applyGesture: resize', () => {
  const start = { x: 210, y: 170 };

  it('grows and shrinks by the pointer delta', () => {
    expect(applyGesture({ kind: 'resize', start, initial }, { x: 260, y: 150 })).toEqual({
      x: 10,
      y: 10,
      width: 250,
      height: 140,
    });
  });

  it('never goes below the minimum size', () => {
    expect(applyGesture({ kind: 'resize', start, initial }, { x: -290, y: -330 })).toEqual({
      x: 10,
      y: 10,
      width: 80,
      height: 60,
    });
  });
});

describe('applyGesture: draw', () => {
  const start = { x: 100, y: 100 };

  it.each([
    [
      { x: 220, y: 180 },
      { x: 100, y: 100, width: 120, height: 80 },
    ],
    [
      { x: 20, y: 180 },
      { x: 20, y: 100, width: 80, height: 80 },
    ],
    [
      { x: 220, y: 40 },
      { x: 100, y: 40, width: 120, height: 60 },
    ],
    [
      { x: 20, y: 40 },
      { x: 20, y: 40, width: 80, height: 60 },
    ],
  ])('normalizes a drag to %j', (pointer, expected) => {
    expect(applyGesture({ kind: 'draw', start }, pointer)).toEqual(expected);
  });

  it('clamps the pointer to the non-negative quadrant', () => {
    expect(applyGesture({ kind: 'draw', start: { x: 50, y: 50 } }, { x: -30, y: -30 })).toEqual({
      x: 0,
      y: 0,
      width: 50,
      height: 50,
    });
  });
});

describe('meetsMinSize', () => {
  it('accepts exactly the minimum', () => {
    expect(meetsMinSize({ width: 80, height: 60 })).toBe(true);
  });

  it('rejects a width or height one pixel short', () => {
    expect(meetsMinSize({ width: 79, height: 60 })).toBe(false);
    expect(meetsMinSize({ width: 80, height: 59 })).toBe(false);
  });
});

describe('centredRect', () => {
  it('clamps to the top-left corner', () => {
    expect(centredRect({ x: 50, y: 40 }, DEFAULT_SIZE)).toEqual({
      x: 0,
      y: 0,
      width: 200,
      height: 160,
    });
  });

  it('centres on the point when there is room', () => {
    expect(centredRect({ x: 500, y: 400 }, DEFAULT_SIZE)).toEqual({
      x: 400,
      y: 320,
      width: 200,
      height: 160,
    });
  });
});

describe('containsPoint', () => {
  const rect = { x: 10, y: 10, width: 10, height: 10 };

  it('includes the top-left edge and the last interior pixel', () => {
    expect(containsPoint(rect, { x: 10, y: 10 })).toBe(true);
    expect(containsPoint(rect, { x: 19, y: 19 })).toBe(true);
  });

  it('excludes the right/bottom edge and outside points', () => {
    expect(containsPoint(rect, { x: 20, y: 20 })).toBe(false);
    expect(containsPoint(rect, { x: 9, y: 15 })).toBe(false);
  });
});

describe('rectsEqual', () => {
  it('compares all four fields', () => {
    expect(rectsEqual(initial, { ...initial })).toBe(true);
    expect(rectsEqual(initial, { ...initial, x: 11 })).toBe(false);
    expect(rectsEqual(initial, { ...initial, y: 11 })).toBe(false);
    expect(rectsEqual(initial, { ...initial, width: 201 })).toBe(false);
    expect(rectsEqual(initial, { ...initial, height: 161 })).toBe(false);
  });
});
