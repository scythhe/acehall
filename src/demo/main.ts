import { mountAceHall } from '../lib';
import { registerSceneGame } from '../scene/games/sceneGame';
import { createDemoAdapter } from './demoAdapter';
import { demoConfig } from './demoConfig';
import { createPokerSceneGame } from './poker';

const target = document.getElementById('app');
if (!target) throw new Error('Demo page is missing the #app element.');

// ?guest simulates a signed-out player; ?limit=<text> simulates an operator play limit.
const params = new URLSearchParams(window.location.search);
const limit = params.get('limit');
const adapter = createDemoAdapter({
  guest: params.has('guest'),
  ...(limit === null ? {} : { limitReason: limit || 'Play limit reached.' }),
});

// Poker is played on the table in the 3D scene; the other demo games open in the overlay.
registerSceneGame('demo-poker', createPokerSceneGame(adapter.wallet));

mountAceHall(target, { config: demoConfig, adapter });
