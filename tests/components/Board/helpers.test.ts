import { describe, expect, it } from 'vitest';
import { surfaceSize } from '../../../src/components/Board/helpers';

describe('surfaceSize', () => {
  it('reaches the furthest right and bottom edges, plus a margin', () => {
    expect(
      surfaceSize([
        { x: 900, y: 10, width: 200, height: 160 },
        { x: 10, y: 700, width: 100, height: 80 },
      ]),
    ).toEqual({ width: 1340, height: 1020 });
  });

  it('is just the margin when there are no notes', () => {
    expect(surfaceSize([])).toEqual({ width: 240, height: 240 });
  });
});
