import { rankOf, suitOf, type Rng } from './cards';
import { evaluate, handCategory } from './evaluate';
import { legalActions, potOf, type Action, type PokerState } from './engine';

/** Rough 0..1 strength of two hole cards. */
function preflopStrength(a: number, b: number): number {
  const high = Math.max(rankOf(a), rankOf(b));
  const low = Math.min(rankOf(a), rankOf(b));
  let strength = (high + low / 2) / 21;
  if (high === low) strength = 0.55 + high / 35;
  if (suitOf(a) === suitOf(b)) strength += 0.05;
  if (high - low === 1) strength += 0.04;
  return Math.min(1, strength);
}

/** Rough 0..1 strength of the best hand made from hole cards and board. */
function madeStrength(hole: readonly number[], board: readonly number[]): number {
  const score = evaluate([...hole, ...board]);
  const category = handCategory(score);
  const topRank = Math.max(...hole.map(rankOf));
  const base = [0.12, 0.42, 0.68, 0.78, 0.85, 0.88, 0.94, 0.98, 1][category] ?? 0;
  return category === 0 ? base + topRank / 100 : base;
}

/**
 * A simple, slightly randomised player: plays by hand strength and pot odds, sometimes bluffs.
 * `style` around 1 is average; higher is looser and more aggressive.
 */
export function botDecision(s: PokerState, rng: Rng, style = 1): Action {
  const legal = legalActions(s);
  const p = s.players[s.toAct];
  if (!legal || !p?.hole) return { type: 'call' };

  const strength =
    s.board.length === 0 ? preflopStrength(...p.hole) : madeStrength(p.hole, s.board);
  const pot = potOf(s);
  const odds = legal.callAmount / (pot + legal.callAmount || 1);
  const noise = (rng() - 0.5) * 0.2;
  const score = strength * style + noise;
  const bluff = rng() < 0.06 * style;

  const raiseTo = (fraction: number) => {
    const target = s.currentBet + Math.max(s.lastRaise, Math.round(pot * fraction));
    return { type: 'raise', to: target } as const;
  };

  if (legal.canRaise && (score > 0.78 || bluff) && rng() < 0.75) {
    return raiseTo(score > 0.9 ? 0.9 : 0.55);
  }
  if (legal.canCheck) {
    return legal.canRaise && score > 0.6 && rng() < 0.35 ? raiseTo(0.5) : { type: 'call' };
  }
  // Facing a bet: continue when the hand is worth the price.
  if (score + 0.15 > odds * 1.6 + 0.2) return { type: 'call' };
  return { type: 'fold' };
}
