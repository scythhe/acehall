import { createElement } from 'react';
import type { SceneGame } from '../../scene/games/sceneGame';
import { seededRng } from './cards';
import { PokerControls } from './PokerControls';
import { PokerScene } from './PokerScene';
import { buildLayout } from './layout';
import { BOT_COUNT, BUY_IN, PokerSession, pickSeats, type Wallet } from './session';

/** The demo's poker game, played on the table in the 3D scene against bots. Play money only. */
export function createPokerSceneGame(wallet: Wallet): SceneGame {
  return {
    open(context) {
      if (!wallet.buyIn(BUY_IN)) throw new Error('Not enough balance for the buy-in.');
      const layout = buildLayout(context);
      const seatIndexes = pickSeats(
        context.seats.map((seat) => seat.position),
        context.seatIndex,
        BOT_COUNT,
      );
      const session = new PokerSession(
        seatIndexes,
        context.seatIndex,
        wallet,
        seededRng(Date.now()),
      );
      return {
        Scene: () => createElement(PokerScene, { session, layout }),
        Controls: ({ onLeave, colors }) =>
          createElement(PokerControls, { session, colors, onLeave }),
        close: () => {
          session.close();
        },
      };
    },
  };
}
