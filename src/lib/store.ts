import { createStore } from 'zustand/vanilla';
import type { ResolvedConfig } from '../config/defaults';
import type { Locale } from './types';

export interface LobbyState {
  locale: Locale;
  gameListOpen: boolean;
  /** Anchor markers and collider wireframes. */
  debug: boolean;
  setLocale(locale: Locale): void;
  openGameList(): void;
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
    toggleDebug() {
      set((state) => ({ debug: !state.debug }));
    },
  }));
}

export type LobbyStore = ReturnType<typeof createLobbyStore>;
