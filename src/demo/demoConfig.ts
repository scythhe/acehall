import type { AceHallConfig } from '../lib/types';

export const demoConfig: AceHallConfig = {
  brand: {
    name: 'Demo Casino',
    colors: {
      primary: '#7b2cbf',
      accent: '#f2c14e',
      neon: '#ff3caa',
      carpet: '#3a0d2e',
      uiBackground: '#0b0710',
      uiText: '#f5f0ff',
    },
    showPoweredBy: true,
  },
  locale: { default: 'en', available: ['ka', 'en', 'ru'] },
  objects: [],
  allowedGameOrigins: [window.location.origin],
};
