import { describe, expect, it } from 'vitest';
import { applyDefaults, DEFAULT_AUDIO, DEFAULT_GAME_LIST, ZONE_IDS } from '../src/config/defaults';
import { createLobbyStore } from '../src/lib/store';
import type { AceHallConfig } from '../src/lib/types';

const baseConfig: AceHallConfig = {
  brand: {
    name: 'Test Brand',
    colors: {
      primary: '#000',
      accent: '#111',
      neon: '#222',
      carpet: '#333',
      uiBackground: '#444',
      uiText: '#fff',
    },
  },
  locale: { default: 'ka', available: ['ka', 'en'] },
  objects: [],
  allowedGameOrigins: ['https://games.example.com'],
};

describe('applyDefaults', () => {
  it('fills every optional field', () => {
    const config = applyDefaults(baseConfig);
    expect(config.brand.showPoweredBy).toBe(true);
    expect(config.quality).toBe('auto');
    expect(config.gameList).toEqual(DEFAULT_GAME_LIST);
    expect(config.audio).toEqual(DEFAULT_AUDIO);
    for (const id of ZONE_IDS) expect(config.zones[id].enabled).toBe(true);
  });

  it('keeps values the operator supplied', () => {
    const config = applyDefaults({
      ...baseConfig,
      brand: { ...baseConfig.brand, showPoweredBy: false },
      zones: { vip: { enabled: false } },
      gameList: { enabled: false, selectBehavior: 'open-directly' },
      quality: 'low',
      audio: { enabledByDefault: true, volume: 0.2 },
    });
    expect(config.brand.showPoweredBy).toBe(false);
    expect(config.zones.vip.enabled).toBe(false);
    expect(config.zones.slots.enabled).toBe(true);
    expect(config.gameList.selectBehavior).toBe('open-directly');
    expect(config.quality).toBe('low');
    expect(config.audio.volume).toBe(0.2);
  });
});

describe('createLobbyStore', () => {
  it('starts on the default locale and only accepts available locales', () => {
    const store = createLobbyStore(applyDefaults(baseConfig));
    expect(store.getState().locale).toBe('ka');
    store.getState().setLocale('en');
    expect(store.getState().locale).toBe('en');
    store.getState().setLocale('ru');
    expect(store.getState().locale).toBe('en');
  });

  it('opens the game list only when it is enabled', () => {
    const enabled = createLobbyStore(applyDefaults(baseConfig));
    enabled.getState().openGameList();
    expect(enabled.getState().gameListOpen).toBe(true);

    const disabled = createLobbyStore(
      applyDefaults({ ...baseConfig, gameList: { enabled: false, selectBehavior: 'walk-to' } }),
    );
    disabled.getState().openGameList();
    expect(disabled.getState().gameListOpen).toBe(false);
  });
});
