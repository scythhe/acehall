import type { InteractiveObjectConfig } from '../lib/types';
import type { AnchorKind, SeatAnchor, Vec3, ZoneId } from '../scene/anchors/types';

export type LocalizedName = InteractiveObjectConfig['displayName'];

/** One seat (or the cashier's standing spot) the player can interact with. Plain data, no scene references. */
export interface Interactable {
  /** Seat id; unique across the lobby. */
  key: string;
  anchorId: string;
  kind: AnchorKind;
  zone: ZoneId;
  objectPosition: Vec3;
  seat: SeatAnchor;
  /** Null for the cashier, which launches no game. */
  gameId: string | null;
  displayName: LocalizedName | null;
}
