/** A card is 0..51: `rank = 2 + (card % 13)` (2..14, ace high) and `suit = floor(card / 13)`. */
export type Card = number;

export const rankOf = (card: Card) => 2 + (card % 13);
export const suitOf = (card: Card) => Math.floor(card / 13);

const RANK_LABELS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
export const SUIT_LABELS = ['♠', '♥', '♦', '♣'] as const;

export const rankLabel = (card: Card) => RANK_LABELS[card % 13] ?? '?';
export const isRedSuit = (card: Card) => suitOf(card) === 1 || suitOf(card) === 2;

export type Rng = () => number;

/** Small seeded generator (mulberry32) so games and tests can be replayed. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffledDeck(rng: Rng): Card[] {
  const deck = Array.from({ length: 52 }, (_, i) => i);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = deck[i] ?? 0;
    deck[i] = deck[j] ?? 0;
    deck[j] = a;
  }
  return deck;
}
