import { createContext, useContext } from 'react';
import { useStore } from 'zustand';
import type { LobbyState, LobbyStore } from './store';

export const LobbyStoreContext = createContext<LobbyStore | null>(null);

export function useLobby<T>(selector: (state: LobbyState) => T): T {
  const store = useContext(LobbyStoreContext);
  if (!store) throw new Error('useLobby must be used inside <AceHallRoot>');
  return useStore(store, selector);
}
