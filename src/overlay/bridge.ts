export type GameMessageType = 'close' | 'balance_changed';

const TYPES: readonly string[] = ['close', 'balance_changed'] satisfies GameMessageType[];

export interface BridgeOptions {
  allowedOrigins: readonly string[];
  /** The window of the game iframe currently shown; messages from anything else are ignored. */
  frameWindow(): Window | null;
  onClose(): void;
  onBalanceChanged(): void;
}

/**
 * Handler for `message` events from the game iframe. Anything that is not exactly
 * `{ source: 'acehall-game', type: 'close' | 'balance_changed' }` from an allowed origin and the game's own
 * window is ignored silently. Message payloads are never trusted: a balance change only triggers a re-fetch.
 */
export function createBridgeHandler(options: BridgeOptions) {
  return (event: MessageEvent): void => {
    if (!options.allowedOrigins.includes(event.origin)) return;
    const frame = options.frameWindow();
    if (!frame || event.source !== frame) return;
    const data: unknown = event.data;
    if (typeof data !== 'object' || data === null) return;
    const { source, type } = data as Record<string, unknown>;
    if (source !== 'acehall-game' || typeof type !== 'string' || !TYPES.includes(type)) return;
    if (type === 'close') options.onClose();
    else options.onBalanceChanged();
  };
}
