import { shuffledDeck, type Card, type Rng } from './cards';
import { evaluate, handCategory } from './evaluate';

export const SMALL_BLIND = 1;
export const BIG_BLIND = 2;

export type Street = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

export interface Player {
  name: string;
  isHuman: boolean;
  /** Index into the table's seat anchors. */
  seatIndex: number;
  stack: number;
  /** Chips put in on the current street. */
  bet: number;
  /** Chips put in over the whole hand. */
  committed: number;
  hole: readonly [Card, Card] | null;
  folded: boolean;
  allIn: boolean;
  /** Has acted since the last raise on this street. */
  acted: boolean;
  lastAction: string | null;
}

export interface Award {
  player: number;
  amount: number;
  /** Category of the winning hand (see `HAND_NAMES`) when there was a showdown. */
  hand: number | null;
}

export interface PokerState {
  players: Player[];
  button: number;
  street: Street;
  board: Card[];
  deck: Card[];
  toAct: number;
  currentBet: number;
  /** Size of the last full raise on this street; the next raise must be at least this much bigger. */
  lastRaise: number;
  handNumber: number;
  /** True when hole cards are turned face up for a showdown. */
  revealed: boolean;
  awards: Award[];
}

export type Action = { type: 'fold' } | { type: 'call' } | { type: 'raise'; to: number };

export interface LegalActions {
  canCheck: boolean;
  /** Chips needed to call (already capped at the player's stack). */
  callAmount: number;
  canRaise: boolean;
  /** Raise sizes are "raise to" totals for the street. */
  minRaiseTo: number;
  maxRaiseTo: number;
}

export function createState(
  seats: readonly { name: string; isHuman: boolean; seatIndex: number; stack: number }[],
): PokerState {
  return {
    players: seats.map((s) => ({
      ...s,
      bet: 0,
      committed: 0,
      hole: null,
      folded: false,
      allIn: false,
      acted: false,
      lastAction: null,
    })),
    button: seats.length - 1,
    street: 'waiting',
    board: [],
    deck: [],
    toAct: -1,
    currentBet: 0,
    lastRaise: BIG_BLIND,
    handNumber: 0,
    revealed: false,
    awards: [],
  };
}

export const potOf = (s: PokerState) => s.players.reduce((sum, p) => sum + p.committed, 0);

const inHand = (p: Player) => !p.folded && p.hole !== null;

/** Next seat index after `from` (wrapping) that satisfies `test`, or -1. */
function nextIndex(s: PokerState, from: number, test: (p: Player) => boolean): number {
  const n = s.players.length;
  for (let step = 1; step <= n; step++) {
    const i = (from + step) % n;
    const p = s.players[i];
    if (p && test(p)) return i;
  }
  return -1;
}

function post(p: Player, amount: number) {
  const paid = Math.min(amount, p.stack);
  p.stack -= paid;
  p.bet += paid;
  p.committed += paid;
  if (p.stack === 0) p.allIn = true;
  return paid;
}

/** Deal a new hand. Players with no chips sit this hand out. Needs at least two players with chips. */
export function startHand(s: PokerState, rng: Rng): boolean {
  const funded = s.players.filter((p) => p.stack > 0).length;
  if (funded < 2) return false;

  s.handNumber++;
  s.deck = shuffledDeck(rng);
  s.board = [];
  s.revealed = false;
  s.awards = [];
  for (const p of s.players) {
    p.bet = p.committed = 0;
    p.folded = p.stack === 0;
    p.allIn = false;
    p.acted = false;
    p.lastAction = null;
    p.hole = p.stack > 0 ? [s.deck.pop() ?? 0, s.deck.pop() ?? 0] : null;
  }

  s.button = nextIndex(s, s.button, (p) => p.hole !== null);
  const headsUp = funded === 2;
  const sb = headsUp ? s.button : nextIndex(s, s.button, (p) => p.hole !== null);
  const bb = nextIndex(s, sb, (p) => p.hole !== null);
  post(s.players[sb] as Player, SMALL_BLIND);
  post(s.players[bb] as Player, BIG_BLIND);
  s.currentBet = BIG_BLIND;
  s.lastRaise = BIG_BLIND;
  s.street = 'preflop';
  s.toAct = nextIndex(s, bb, (p) => inHand(p) && !p.allIn);
  if (s.toAct === -1) finishStreet(s);
  return true;
}

export function legalActions(s: PokerState): LegalActions | null {
  const p = s.players[s.toAct];
  if (!p || s.street === 'waiting' || s.street === 'showdown') return null;
  const toCall = s.currentBet - p.bet;
  const maxRaiseTo = p.bet + p.stack;
  const minRaiseTo = Math.min(maxRaiseTo, s.currentBet + s.lastRaise);
  return {
    canCheck: toCall <= 0,
    callAmount: Math.min(Math.max(toCall, 0), p.stack),
    canRaise: maxRaiseTo > s.currentBet,
    minRaiseTo,
    maxRaiseTo,
  };
}

/** Apply the action of the player to act. Illegal actions are coerced to the nearest legal one. */
export function act(s: PokerState, action: Action): void {
  const p = s.players[s.toAct];
  const legal = legalActions(s);
  if (!p || !legal) return;

  if (action.type === 'fold' && !legal.canCheck) {
    p.folded = true;
    p.lastAction = 'Fold';
  } else if (action.type === 'raise' && legal.canRaise) {
    const to = Math.min(legal.maxRaiseTo, Math.max(legal.minRaiseTo, Math.round(action.to)));
    const size = to - s.currentBet;
    post(p, to - p.bet);
    // A short all-in that is not a full raise does not reopen the betting.
    if (size >= s.lastRaise) {
      s.lastRaise = size;
      for (const other of s.players) if (other !== p) other.acted = false;
    }
    s.currentBet = Math.max(s.currentBet, p.bet);
    p.lastAction = p.allIn ? `All-in ${String(p.bet)}` : `Raise ${String(p.bet)}`;
  } else {
    // Check or call (also what a "fold" with nothing to call becomes).
    post(p, legal.callAmount);
    p.lastAction = legal.callAmount === 0 ? 'Check' : p.allIn ? `All-in ${String(p.bet)}` : 'Call';
  }
  p.acted = true;
  advance(s);
}

function advance(s: PokerState) {
  const live = s.players.filter(inHand);
  if (live.length === 1) {
    awardTo(s, live, false);
    return;
  }
  const waiting = (p: Player) => inHand(p) && !p.allIn && (!p.acted || p.bet < s.currentBet);
  const next = nextIndex(s, s.toAct, waiting);
  if (next !== -1) {
    s.toAct = next;
    return;
  }
  finishStreet(s);
}

function finishStreet(s: PokerState) {
  for (const p of s.players) {
    p.bet = 0;
    p.acted = false;
    p.lastAction = p.folded ? p.lastAction : null;
  }
  s.currentBet = 0;
  s.lastRaise = BIG_BLIND;

  const deal = (n: number) => {
    s.deck.pop();
    for (let i = 0; i < n; i++) s.board.push(s.deck.pop() ?? 0);
  };
  if (s.street === 'preflop') {
    deal(3);
    s.street = 'flop';
  } else if (s.street === 'flop') {
    deal(1);
    s.street = 'turn';
  } else if (s.street === 'turn') {
    deal(1);
    s.street = 'river';
  } else {
    showdown(s);
    return;
  }

  const canBet = s.players.filter((p) => inHand(p) && !p.allIn);
  if (canBet.length < 2) {
    // Everyone left is all-in (or only one can still bet): run the board out.
    finishStreet(s);
    return;
  }
  s.toAct = nextIndex(s, s.button, (p) => inHand(p) && !p.allIn);
}

function showdown(s: PokerState) {
  s.revealed = true;
  awardTo(s, s.players.filter(inHand), true);
}

/** Split the pot into main and side pots by contribution and pay each to its best eligible hand(s). */
function awardTo(s: PokerState, contenders: Player[], contested: boolean) {
  const paid = new Map<number, Award>();
  const credit = (index: number, amount: number, hand: number | null) => {
    const existing = paid.get(index);
    if (existing) existing.amount += amount;
    else paid.set(index, { player: index, amount, hand });
    (s.players[index] as Player).stack += amount;
  };

  // Pots are cut at each contender's total stake; the top pot sweeps up everything above it.
  const levels = [...new Set(contenders.map((p) => p.committed))].sort((a, b) => a - b);
  let previous = 0;
  levels.forEach((level, i) => {
    const ceiling = i === levels.length - 1 ? Infinity : level;
    const pot = s.players.reduce(
      (sum, p) => sum + Math.max(0, Math.min(p.committed, ceiling) - previous),
      0,
    );
    previous = level;
    const eligible = contenders.filter((p) => p.committed >= level);
    const scores = eligible.map((p) => ({
      p,
      score: contested ? evaluate([...(p.hole ?? []), ...s.board]) : 0,
    }));
    const best = Math.max(...scores.map((x) => x.score));
    const winners = scores.filter((x) => x.score === best);
    const share = Math.floor(pot / winners.length);
    let remainder = pot - share * winners.length;
    for (const { p, score } of winners) {
      const extra = remainder > 0 ? 1 : 0;
      remainder -= extra;
      credit(s.players.indexOf(p), share + extra, contested ? handCategory(score) : null);
    }
  });
  s.awards = [...paid.values()];
  s.street = 'showdown';
  s.toAct = -1;
  for (const p of s.players) p.bet = 0;
}
