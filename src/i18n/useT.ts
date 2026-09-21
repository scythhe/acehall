import { useCallback } from 'react';
import { useLobby } from '../lib/storeContext';
import { translate } from './index';
import type { StringKey } from './strings';

/** Translator bound to the lobby's current locale and the operator's string overrides. */
export function useT() {
  const locale = useLobby((s) => s.locale);
  const overrides = useLobby((s) => s.stringOverrides);
  return useCallback(
    (key: StringKey, vars?: Record<string, string>) => translate(locale, key, vars, overrides),
    [locale, overrides],
  );
}
