import type { Locale } from '../lib/types';

/** Format a display-only balance for the locale. Falls back to a plain number if the currency code is invalid. */
export function formatMoney(amount: number, currency: string, locale: Locale): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
  } catch {
    return `${new Intl.NumberFormat(locale, { minimumFractionDigits: 2 }).format(amount)} ${currency}`;
  }
}
