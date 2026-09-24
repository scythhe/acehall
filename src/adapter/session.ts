import { useEffect } from 'react';
import type { LobbyStore } from '../lib/store';
import type { OperatorAdapter } from '../lib/types';

/** Fetch the session through the adapter and put it in the store. Failures leave the previous session in place. */
export async function refreshSession(adapter: OperatorAdapter, store: LobbyStore): Promise<void> {
  try {
    store.getState().setSession(await adapter.getSession());
  } catch (error) {
    console.warn('[AceHall] adapter.getSession() failed', error);
  }
}

/** Load the session on mount and follow balance updates. The balance is display-only. */
export function useOperatorSession(adapter: OperatorAdapter, store: LobbyStore): void {
  useEffect(() => {
    void refreshSession(adapter, store);
    return adapter.subscribeBalance?.((balance) => {
      store.getState().setBalance(balance);
    });
  }, [adapter, store]);
}
