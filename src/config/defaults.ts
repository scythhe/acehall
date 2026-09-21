import type { AceHallConfig } from '../lib/types';

export type ZoneId = keyof NonNullable<AceHallConfig['zones']>;

export const ZONE_IDS: readonly ZoneId[] = [
  'slots',
  'tables',
  'liveDealer',
  'vip',
  'bar',
  'cashier',
];

/** Config with every optional field that AceHall relies on filled in. */
export interface ResolvedConfig extends AceHallConfig {
  brand: AceHallConfig['brand'] & { showPoweredBy: boolean };
  zones: Record<ZoneId, { enabled: boolean }>;
  gameList: NonNullable<AceHallConfig['gameList']>;
  quality: NonNullable<AceHallConfig['quality']>;
  audio: NonNullable<AceHallConfig['audio']>;
}

export const DEFAULT_GAME_LIST: ResolvedConfig['gameList'] = {
  enabled: true,
  selectBehavior: 'walk-to',
};

export const DEFAULT_AUDIO: ResolvedConfig['audio'] = {
  enabledByDefault: false,
  volume: 0.7,
};

export function applyDefaults(config: AceHallConfig): ResolvedConfig {
  const zones = Object.fromEntries(
    ZONE_IDS.map((id) => [id, { enabled: config.zones?.[id]?.enabled ?? true }]),
  ) as Record<ZoneId, { enabled: boolean }>;

  return {
    ...config,
    brand: { ...config.brand, showPoweredBy: config.brand.showPoweredBy ?? true },
    zones,
    gameList: config.gameList ?? DEFAULT_GAME_LIST,
    quality: config.quality ?? 'auto',
    audio: config.audio ?? DEFAULT_AUDIO,
  };
}
