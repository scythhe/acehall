import { createStore } from 'zustand/vanilla';
import type { ResolvedConfig } from '../config/defaults';
import type { Locale } from './types';

export interface LobbyState {
  locale: Locale;
  gameListOpen: boolean;
  setLocale(locale: Locale): void;
  openGameList(): void;
}

/** One store per mounted lobby, so several AceHall instances on a page stay independent. */
export function createLobbyStore(config: ResolvedConfig) {
  return createStore<LobbyState>()((set) => ({
    locale: config.locale.default,
    gameListOpen: false,
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
  }));
}

export type LobbyStore = ReturnType<typeof createLobbyStore>;
