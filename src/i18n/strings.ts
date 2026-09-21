import type { Locale } from '../lib/types';

const en = {
  'prompt.play': 'Press E to play {name}',
  'prompt.playTouch': 'Tap to play {name}',
  'prompt.cashier': 'Press E to open the cashier',
  'prompt.cashierTouch': 'Tap to open the cashier',
  'seated.leave': 'Leave',
  'seated.hint': 'Press E to leave',
};

export type StringKey = keyof typeof en;

export const STRINGS: Record<Locale, Record<StringKey, string>> = {
  en,
  ka: {
    'prompt.play': 'დააჭირეთ E-ს სათამაშოდ: {name}',
    'prompt.playTouch': 'შეეხეთ სათამაშოდ: {name}',
    'prompt.cashier': 'დააჭირეთ E-ს სალაროს გასახსნელად',
    'prompt.cashierTouch': 'შეეხეთ სალაროს გასახსნელად',
    'seated.leave': 'გასვლა',
    'seated.hint': 'გასასვლელად დააჭირეთ E-ს',
  },
  ru: {
    'prompt.play': 'Нажмите E, чтобы играть: {name}',
    'prompt.playTouch': 'Нажмите, чтобы играть: {name}',
    'prompt.cashier': 'Нажмите E, чтобы открыть кассу',
    'prompt.cashierTouch': 'Нажмите, чтобы открыть кассу',
    'seated.leave': 'Выйти',
    'seated.hint': 'Нажмите E, чтобы выйти',
  },
};
