import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from 'react';
import { useT } from '../../i18n/useT';
import type { StringKey } from '../../i18n/strings';
import { potOf } from './engine';
import { BUY_IN, type PokerSession } from './session';
import { buttonStyle, panelStyle, type Colors } from '../../ui/uiStyles';

const HAND_KEYS = [
  'poker.hand.0',
  'poker.hand.1',
  'poker.hand.2',
  'poker.hand.3',
  'poker.hand.4',
  'poker.hand.5',
  'poker.hand.6',
  'poker.hand.7',
  'poker.hand.8',
] as const satisfies readonly StringKey[];

interface Props {
  session: PokerSession;
  colors: Colors;
  onLeave(): void;
}

/** Action bar along the bottom edge: the table itself stays the star. */
export function PokerControls({ session, colors, onLeave }: Props) {
  useSyncExternalStore(session.subscribe, session.getVersion);
  const t = useT();
  const bar = useRef<HTMLDivElement>(null);
  const [raiseValue, setRaiseValue] = useState(0);
  const s = session.state;
  const legal = session.legal;
  const me = s.players[session.humanIndex];

  const min = legal?.minRaiseTo ?? 0;
  const max = legal?.maxRaiseTo ?? 0;
  const raiseTo = Math.min(max, Math.max(min, raiseValue));
  const pot = potOf(s);

  const fold = () => {
    session.act({ type: 'fold' });
  };
  const call = () => {
    session.act({ type: 'call' });
  };
  const raise = () => {
    session.act({ type: 'raise', to: raiseTo });
  };

  // Keys are handled on the lobby root, like the rest of the lobby's keyboard input.
  const onKey = useEffectEvent((code: string) => {
    if (code === 'KeyF') fold();
    else if (code === 'KeyC') call();
    else if (code === 'KeyR') raise();
  });
  useEffect(() => {
    const root = bar.current?.closest<HTMLElement>('[data-acehall-root]');
    if (!root) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const typing = e.target instanceof Element && e.target.closest('input, select, textarea');
      if (!e.repeat && !typing) onKey(e.code);
    };
    root.addEventListener('keydown', onKeyDown);
    return () => {
      root.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const status = (() => {
    if (s.street === 'showdown') {
      return s.awards
        .map((a) => {
          const who = s.players[a.player];
          const head = who?.isHuman
            ? t('poker.youWin', { amount: String(a.amount) })
            : t('poker.someoneWins', { name: who?.name ?? '', amount: String(a.amount) });
          const hand = a.hand === null ? null : HAND_KEYS[a.hand];
          return hand ? `${head} ${t('poker.withHand', { hand: t(hand) })}` : head;
        })
        .join(' · ');
    }
    if (session.busted) return t('poker.busted');
    if (legal) return t('poker.yourTurn');
    const acting = s.players[s.toAct];
    return acting && !acting.isHuman ? t('poker.thinking', { name: acting.name }) : '';
  })();

  const box: CSSProperties = {
    ...panelStyle(colors),
    position: 'absolute',
    left: '50%',
    bottom: 'max(env(safe-area-inset-bottom), 14px)',
    transform: 'translateX(-50%)',
    width: 'min(620px, 96vw)',
    padding: '10px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    pointerEvents: 'auto',
    fontSize: 14,
  };
  const small = { ...buttonStyle(colors), padding: '6px 10px', fontSize: 12 };
  const primary = (on: boolean): CSSProperties => ({
    ...buttonStyle(colors),
    background: on ? colors.accent : `${colors.uiBackground}cc`,
    color: on ? colors.uiBackground : colors.uiText,
    opacity: on ? 1 : 0.45,
    cursor: on ? 'pointer' : 'default',
  });

  return (
    <div ref={bar} style={box}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <span>
          {t(`poker.street.${s.street}`)} · {t('poker.potLabel')} {pot} · {t('poker.stack')}{' '}
          <strong style={{ color: colors.accent }}>{me?.stack ?? 0}</strong>
        </span>
        <span style={{ fontWeight: 600 }}>{status}</span>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="button" style={primary(legal !== null && !legal.canCheck)} onClick={fold}>
          {t('poker.fold')} <kbd>F</kbd>
        </button>
        <button type="button" style={primary(legal !== null)} onClick={call}>
          {legal && legal.callAmount > 0
            ? t('poker.call', { amount: String(legal.callAmount) })
            : t('poker.check')}{' '}
          <kbd>C</kbd>
        </button>
        <button type="button" style={primary(legal?.canRaise === true)} onClick={raise}>
          {t('poker.raise', { amount: String(raiseTo) })} <kbd>R</kbd>
        </button>
        <input
          type="range"
          aria-label={t('poker.raise', { amount: String(raiseTo) })}
          min={min}
          max={Math.max(min, max)}
          step={1}
          value={raiseTo}
          disabled={!legal?.canRaise}
          onChange={(e) => {
            setRaiseValue(Number(e.target.value));
          }}
          style={{ flex: 1, minWidth: 90 }}
        />
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          style={small}
          disabled={!legal?.canRaise}
          onClick={() => {
            setRaiseValue(Math.round(s.currentBet + pot / 2));
          }}
        >
          {t('poker.halfPot')}
        </button>
        <button
          type="button"
          style={small}
          disabled={!legal?.canRaise}
          onClick={() => {
            setRaiseValue(s.currentBet + pot);
          }}
        >
          {t('poker.pot')}
        </button>
        <button
          type="button"
          style={small}
          disabled={!legal?.canRaise}
          onClick={() => {
            setRaiseValue(max);
          }}
        >
          {t('poker.allIn')}
        </button>
        {session.busted && (
          <button type="button" style={small} onClick={() => session.rebuy()}>
            {t('poker.rebuy', { amount: String(BUY_IN) })}
          </button>
        )}
        <span style={{ flex: 1 }} />
        <button type="button" style={small} onClick={onLeave}>
          {t('poker.leave')} <kbd>E</kbd>
        </button>
      </div>
    </div>
  );
}
