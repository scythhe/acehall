import type { ComponentType } from 'react';
import type { Colors } from '../../ui/uiStyles';
import type { SeatAnchor, Vec3 } from '../anchors/types';

/** Where the player sat down. Everything is in world coordinates. */
export interface SceneGameContext {
  gameId: string;
  anchorId: string;
  tablePosition: Vec3;
  /** Every seat of the table, in anchor order. */
  seats: readonly SeatAnchor[];
  /** Index into `seats` of the seat the player took. */
  seatIndex: number;
}

/** A running in-scene game: the pieces the lobby draws while the player sits at the table. */
export interface SceneGameSession {
  /** World-space content (cards, chips, opponents), drawn inside the canvas. */
  Scene: ComponentType;
  /** Controls at the screen edge, drawn in the DOM. `onLeave` stands the player up. */
  Controls: ComponentType<{ onLeave(): void; colors: Colors }>;
  /** Called once when the player leaves, however they leave. */
  close(): void;
}

/**
 * A game played on the table itself instead of in an iframe overlay. Internal for now: the public API is
 * unchanged, and the demo registers its poker table here.
 */
export interface SceneGame {
  /** May reject with an Error whose message is shown to the player (for example "not enough balance"). */
  open(context: SceneGameContext): Promise<SceneGameSession> | SceneGameSession;
}

const registry = new Map<string, SceneGame>();

export function registerSceneGame(gameId: string, game: SceneGame): void {
  registry.set(gameId, game);
}

export const getSceneGame = (gameId: string) => registry.get(gameId);
