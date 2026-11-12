import type { Point, Rect, Size } from './types';
import { MIN_SIZE } from './types';

export type Gesture =
  | { readonly kind: 'move'; readonly start: Point; readonly initial: Rect }
  | { readonly kind: 'resize'; readonly start: Point; readonly initial: Rect }
  | { readonly kind: 'draw'; readonly start: Point };

export function normalizeRect(a: Point, b: Point): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  };
}

export function applyGesture(gesture: Gesture, pointer: Point): Rect {
  switch (gesture.kind) {
    case 'move': {
      const { initial, start } = gesture;
      return {
        ...initial,
        x: Math.max(0, initial.x + pointer.x - start.x),
        y: Math.max(0, initial.y + pointer.y - start.y),
      };
    }
    case 'resize': {
      const { initial, start } = gesture;
      return {
        ...initial,
        width: Math.max(MIN_SIZE.width, initial.width + pointer.x - start.x),
        height: Math.max(MIN_SIZE.height, initial.height + pointer.y - start.y),
      };
    }
    case 'draw':
      return normalizeRect(gesture.start, {
        x: Math.max(0, pointer.x),
        y: Math.max(0, pointer.y),
      });
  }
}

// Left/top edges are inside the rect; right/bottom edges are not.
export function containsPoint(rect: Rect, point: Point): boolean {
  return point.x >= rect.x && point.x < rect.x + rect.width && point.y >= rect.y && point.y < rect.y + rect.height;
}

export function meetsMinSize(size: Size): boolean {
  return size.width >= MIN_SIZE.width && size.height >= MIN_SIZE.height;
}

export function centredRect(centre: Point, size: Size): Rect {
  return {
    x: Math.max(0, centre.x - size.width / 2),
    y: Math.max(0, centre.y - size.height / 2),
    width: size.width,
    height: size.height,
  };
}

export function rectsEqual(a: Rect, b: Rect): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}
