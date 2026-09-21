import { useSyncExternalStore, type CSSProperties } from 'react';
import { localizedName } from '../i18n';
import { useT } from '../i18n/useT';
import { useLobby } from '../lib/storeContext';
import type { ResolvedConfig } from '../config/defaults';

interface Props {
  colors: ResolvedConfig['brand']['colors'];
  onInteract(): void;
}

const coarsePointer = () =>
  typeof window.matchMedia === 'function' ? window.matchMedia('(pointer: coarse)') : null;
const subscribe = (cb: () => void) => {
  const query = coarsePointer();
  query?.addEventListener('change', cb);
  return () => query?.removeEventListener('change', cb);
};
const isTouch = () => coarsePointer()?.matches ?? false;

/** "Press E to play X" / "Tap to play X". Sits below the screen centre; tappable for touch. */
export function InteractionPrompt({ colors, onInteract }: Props) {
  const focus = useLobby((s) => s.focus);
  const locale = useLobby((s) => s.locale);
  const t = useT();
  const touch = useSyncExternalStore(subscribe, isTouch);
  if (!focus) return null;

  const text =
    focus.kind === 'cashier'
      ? t(touch ? 'prompt.cashierTouch' : 'prompt.cashier')
      : t(touch ? 'prompt.playTouch' : 'prompt.play', {
          name: focus.displayName ? localizedName(focus.displayName, locale) : '',
        });

  const style: CSSProperties = {
    position: 'absolute',
    left: '50%',
    bottom: '22%',
    transform: 'translateX(-50%)',
    maxWidth: '90%',
    padding: '10px 18px',
    border: `1px solid ${colors.accent}`,
    borderRadius: 999,
    background: `${colors.uiBackground}cc`,
    color: colors.uiText,
    font: 'inherit',
    fontSize: 16,
    textAlign: 'center',
    pointerEvents: 'auto',
    cursor: 'pointer',
  };
  return (
    <button type="button" style={style} onClick={onInteract}>
      {text}
    </button>
  );
}
