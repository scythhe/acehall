import { createStore } from 'zustand/vanilla';
import type { ResolvedConfig } from '../config/defaults';
import type { Interactable } from '../interaction/types';
import type { InteractionPhase } from '../interaction/machine';
import type { SceneGameSession } from '../scene/games/sceneGame';
import type { AceHallConfig, Locale, PlayerSession } from './types';

/** A game being launched or shown in the overlay. */
export interface GameSession {
  gameId: string;
  /** `seat`: opened after sitting down, closing stands the avatar up. `direct`: opened from the game list. */
  source: 'seat' | 'direct';
  /** `blocked` = operator limits said no; `login` = player is not authenticated. */
  status: 'preparing' | 'open' | 'blocked' | 'login' | 'error';
  url?: string;
  /** `scene`: played on the table in the 3D scene; `overlay`: an iframe over the lobby. */
  presentation: 'overlay' | 'scene';
  /** The running in-scene game, once open. */
  scene?: SceneGameSession;
  /** Operator-supplied reason when blocked. */
  message?: string;
}

export type QualitySetting = NonNullable<AceHallConfig['quality']>;

export interface LobbyState {
  locale: Locale;
  gameListOpen: boolean;
  /** Anchor markers and collider wireframes. */
  debug: boolean;
  /** Operator string overrides for the UI (`config.locale.overrides`). Constant for a mounted lobby. */
  stringOverrides: NonNullable<AceHallConfig['locale']['overrides']>;
  /** What the avatar is close to and facing (drives the prompt and highlight). Null while busy. */
  focus: Interactable | null;
  interaction: { phase: InteractionPhase; target: Interactable | null };
  /** Display-only, mirrored from the operator adapter. */
  session: PlayerSession | null;
  game: GameSession | null;
  /** Stored for the quality tiers (Phase 6). */
  quality: QualitySetting;
  /** Stored for the audio system (Phase 4). */
  audio: { muted: boolean; volume: number };
  setSession(session: PlayerSession | null): void;
  setBalance(balance: number): void;
  setGame(game: GameSession | null): void;
  setQuality(quality: QualitySetting): void;
  setAudio(audio: Partial<{ muted: boolean; volume: number }>): void;
  setFocus(focus: Interactable | null): void;
  setInteraction(phase: InteractionPhase, target: Interactable | null): void;
  setLocale(locale: Locale): void;
  openGameList(): void;
  closeGameList(): void;
  toggleDebug(): void;
}

const hasDebugParam = () =>
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug');

/** Debug tools are on in dev builds, or in any build with `?debug` in the URL. */
export function debugToolsAvailable(): boolean {
  return import.meta.env.DEV || hasDebugParam();
}

/** One store per mounted lobby, so several AceHall instances on a page stay independent. */
export function createLobbyStore(config: ResolvedConfig) {
  return createStore<LobbyState>()((set) => ({
    locale: config.locale.default,
    gameListOpen: false,
    stringOverrides: config.locale.overrides ?? {},
    focus: null,
    session: null,
    game: null,
    quality: config.quality,
    audio: { muted: !config.audio.enabledByDefault, volume: config.audio.volume },
    setSession: (session) => {
      set({ session });
    },
    setBalance: (balance) => {
      set((state) => (state.session ? { session: { ...state.session, balance } } : state));
    },
    setGame: (game) => {
      set({ game });
    },
    setQuality: (quality) => {
      set({ quality });
    },
    setAudio: (audio) => {
      set((state) => ({ audio: { ...state.audio, ...audio } }));
    },
    interaction: { phase: 'free', target: null },
    setFocus: (focus) => {
      set({ focus });
    },
    setInteraction: (phase, target) => {
      set({ interaction: { phase, target } });
    },
    debug: hasDebugParam(),
    setLocale(locale) {
      if (!config.locale.available.includes(locale)) {
        console.warn(`[AceHall] Locale "${locale}" is not in config.locale.available; ignored.`);
        return;
      }
      set({ locale });
    },
    openGameList() {
      if (config.gameList.enabled) set({ gameListOpen: true });
    },
    closeGameList() {
      set({ gameListOpen: false });
    },
    toggleDebug() {
      set((state) => ({ debug: !state.debug }));
    },
  }));
}

export type LobbyStore = ReturnType<typeof createLobbyStore>;
