import type { AceHallConfig, Locale } from '../lib/types';
import type { LocalizedName } from '../interaction/types';
import { STRINGS, type StringKey } from './strings';

type Overrides = NonNullable<AceHallConfig['locale']['overrides']>;

/** Look up a UI string: operator override, then the locale's string, then English. `{name}` style vars are filled in. */
export function translate(
  locale: Locale,
  key: StringKey,
  vars: Record<string, string> = {},
  overrides: Overrides = {},
): string {
  const template = overrides[locale]?.[key] ?? STRINGS[locale][key] ?? STRINGS.en[key];
  return template.replace(/\{(\w+)\}/g, (match, name: string) => vars[name] ?? match);
}

/** An operator-supplied display name in the current locale, falling back to English, then any translation. */
export function localizedName(name: LocalizedName, locale: Locale): string {
  if (typeof name === 'string') return name;
  return name[locale] ?? name.en ?? Object.values(name)[0] ?? '';
}
