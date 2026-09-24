import type { Locale, OperatorAdapter, PlayerLimitsState } from '../lib/types';

export type LaunchResult =
  | { status: 'ready'; url: string }
  /** Operator limits refused; `message` is the operator's reason. */
  | { status: 'blocked'; message?: string }
  | { status: 'login' }
  | { status: 'error'; message: string };

export interface LaunchContext {
  locale: Locale;
  device: 'desktop' | 'mobile';
  timeoutMs: number;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`The operator did not answer within ${String(ms)} ms.`));
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timer);
  });
}

/**
 * Ask the operator whether the player may play and where the game lives: session, then limits, then launch URL.
 * Never throws; every failure is reported as a result the UI can show.
 */
export async function prepareLaunch(
  adapter: OperatorAdapter,
  gameId: string,
  ctx: LaunchContext,
  /** In-scene games have no launch URL; skip asking for one. */
  options: { launchUrl?: boolean } = {},
): Promise<LaunchResult> {
  try {
    const session = await withTimeout(adapter.getSession(), ctx.timeoutMs);
    if (!session.isAuthenticated) {
      adapter.requestLogin?.();
      return { status: 'login' };
    }
    const noLimits: PlayerLimitsState = { canPlay: true };
    const limits = await withTimeout(
      Promise.resolve(adapter.getPlayerLimitsState?.(gameId) ?? noLimits),
      ctx.timeoutMs,
    );
    if (!limits.canPlay) {
      return limits.reason === undefined
        ? { status: 'blocked' }
        : { status: 'blocked', message: limits.reason };
    }
    if (options.launchUrl === false) return { status: 'ready', url: '' };
    const url = await withTimeout(
      adapter.getGameLaunchUrl(gameId, { locale: ctx.locale, device: ctx.device }),
      ctx.timeoutMs,
    );
    return { status: 'ready', url };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : String(error) };
  }
}
