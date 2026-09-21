import type { ResolvedConfig } from '../config/defaults';
import type { Anchor } from '../scene/anchors/types';
import type { Interactable } from './types';

/**
 * Which seats the player can interact with: anchors the operator mapped a game onto, plus the cashier desk
 * (when the adapter can open a cashier). Anchors in disabled zones and unmapped anchors stay decorative.
 */
export function buildInteractables(
  anchors: readonly Anchor[],
  config: Pick<ResolvedConfig, 'objects' | 'zones'>,
  options: { cashier: boolean },
): Interactable[] {
  const objects = new Map(config.objects.map((o) => [o.anchorId, o]));
  const result: Interactable[] = [];
  for (const anchor of anchors) {
    if (!config.zones[anchor.zone].enabled) continue;
    const object = objects.get(anchor.id);
    if (anchor.kind === 'cashier' ? !options.cashier : !object) continue;
    for (const seat of anchor.seats) {
      result.push({
        key: seat.id,
        anchorId: anchor.id,
        kind: anchor.kind,
        zone: anchor.zone,
        objectPosition: anchor.position,
        seat,
        gameId: object?.gameId ?? null,
        displayName: object?.displayName ?? null,
      });
    }
  }
  return result;
}
