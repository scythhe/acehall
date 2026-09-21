import type { AceHallConfig, InteractiveObjectConfig, ObjectKind } from '../lib/types';
import { anchors } from '../scene/anchors/anchors';

const LABELS: Record<ObjectKind, string> = {
  slot: 'Slot',
  blackjack: 'Blackjack',
  roulette: 'Roulette',
  baccarat: 'Baccarat',
  'live-dealer': 'Live Dealer',
  poker: 'Poker',
};

/** Every anchor gets a placeholder game so all object kinds can be tried. Real demo games arrive in Phase 3. */
const objects: InteractiveObjectConfig[] = anchors.flatMap((anchor) => {
  if (anchor.kind === 'cashier') return [];
  const number = anchor.id
    .split('.')
    .slice(1)
    .join('.')
    .replace(/^(table|booth|row)/, '');
  return [
    {
      anchorId: anchor.id,
      gameId: `demo-${anchor.kind}`,
      kind: anchor.kind,
      displayName: `${LABELS[anchor.kind]} ${number}`,
    },
  ];
});

export const demoConfig: AceHallConfig = {
  brand: {
    name: 'Demo Casino',
    colors: {
      primary: '#7b2cbf',
      accent: '#f2c14e',
      neon: '#ff3caa',
      carpet: '#3a0d2e',
      uiBackground: '#0b0710',
      uiText: '#f5f0ff',
    },
    showPoweredBy: true,
  },
  locale: { default: 'en', available: ['ka', 'en', 'ru'] },
  objects,
  allowedGameOrigins: [window.location.origin],
};
