import type { Rng } from './cards';
import { botDecision } from './bots';
import {
  act,
  BIG_BLIND,
  createState,
  legalActions,
  startHand,
  type Action,
  type LegalActions,
  type PokerState,
} from './engine';

/** Play-money buy-in, in the demo wallet's currency. */
export const BUY_IN = 100;
export const BOT_COUNT = 4;

/** Timings in milliseconds, so the table reads as a game being played rather than a blur. */
export const PACE = { newHand: 1200, botMin: 800, botMax: 1500, showdown: 4500 } as const;

const BOT_NAMES = ['Nika', 'Giga', 'Tako', 'Levan', 'Mari', 'Dato', 'Ana', 'Zura', 'Sopo'];

export interface Wallet {
  /** Take `amount` from the display balance. False when the player cannot afford it. */
  buyIn(amount: number): boolean;
  cashOut(amount: number): void;
}

/**
 * Bot seats: the few seats furthest from the player, so the opponents sit across the table in view.
 * Returns seat indexes in table order, including the player's.
 */
export function pickSeats(
  seatPositions: readonly (readonly [number, number, number])[],
  humanSeat: number,
  botCount: number,
): number[] {
  const me = seatPositions[humanSeat];
  if (!me) return [humanSeat];
  const others = seatPositions
    .map((p, index) => ({ index, distance: Math.hypot(p[0] - me[0], p[2] - me[2]) }))
    .filter((x) => x.index !== humanSeat)
    .sort((a, b) => b.distance - a.distance)
    .slice(0, botCount)
    .map((x) => x.index);
  return [humanSeat, ...others].sort((a, b) => a - b);
}

/** One player's game against bots at one table. Timers drive the bots; the human acts through `act`. */
export class PokerSession {
  readonly state: PokerState;
  readonly humanIndex: number;
  busted = false;
  private version = 0;
  private closed = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private readonly listeners = new Set<() => void>();
  private readonly styles: number[];

  constructor(
    seats: readonly number[],
    humanSeat: number,
    private readonly wallet: Wallet,
    private readonly rng: Rng,
  ) {
    this.state = createState(
      seats.map((seatIndex) => ({
        seatIndex,
        isHuman: seatIndex === humanSeat,
        name: seatIndex === humanSeat ? 'You' : (BOT_NAMES[seatIndex % BOT_NAMES.length] ?? 'Bot'),
        stack: BUY_IN,
      })),
    );
    this.humanIndex = this.state.players.findIndex((p) => p.isHuman);
    this.styles = seats.map(() => 0.85 + rng() * 0.4);
    this.schedule();
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getVersion = () => this.version;

  get legal(): LegalActions | null {
    return this.state.toAct === this.humanIndex ? legalActions(this.state) : null;
  }

  /** The human's decision. Ignored when it is not their turn. */
  act(action: Action) {
    if (this.closed || this.state.toAct !== this.humanIndex) return;
    act(this.state, action);
    this.afterAction();
  }

  /** Buy back in after losing every chip. */
  rebuy(): boolean {
    const me = this.state.players[this.humanIndex];
    if (this.closed || !me || me.stack > 0 || !this.wallet.buyIn(BUY_IN)) return false;
    me.stack = BUY_IN;
    this.busted = false;
    this.notify();
    return true;
  }

  /** Leave the table: the remaining stack goes back to the balance. Safe to call twice. */
  close() {
    if (this.closed) return;
    this.closed = true;
    clearTimeout(this.timer);
    const me = this.state.players[this.humanIndex];
    if (me && me.stack > 0) this.wallet.cashOut(me.stack);
    if (me) me.stack = 0;
    this.listeners.clear();
  }

  private notify() {
    this.version++;
    this.listeners.forEach((listener) => {
      listener();
    });
  }

  private afterAction() {
    this.notify();
    this.schedule();
  }

  private schedule() {
    clearTimeout(this.timer);
    if (this.closed) return;
    const { street, toAct } = this.state;
    if (street === 'waiting') {
      this.timer = setTimeout(() => {
        this.dealNext();
      }, PACE.newHand);
    } else if (street === 'showdown') {
      this.timer = setTimeout(() => {
        this.dealNext();
      }, PACE.showdown);
    } else if (toAct !== this.humanIndex) {
      const delay = PACE.botMin + this.rng() * (PACE.botMax - PACE.botMin);
      this.timer = setTimeout(() => {
        this.botAct();
      }, delay);
    }
  }

  private dealNext() {
    const { players } = this.state;
    for (const p of players) if (!p.isHuman && p.stack < BIG_BLIND) p.stack = BUY_IN;
    this.busted = (players[this.humanIndex]?.stack ?? 0) < 1;
    startHand(this.state, this.rng);
    this.notify();
    this.schedule();
  }

  private botAct() {
    if (this.closed || this.state.toAct === this.humanIndex || this.state.toAct < 0) return;
    act(this.state, botDecision(this.state, this.rng, this.styles[this.state.toAct] ?? 1));
    this.afterAction();
  }
}
