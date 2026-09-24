import { rankOf, suitOf, type Card } from './cards';

export const HAND_NAMES = [
  'High Card',
  'Pair',
  'Two Pair',
  'Three of a Kind',
  'Straight',
  'Flush',
  'Full House',
  'Four of a Kind',
  'Straight Flush',
] as const;

const BASE = 15;

/** category first, then up to five tiebreak ranks; larger score = better hand. */
const encode = (category: number, ranks: readonly number[]) => {
  let score = category;
  for (let i = 0; i < 5; i++) score = score * BASE + (ranks[i] ?? 0);
  return score;
};

export const handCategory = (score: number) => Math.floor(score / BASE ** 5);
export const handName = (score: number) => HAND_NAMES[handCategory(score)] ?? 'High Card';

/** Highest rank that ends a straight within `ranks` (a set of 2..14), or 0. The ace also plays low (wheel). */
function straightHigh(ranks: ReadonlySet<number>): number {
  for (let high = 14; high >= 5; high--) {
    let run = true;
    for (let r = high; r > high - 5; r--) {
      const rank = r === 1 ? 14 : r;
      if (!ranks.has(rank)) run = false;
    }
    if (run) return high;
  }
  return 0;
}

const descending = (ranks: Iterable<number>) => [...ranks].sort((a, b) => b - a);

/** Best five-card hand out of up to seven cards. */
export function evaluate(cards: readonly Card[]): number {
  const counts = new Map<number, number>();
  const bySuit: number[][] = [[], [], [], []];
  for (const card of cards) {
    const rank = rankOf(card);
    counts.set(rank, (counts.get(rank) ?? 0) + 1);
    bySuit[suitOf(card)]?.push(rank);
  }

  const flushRanks = bySuit.find((ranks) => ranks.length >= 5);
  if (flushRanks) {
    const high = straightHigh(new Set(flushRanks));
    if (high) return encode(8, [high]);
  }

  const groups = (n: number) => descending([...counts].filter(([, c]) => c === n).map(([r]) => r));
  const quads = groups(4);
  const trips = groups(3);
  const pairs = groups(2);
  const rest = (exclude: readonly number[]) =>
    descending([...counts.keys()].filter((r) => !exclude.includes(r)));

  const quad = quads[0];
  if (quad !== undefined) return encode(7, [quad, ...rest([quad]).slice(0, 1)]);

  const trip = trips[0];
  const pairForHouse = descending([...trips.slice(1), ...pairs])[0];
  if (trip !== undefined && pairForHouse !== undefined) return encode(6, [trip, pairForHouse]);

  if (flushRanks) return encode(5, descending(flushRanks).slice(0, 5));

  const straight = straightHigh(new Set(counts.keys()));
  if (straight) return encode(4, [straight]);

  if (trip !== undefined) return encode(3, [trip, ...rest([trip]).slice(0, 2)]);

  const [highPair, lowPair] = pairs;
  if (highPair !== undefined && lowPair !== undefined) {
    return encode(2, [highPair, lowPair, ...rest([highPair, lowPair]).slice(0, 1)]);
  }
  if (highPair !== undefined) return encode(1, [highPair, ...rest([highPair]).slice(0, 3)]);
  return encode(0, descending(counts.keys()).slice(0, 5));
}
