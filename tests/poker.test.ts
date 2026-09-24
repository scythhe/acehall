// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { seededRng, type Card } from '../src/demo/poker/cards';
import { botDecision } from '../src/demo/poker/bots';
import { evaluate, handCategory } from '../src/demo/poker/evaluate';
import {
  act,
  BIG_BLIND,
  createState,
  legalActions,
  potOf,
  startHand,
  type PokerState,
} from '../src/demo/poker/engine';
import { buildLayout } from '../src/demo/poker/layout';
import { pickSeats, PokerSession } from '../src/demo/poker/session';
import { anchors } from '../src/scene/anchors/anchors';
import { prepareLaunch } from '../src/overlay/launch';

/** "As" style shorthand: rank char + suit char. */
const RANKS = '23456789TJQKA';
const SUITS = 'shdc';
const c = (text: string): Card => RANKS.indexOf(text[0] ?? '') + 13 * SUITS.indexOf(text[1] ?? '');
const hand = (text: string) => text.split(' ').map(c);

describe('hand evaluator', () => {
  const category = (text: string) => handCategory(evaluate(hand(text)));

  it('recognises every category from seven cards', () => {
    expect(category('As Kd 9h 7c 5s 3d 2h')).toBe(0);
    expect(category('As Ad 9h 7c 5s 3d 2h')).toBe(1);
    expect(category('As Ad 9h 9c 5s 3d 2h')).toBe(2);
    expect(category('As Ad Ah 7c 5s 3d 2h')).toBe(3);
    expect(category('9s 8d 7h 6c 5s Kd 2h')).toBe(4);
    expect(category('As Ks 9s 7s 5s 3d 2h')).toBe(5);
    expect(category('As Ad Ah 7c 7s 3d 2h')).toBe(6);
    expect(category('As Ad Ah Ac 5s 3d 2h')).toBe(7);
    expect(category('9s 8s 7s 6s 5s Kd 2h')).toBe(8);
  });

  it('treats the ace as low in a wheel, and a wheel loses to a six-high straight', () => {
    expect(category('As 2d 3h 4c 5s Kd 9h')).toBe(4);
    expect(evaluate(hand('As 2d 3h 4c 5s Kd 9h'))).toBeLessThan(
      evaluate(hand('2s 3d 4h 5c 6s Kd 9h')),
    );
  });

  it('ranks by kickers and picks the better full house', () => {
    expect(evaluate(hand('As Ad Kh 7c 5s 3d 2h'))).toBeGreaterThan(
      evaluate(hand('As Ad Qh 7c 5s 3d 2h')),
    );
    // Two sets of trips: the higher trips lead and the lower set plays as the pair.
    expect(evaluate(hand('Ks Kd Kh 7c 7s 7d 2h'))).toBe(evaluate(hand('Ks Kd Kh 7c 7s 2d 3h')));
  });

  it('a flush beats a straight and quads beat a full house', () => {
    expect(evaluate(hand('As Ks 9s 7s 5s 4d 3h'))).toBeGreaterThan(
      evaluate(hand('9s 8d 7h 6c 5s Kd 2h')),
    );
    expect(evaluate(hand('As Ad Ah Ac 5s 3d 2h'))).toBeGreaterThan(
      evaluate(hand('As Ad Ah 7c 7s 3d 2h')),
    );
  });

  it('breaks an all-board tie', () => {
    expect(evaluate(hand('As Kd Qh Jc Ts 3d 2h'))).toBe(evaluate(hand('As Kd Qh Jc Ts 4d 5h')));
  });
});

/** Chips in play: stacks, plus what is still in the pot. After a showdown the pot has been paid into stacks. */
const totalChips = (s: PokerState) =>
  s.players.reduce((sum, p) => sum + p.stack + (s.street === 'showdown' ? 0 : p.committed), 0);

function table(stacks: number[]): PokerState {
  return createState(
    stacks.map((stack, i) => ({ name: `P${String(i)}`, isHuman: i === 0, seatIndex: i, stack })),
  );
}

/** Play the current hand to the end with a simple caller/folder mix. */
function finishHand(s: PokerState, rng: () => number) {
  for (let guard = 0; guard < 200 && s.street !== 'showdown'; guard++) {
    act(s, botDecision(s, rng, 1));
  }
}

describe('poker engine', () => {
  it('posts blinds, deals two cards each and starts action after the big blind', () => {
    const s = table([100, 100, 100, 100]);
    startHand(s, seededRng(1));
    const bets = s.players.map((p) => p.bet).sort();
    expect(bets).toEqual([0, 0, 1, 2]);
    expect(s.players.every((p) => p.hole?.length === 2)).toBe(true);
    const bbIndex = s.players.findIndex((p) => p.bet === BIG_BLIND);
    expect(s.toAct).toBe((bbIndex + 1) % 4);
    expect(legalActions(s)?.callAmount).toBe(BIG_BLIND);
  });

  it('ends the hand when everyone folds to a raise', () => {
    const s = table([100, 100, 100]);
    startHand(s, seededRng(2));
    act(s, { type: 'raise', to: 10 });
    act(s, { type: 'fold' });
    act(s, { type: 'fold' });
    expect(s.street).toBe('showdown');
    expect(s.revealed).toBe(false);
    expect(s.awards).toHaveLength(1);
    expect(totalChips(s)).toBe(300);
  });

  it('turns an illegal fold into a check when there is nothing to call', () => {
    const s = table([100, 100, 100]);
    startHand(s, seededRng(3));
    act(s, { type: 'call' });
    act(s, { type: 'call' });
    // Big blind has the option and checks even though the action was "fold".
    const before = s.players.filter((p) => !p.folded).length;
    act(s, { type: 'fold' });
    expect(s.players.filter((p) => !p.folded).length).toBe(before);
    expect(s.street).toBe('flop');
    expect(s.board).toHaveLength(3);
  });

  it('runs the board out when everyone is all-in and pays side pots', () => {
    const s = table([20, 50, 100]);
    startHand(s, seededRng(4));
    for (let i = 0; i < 10 && s.street === 'preflop'; i++) act(s, { type: 'raise', to: 1000 });
    expect(s.street).toBe('showdown');
    expect(s.board).toHaveLength(5);
    expect(totalChips(s)).toBe(170);
    // Nobody can win more than the contributions they were eligible for: the deepest stack always
    // gets back at least its uncalled 50.
    expect(s.players[2]?.stack ?? 0).toBeGreaterThanOrEqual(50);
  });

  it('never creates or loses chips over thousands of random hands', () => {
    const rng = seededRng(99);
    const s = table([100, 100, 100, 100, 100]);
    let hands = 0;
    for (let i = 0; i < 3000; i++) {
      for (const p of s.players) if (p.stack < BIG_BLIND) p.stack = 100;
      const before = totalChips(s);
      if (!startHand(s, rng)) break;
      finishHand(s, rng);
      expect(totalChips(s)).toBe(before);
      expect(s.street).toBe('showdown');
      expect(potOf(s)).toBeGreaterThan(0);
      hands++;
    }
    expect(hands).toBe(3000);
  });

  it('plays heads-up, with the button posting the small blind', () => {
    const s = table([100, 100]);
    startHand(s, seededRng(5));
    const button = s.players[s.button];
    expect(button?.bet).toBe(1);
    expect(s.toAct).toBe(s.button);
  });
});

describe('poker session', () => {
  const wallet = () => ({ buyIn: vi.fn(() => true), cashOut: vi.fn() });

  it('picks bot seats furthest from the player, in table order', () => {
    const table1 = anchors.find((a) => a.id === 'poker.table2');
    if (!table1) throw new Error('missing table');
    const seats = pickSeats(
      table1.seats.map((s) => s.position),
      2,
      4,
    );
    expect(seats).toHaveLength(5);
    expect(seats).toContain(2);
    expect([...seats].sort((a, b) => a - b)).toEqual(seats);
  });

  it('lays cards and chips out between every seat and the middle of the table', () => {
    const anchor = anchors.find((a) => a.id === 'poker.table3');
    if (!anchor) throw new Error('missing table');
    const layout = buildLayout({
      gameId: 'g',
      anchorId: anchor.id,
      tablePosition: anchor.position,
      seats: anchor.seats,
      seatIndex: 0,
    });
    for (const spots of layout.seats) {
      const dist = (p: { x: number; z: number }) =>
        Math.hypot(p.x - layout.center.x, p.z - layout.center.z);
      expect(dist(spots.bet)).toBeLessThan(dist(spots.hole));
      expect(dist(spots.hole)).toBeLessThan(dist(spots.seat));
    }
  });

  it('cashes the remaining stack out exactly once when the player leaves', () => {
    vi.useFakeTimers();
    const w = wallet();
    const session = new PokerSession([0, 1, 2], 0, w, seededRng(7));
    vi.advanceTimersByTime(1300);
    expect(session.state.street).not.toBe('waiting');
    session.close();
    session.close();
    expect(w.cashOut).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60_000);
    vi.useRealTimers();
  });

  it('lets bots play a whole hand on their own timers while the player folds', () => {
    vi.useFakeTimers();
    const session = new PokerSession([0, 1, 2], 0, wallet(), seededRng(11));
    for (let i = 0; i < 400 && session.state.handNumber < 3; i++) {
      vi.advanceTimersByTime(600);
      if (session.legal) session.act({ type: 'fold' });
    }
    expect(session.state.handNumber).toBeGreaterThanOrEqual(3);
    session.close();
    vi.useRealTimers();
  });
});

describe('scene games skip the launch URL', () => {
  it('returns ready without asking the adapter for a URL', async () => {
    const getGameLaunchUrl = vi.fn(() => Promise.resolve('x'));
    const result = await prepareLaunch(
      {
        getSession: () =>
          Promise.resolve({
            playerId: 'p',
            displayName: 'P',
            currency: 'GEL',
            balance: 1,
            isAuthenticated: true,
          }),
        getGameLaunchUrl,
      },
      'g',
      { locale: 'en', device: 'desktop', timeoutMs: 50 },
      { launchUrl: false },
    );
    expect(result.status).toBe('ready');
    expect(getGameLaunchUrl).not.toHaveBeenCalled();
  });
});
