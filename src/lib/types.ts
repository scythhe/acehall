export type Locale = 'ka' | 'en' | 'ru';

export type ObjectKind = 'slot' | 'blackjack' | 'roulette' | 'baccarat' | 'live-dealer' | 'poker';

export interface PlayerSession {
  playerId: string;
  displayName: string;
  currency: string; // ISO 4217, e.g. 'GEL'
  balance: number; // display only
  isAuthenticated: boolean;
}

export interface PlayerLimitsState {
  canPlay: boolean;
  reason?: string; // operator-supplied message shown if canPlay is false
}

export type AceHallEvent =
  | { type: 'lobby_loaded'; loadMs: number; qualityTier: string }
  | { type: 'zone_entered'; zone: string }
  | { type: 'object_interacted'; anchorId: string; gameId: string }
  | { type: 'game_opened'; gameId: string }
  | { type: 'game_closed'; gameId: string; durationMs: number }
  | { type: 'game_list_opened' };

export interface OperatorAdapter {
  getSession(): Promise<PlayerSession>;
  getGameLaunchUrl(
    gameId: string,
    ctx: { locale: Locale; device: 'desktop' | 'mobile' },
  ): Promise<string>;
  subscribeBalance?(cb: (balance: number) => void): () => void;
  getPlayerLimitsState?(gameId: string): Promise<PlayerLimitsState>;
  onEvent?(event: AceHallEvent): void;
  /** Called when the player tries to play while not authenticated. */
  requestLogin?(): void;
  /** Called when the player clicks the cashier desk. */
  openCashier?(): void;
}

export interface InteractiveObjectConfig {
  anchorId: string;
  gameId: string;
  kind: ObjectKind;
  displayName: string | Partial<Record<Locale, string>>;
  thumbnailUrl?: string;
  category?: string;
}

export interface AceHallConfig {
  brand: {
    name: string; // the operator's brand
    logoUrl?: string; // applied to in-scene signage textures
    colors: {
      primary: string;
      accent: string;
      neon: string;
      carpet: string;
      uiBackground: string;
      uiText: string;
    };
    loadingScreen?: { backgroundUrl?: string; tagline?: string };
    showPoweredBy?: boolean; // "Powered by AceHall" credit
  };
  locale: {
    default: Locale;
    available: Locale[];
    overrides?: Partial<Record<Locale, Record<string, string>>>;
  };
  zones?: Partial<
    Record<'slots' | 'tables' | 'liveDealer' | 'vip' | 'bar' | 'cashier', { enabled: boolean }>
  >;
  objects: InteractiveObjectConfig[];
  gameList?: { enabled: boolean; selectBehavior: 'walk-to' | 'open-directly' };
  quality?: 'auto' | 'low' | 'medium' | 'high';
  audio?: { enabledByDefault: boolean; volume: number };
  allowedGameOrigins: string[]; // postMessage origin allowlist
}
