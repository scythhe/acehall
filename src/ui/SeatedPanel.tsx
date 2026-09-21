import type { CSSProperties } from 'react';
import type { ResolvedConfig } from '../config/defaults';
import { localizedName } from '../i18n';
import { useT } from '../i18n/useT';
import { useLobby } from '../lib/storeContext';

interface Props {
  colors: ResolvedConfig['brand']['colors'];
  onLeave(): void;
}

/**
 * Shown while seated. Placeholder for the game overlay (Phase 3): the operator's game will open above the canvas
 * and this panel becomes the overlay's close control.
 */
export function SeatedPanel({ colors, onLeave }: Props) {
  const { phase, target } = useLobby((s) => s.interaction);
  const locale = useLobby((s) => s.locale);
  const t = useT();
  if (phase !== 'seated' || !target) return null;

  const style: CSSProperties = {
    position: 'absolute',
    left: '50%',
    bottom: 24,
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '10px 16px',
    borderRadius: 12,
    background: `${colors.uiBackground}cc`,
    color: colors.uiText,
    pointerEvents: 'auto',
  };
  return (
    <div style={style}>
      <strong>{target.displayName ? localizedName(target.displayName, locale) : ''}</strong>
      <span style={{ opacity: 0.7, fontSize: 13 }}>{t('seated.hint')}</span>
      <button
        type="button"
        onClick={onLeave}
        style={{
          padding: '6px 14px',
          border: `1px solid ${colors.accent}`,
          borderRadius: 8,
          background: 'transparent',
          color: colors.uiText,
          font: 'inherit',
          cursor: 'pointer',
        }}
      >
        {t('seated.leave')}
      </button>
    </div>
  );
}
