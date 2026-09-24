import type { CSSProperties } from 'react';
import { formatMoney } from '../i18n/format';
import { useT } from '../i18n/useT';
import { useLobby } from '../lib/storeContext';
import type { Locale } from '../lib/types';
import { Settings } from './Settings';
import { buttonStyle, panelStyle, type Colors } from './uiStyles';

interface Props {
  colors: Colors;
  locales: readonly Locale[];
  gameListEnabled: boolean;
}

const edge = 'max(env(safe-area-inset-top), 12px)';

/** Display name and balance top-left, game list and settings top-right. Nothing sits in the screen centre. */
export function Hud({ colors, locales, gameListEnabled }: Props) {
  const t = useT();
  const session = useLobby((s) => s.session);
  const locale = useLobby((s) => s.locale);
  const openGameList = useLobby((s) => s.openGameList);

  const bar: CSSProperties = {
    position: 'absolute',
    top: edge,
    left: 12,
    right: 12,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    pointerEvents: 'none',
  };
  const clickable: CSSProperties = { pointerEvents: 'auto' };

  return (
    <div style={bar}>
      <div
        style={{
          ...clickable,
          ...panelStyle(colors),
          padding: '6px 12px',
          display: 'flex',
          flexDirection: 'column',
          fontSize: 13,
          lineHeight: 1.3,
        }}
      >
        <strong>{session?.displayName ?? t('hud.guest')}</strong>
        {session && (
          <span aria-label={t('hud.balance')} style={{ color: colors.accent }}>
            {formatMoney(session.balance, session.currency, locale)}
          </span>
        )}
      </div>
      <div style={{ ...clickable, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        {gameListEnabled && (
          <button type="button" style={buttonStyle(colors)} onClick={openGameList}>
            {t('hud.gameList')}
          </button>
        )}
        <Settings colors={colors} locales={locales} />
      </div>
    </div>
  );
}
