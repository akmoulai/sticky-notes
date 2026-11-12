import { meetsMinSize } from '../../model/geometry';
import type { Point, Rect } from '../../model/types';
import type { BoardGeometry } from '../types';
import { useDrawLayer } from './useDrawLayer';

export interface DrawLayerProps {
  readonly geometry: BoardGeometry;
  readonly onPress: () => void;
  readonly onDraw: (rect: Rect) => void; // Only at or above the minimum size.
  readonly onDoubleClick: (boardPoint: Point) => void;
}

export function DrawLayer(props: DrawLayerProps) {
  const { preview, onPointerDown, onDoubleClick } = useDrawLayer(props);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: the board is a pointer-only drawing surface; there is no keyboard equivalent to offer
    <div className="draw-layer" data-testid="draw-layer" onPointerDown={onPointerDown} onDoubleClick={onDoubleClick}>
      {preview !== null && (
        <div
          className="draw-preview"
          data-valid={meetsMinSize(preview)}
          style={{
            left: preview.x,
            top: preview.y,
            width: preview.width,
            height: preview.height,
          }}
        >
          <span className="draw-size">{`${String(preview.width)} × ${String(preview.height)}`}</span>
        </div>
      )}
    </div>
  );
}
