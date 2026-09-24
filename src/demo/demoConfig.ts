import type { AceHallConfig, InteractiveObjectConfig, Locale } from '../lib/types';
import { anchors } from '../scene/anchors/anchors';
import type { Anchor } from '../scene/anchors/types';

type Names = Partial<Record<Locale, string>>;

interface DemoGame {
  gameId: string;
  displayName: Names;
}

const NAMES = {
  blackjack: { en: 'Blackjack', ka: 'ბლექჯეკი', ru: 'Блэкджек' },
  roulette: { en: 'Roulette', ka: 'რულეტი', ru: 'Рулетка' },
  baccarat: { en: 'Baccarat', ka: 'ბაკარა', ru: 'Баккара' },
  poker: { en: 'Poker', ka: 'პოკერი', ru: 'Покер' },
  live: { en: 'Live Dealer', ka: 'ლაივ დილერი', ru: 'Лайв-дилер' },
} satisfies Record<string, Names>;

const SLOTS: readonly DemoGame[] = [
  {
    gameId: 'demo-slot-fruit',
    displayName: { en: 'Fruit Frenzy', ka: 'ხილის ტალღა', ru: 'Фруктовый вихрь' },
  },
  {
    gameId: 'demo-slot-gems',
    displayName: { en: 'Gem Rush', ka: 'ძვირფასი ქვები', ru: 'Гонка самоцветов' },
  },
  {
    gameId: 'demo-slot-neon',
    displayName: { en: 'Neon Sevens', ka: 'ნეონ სამიანები', ru: 'Неоновые семёрки' },
  },
];

/** Placeholder games for everything except slots; slot rows rotate through the three themes. */
function gameFor(anchor: Anchor): DemoGame {
  switch (anchor.kind) {
    case 'slot': {
      const row = Number(anchor.id.split('.')[1]?.replace('row', '') ?? 1);
      return SLOTS[(row - 1) % SLOTS.length] ?? SLOTS[0] ?? { gameId: '', displayName: {} };
    }
    case 'blackjack':
      return { gameId: 'demo-blackjack', displayName: NAMES.blackjack };
    case 'roulette':
      return { gameId: 'demo-roulette', displayName: NAMES.roulette };
    case 'baccarat':
      return { gameId: 'demo-baccarat', displayName: NAMES.baccarat };
    case 'poker':
      return { gameId: 'demo-poker', displayName: NAMES.poker };
    default:
      return { gameId: 'demo-live', displayName: NAMES.live };
  }
}

/** Every anchor gets a game so all object kinds can be tried. */
const objects: InteractiveObjectConfig[] = anchors.flatMap((anchor) => {
  if (anchor.kind === 'cashier') return [];
  const { gameId, displayName } = gameFor(anchor);
  return [{ anchorId: anchor.id, gameId, kind: anchor.kind, displayName }];
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
