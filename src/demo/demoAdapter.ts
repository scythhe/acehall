import type { Wallet } from './poker/session';
import type { Locale, OperatorAdapter, PlayerLimitsState, PlayerSession } from '../lib/types';

/** Pages under `public/demo-games/` for each demo game id. */
const GAMES: Record<string, string> = {
  'demo-blackjack': 'blackjack.html',
  'demo-roulette': 'roulette.html',
  'demo-slot-fruit': 'slot.html?theme=fruit',
  'demo-slot-gems': 'slot.html?theme=gems',
  'demo-slot-neon': 'slot.html?theme=neon',
  'demo-poker': 'table.html?title=Poker',
  'demo-baccarat': 'table.html?title=Baccarat',
  'demo-live': 'table.html?title=Live%20Dealer',
};

export interface DemoAdapterOptions {
  startingBalance?: number;
  /** Simulate a signed-out player (the lobby calls `requestLogin`). */
  guest?: boolean;
  /** Simulate an operator limit: games refuse to launch with this reason. */
  limitReason?: string;
}

/**
 * Play-money adapter for sales demos. It holds a fake balance and talks to the demo games over postMessage
 * (`acehall-demo-game` messages), which the real bridge ignores. Nothing here is real-money logic.
 */
export function createDemoAdapter(options: DemoAdapterOptions = {}): OperatorAdapter & {
  dispose(): void;
  /** Play-money wallet for in-scene demo games (the poker table's buy-in and cash-out). */
  wallet: Wallet;
} {
  let balance = options.startingBalance ?? 1000;
  const listeners = new Set<(balance: number) => void>();
  const setBalance = (next: number) => {
    balance = Math.round(next * 100) / 100;
    listeners.forEach((cb) => {
      cb(balance);
    });
  };

  const onMessage = (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;
    const data = event.data as Record<string, unknown> | null;
    if (typeof data !== 'object' || data?.source !== 'acehall-demo-game') return;
    const amount = typeof data.amount === 'number' && data.amount > 0 ? data.amount : 0;
    let ok = true;
    if (data.type === 'bet') {
      ok = amount > 0 && amount <= balance;
      if (ok) setBalance(balance - amount);
    } else if (data.type === 'payout') {
      setBalance(balance + amount);
    } else if (data.type !== 'hello') {
      return;
    }
    (event.source as Window | null)?.postMessage(
      { source: 'acehall-demo', id: data.id, ok, balance },
      event.origin,
    );
  };
  window.addEventListener('message', onMessage);

  return {
    getSession: (): Promise<PlayerSession> =>
      Promise.resolve({
        playerId: 'demo-player',
        displayName: 'Demo Player',
        currency: 'GEL',
        balance,
        isAuthenticated: !options.guest,
      }),
    getGameLaunchUrl: (gameId: string, ctx: { locale: Locale; device: 'desktop' | 'mobile' }) => {
      const page = GAMES[gameId];
      if (!page) return Promise.reject(new Error(`Unknown demo game "${gameId}".`));
      const url = new URL(
        `demo-games/${page}`,
        new URL(import.meta.env.BASE_URL, window.location.href),
      );
      url.searchParams.set('locale', ctx.locale);
      url.searchParams.set('device', ctx.device);
      return Promise.resolve(url.href);
    },
    subscribeBalance: (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    getPlayerLimitsState: (): Promise<PlayerLimitsState> =>
      Promise.resolve(
        options.limitReason === undefined
          ? { canPlay: true }
          : { canPlay: false, reason: options.limitReason },
      ),
    onEvent: (event) => {
      console.info('[AceHall event]', event);
    },
    requestLogin: () => {
      console.info('[AceHall] requestLogin');
    },
    openCashier: () => {
      console.info('[AceHall] openCashier');
    },
    wallet: {
      buyIn: (amount) => {
        if (amount <= 0 || amount > balance) return false;
        setBalance(balance - amount);
        return true;
      },
      cashOut: (amount) => {
        if (amount > 0) setBalance(balance + amount);
      },
    },
    dispose: () => {
      window.removeEventListener('message', onMessage);
    },
  };
}
