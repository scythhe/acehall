import { useEffect, useEffectEvent, useRef, useState, type CSSProperties } from 'react';
import type { ResolvedConfig } from '../config/defaults';
import { useT } from '../i18n/useT';
import type { GameSession } from '../lib/store';
import { TUNING } from '../tuning';
import { createBridgeHandler } from './bridge';

interface Props {
  game: GameSession;
  name: string;
  colors: ResolvedConfig['brand']['colors'];
  allowedOrigins: readonly string[];
  onClose(): void;
  onRetry(): void;
  onBalanceChanged(): void;
}

/** The operator's game in a sandboxed iframe, or the reason it did not start. Covers the whole lobby. */
export function GameOverlay({
  game,
  name,
  colors,
  allowedOrigins,
  onClose,
  onRetry,
  onBalanceChanged,
}: Props) {
  const t = useT();
  const wrapper = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [shown, setShown] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const handleClose = useEffectEvent(onClose);
  const handleBalanceChanged = useEffectEvent(onBalanceChanged);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setShown(true);
    });
    return () => {
      cancelAnimationFrame(frameId);
    };
  }, []);

  // Esc closes. The input handler ignores keys typed inside [data-acehall-modal].
  useEffect(() => {
    const el = wrapper.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    el.addEventListener('keydown', onKeyDown);
    return () => {
      el.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  useEffect(() => {
    const handler = createBridgeHandler({
      allowedOrigins,
      frameWindow: () => frame.current?.contentWindow ?? null,
      onClose: () => {
        handleClose();
      },
      onBalanceChanged: () => {
        handleBalanceChanged();
      },
    });
    window.addEventListener('message', handler);
    return () => {
      window.removeEventListener('message', handler);
    };
  }, [allowedOrigins]);

  const text = colors.uiText;
  const panel: CSSProperties = {
    position: 'absolute',
    inset:
      'max(env(safe-area-inset-top), 2.5vh) max(env(safe-area-inset-right), 2.5vw) max(env(safe-area-inset-bottom), 2.5vh) max(env(safe-area-inset-left), 2.5vw)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderRadius: 14,
    border: `1px solid ${colors.accent}55`,
    background: colors.uiBackground,
    color: text,
    boxShadow: `0 0 40px ${colors.neon}44`,
  };

  const notice = (title: string, detail?: string, retry?: boolean) => (
    <div style={centered}>
      <strong style={{ fontSize: 20 }}>{title}</strong>
      {detail && <span style={{ opacity: 0.75, maxWidth: 520 }}>{detail}</span>}
      {retry && (
        <button type="button" style={button(colors.accent, text)} onClick={onRetry}>
          {t('game.retry')}
        </button>
      )}
    </div>
  );

  return (
    <div
      ref={wrapper}
      tabIndex={-1}
      data-acehall-modal=""
      role="dialog"
      aria-modal="true"
      aria-label={name}
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.72)',
        pointerEvents: 'auto',
        outline: 'none',
        opacity: shown ? 1 : 0,
        transition: `opacity ${String(TUNING.overlay.fadeMs)}ms ease-out`,
      }}
    >
      <div style={panel}>
        <div style={header}>
          <strong
            style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {name}
          </strong>
          <button type="button" style={button(colors.accent, text)} onClick={onClose}>
            {t('game.close')}
          </button>
        </div>
        <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
          {game.status === 'open' && game.url && (
            <>
              <iframe
                ref={frame}
                src={game.url}
                title={t('game.frameTitle', { name })}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                allow="fullscreen; autoplay"
                onLoad={() => {
                  setLoaded(true);
                }}
                style={{ width: '100%', height: '100%', border: 0, background: '#000' }}
              />
              {!loaded && (
                <div style={{ ...centered, position: 'absolute', inset: 0 }}>
                  {t('game.loading', { name })}
                </div>
              )}
            </>
          )}
          {game.status === 'preparing' && notice(t('game.loading', { name }))}
          {game.status === 'blocked' && notice(t('game.cannotPlay'), game.message)}
          {game.status === 'login' && notice(t('game.loginRequired'))}
          {game.status === 'error' && notice(t('game.error'), game.message, true)}
        </div>
      </div>
    </div>
  );
}

const header: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '8px 12px',
  fontSize: 15,
};

const centered: CSSProperties = {
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 14,
  padding: 24,
  textAlign: 'center',
};

const button = (accent: string, text: string): CSSProperties => ({
  padding: '7px 16px',
  border: `1px solid ${accent}`,
  borderRadius: 8,
  background: 'transparent',
  color: text,
  font: 'inherit',
  cursor: 'pointer',
});
