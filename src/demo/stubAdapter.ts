import type { OperatorAdapter } from '../lib/types';

/** Placeholder until the full demo adapter lands in Phase 3. */
export const stubAdapter: OperatorAdapter = {
  getSession: () =>
    Promise.resolve({
      playerId: 'demo-player',
      displayName: 'Guest',
      currency: 'GEL',
      balance: 1000,
      isAuthenticated: false,
    }),
  getGameLaunchUrl: (gameId) =>
    Promise.reject(new Error(`No launch URL for "${gameId}": games arrive in Phase 3.`)),
  onEvent: (event) => {
    console.info('[AceHall event]', event);
  },
  openCashier: () => {
    console.info('[AceHall] openCashier');
  },
};
