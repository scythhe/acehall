import { anchors } from './anchors';
import type { Anchor } from './types';

/** A later loader can read named empties from a GLB instead, without changing callers. */
export function loadAnchors(): Promise<Anchor[]> {
  return Promise.resolve([...anchors]);
}
