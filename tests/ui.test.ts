// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { formatMoney } from '../src/i18n/format';
import { translate } from '../src/i18n';
import { STRINGS } from '../src/i18n/strings';
import { buildGameEntries, filterEntries, groupEntries } from '../src/ui/gameListModel';
import { demoConfig } from '../src/demo/demoConfig';
import type { InteractiveObjectConfig } from '../src/lib/types';

const objects: InteractiveObjectConfig[] = [
  {
    anchorId: 'a1',
    gameId: 'bj',
    kind: 'blackjack',
    displayName: { en: 'Blackjack', ru: 'Блэкджек' },
  },
  { anchorId: 'a2', gameId: 'bj', kind: 'blackjack', displayName: 'Blackjack' },
  { anchorId: 'a3', gameId: 's1', kind: 'slot', displayName: 'Gem Rush', category: 'Featured' },
  { anchorId: 'a4', gameId: 's2', kind: 'slot', displayName: 'Fruit' },
];
const label = (k: string) => k.toUpperCase();

describe('game list model', () => {
  it('lists each game once, using the first anchor and the locale name', () => {
    const entries = buildGameEntries(objects, 'ru');
    expect(entries.map((e) => [e.gameId, e.anchorId, e.name])).toEqual([
      ['bj', 'a1', 'Блэкджек'],
      ['s1', 'a3', 'Gem Rush'],
      ['s2', 'a4', 'Fruit'],
    ]);
  });

  it('filters by name, category and kind label, ignoring case', () => {
    const entries = buildGameEntries(objects, 'en');
    expect(filterEntries(entries, 'gem', label).map((e) => e.gameId)).toEqual(['s1']);
    expect(filterEntries(entries, 'featured', label).map((e) => e.gameId)).toEqual(['s1']);
    expect(filterEntries(entries, 'SLOT', label).map((e) => e.gameId)).toEqual(['s1', 's2']);
    expect(filterEntries(entries, '  ', label)).toHaveLength(3);
    expect(filterEntries(entries, 'zzz', label)).toEqual([]);
  });

  it('groups by category, falling back to kind, in first-seen order', () => {
    const groups = groupEntries(buildGameEntries(objects, 'en'));
    expect(groups.map((g) => [g.key, g.kind, g.entries.length])).toEqual([
      ['blackjack', 'blackjack', 1],
      ['Featured', null, 1],
      ['slot', 'slot', 1],
    ]);
  });

  it('gives the demo config one entry per game', () => {
    const ids = buildGameEntries(demoConfig.objects, 'en').map((e) => e.gameId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(
      expect.arrayContaining(['demo-blackjack', 'demo-roulette', 'demo-slot-fruit', 'demo-poker']),
    );
  });
});

describe('formatMoney', () => {
  it('formats per locale and currency', () => {
    expect(formatMoney(1234.5, 'GEL', 'en')).toContain('1,234.50');
    expect(formatMoney(1234.5, 'USD', 'en')).toBe('$1,234.50');
    expect(formatMoney(1234.5, 'GEL', 'ru')).toMatch(/1\s234,50/);
  });

  it('falls back for an invalid currency code', () => {
    expect(formatMoney(5, 'not-a-currency', 'en')).toBe('5.00 not-a-currency');
  });
});

describe('strings', () => {
  it('has every key in every locale', () => {
    const keys = Object.keys(STRINGS.en).sort();
    expect(Object.keys(STRINGS.ka).sort()).toEqual(keys);
    expect(Object.keys(STRINGS.ru).sort()).toEqual(keys);
  });

  it('fills variables', () => {
    expect(translate('en', 'game.loading', { name: 'Gem Rush' })).toBe('Loading Gem Rush…');
  });
});
