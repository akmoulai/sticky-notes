import type { Point, Rect } from '../model/types';

// `armed`: a note is being dragged; `hot`: it is over the trash.
export type TrashState = 'idle' | 'armed' | 'hot';

export interface BoardGeometry {
  // Client to board coordinates, rounded to whole pixels so that previews, size checks and stored notes always agree.
  toBoardPoint(client: Point): Point;
  getTrashRect(): Rect; // In client coordinates.
}
