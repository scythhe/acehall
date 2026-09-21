import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { applyDefaults } from '../config/defaults';
import { AceHallRoot } from '../scene/AceHallRoot';
import { createLobbyStore } from './store';
import type { AceHallConfig, Locale, OperatorAdapter } from './types';

export function mountAceHall(
  target: HTMLElement,
  options: { config: AceHallConfig; adapter: OperatorAdapter },
): { unmount(): void; setLocale(l: Locale): void; openGameList(): void } {
  const config = applyDefaults(options.config);
  const store = createLobbyStore(config);

  const container = document.createElement('div');
  container.setAttribute('data-acehall', '');
  container.style.width = '100%';
  container.style.height = '100%';
  target.appendChild(container);

  const root = createRoot(container);
  root.render(
    <StrictMode>
      <AceHallRoot config={config} />
    </StrictMode>,
  );

  let mounted = true;

  return {
    unmount() {
      if (!mounted) return;
      mounted = false;
      root.unmount();
      container.remove();
    },
    setLocale(locale) {
      store.getState().setLocale(locale);
    },
    openGameList() {
      store.getState().openGameList();
    },
  };
}
