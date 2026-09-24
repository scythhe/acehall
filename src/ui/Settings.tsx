import { useState, type CSSProperties } from 'react';
import { useT } from '../i18n/useT';
import type { QualitySetting } from '../lib/store';
import type { Locale } from '../lib/types';
import { useLobby } from '../lib/storeContext';
import { buttonStyle, panelStyle, type Colors } from './uiStyles';

const QUALITIES: readonly QualitySetting[] = ['auto', 'low', 'medium', 'high'];

interface Props {
  colors: Colors;
  locales: readonly Locale[];
}

const row: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 };
const field: CSSProperties = { font: 'inherit', padding: '6px 8px', borderRadius: 8 };

/** Quality, sound and language. Quality and sound are stored for the systems that use them later. */
export function Settings({ colors, locales }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const locale = useLobby((s) => s.locale);
  const quality = useLobby((s) => s.quality);
  const audio = useLobby((s) => s.audio);
  const setLocale = useLobby((s) => s.setLocale);
  const setQuality = useLobby((s) => s.setQuality);
  const setAudio = useLobby((s) => s.setAudio);

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        aria-label={t('hud.settings')}
        aria-expanded={open}
        style={buttonStyle(colors)}
        onClick={() => {
          setOpen((v) => !v);
        }}
      >
        ⚙
      </button>
      {open && (
        <div
          style={{
            ...panelStyle(colors),
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            width: 220,
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <label style={row}>
            {t('settings.quality')}
            <select
              style={field}
              value={quality}
              onChange={(e) => {
                setQuality(e.target.value as QualitySetting);
              }}
            >
              {QUALITIES.map((q) => (
                <option key={q} value={q}>
                  {t(`settings.quality.${q}`)}
                </option>
              ))}
            </select>
          </label>
          <div style={row}>
            {t('settings.sound')}
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={audio.muted}
                onChange={(e) => {
                  setAudio({ muted: e.target.checked });
                }}
              />
              {t('settings.mute')}
            </label>
            <label style={row}>
              {t('settings.volume')}
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={audio.volume}
                disabled={audio.muted}
                onChange={(e) => {
                  setAudio({ volume: Number(e.target.value) });
                }}
              />
            </label>
          </div>
          {locales.length > 1 && (
            <label style={row}>
              {t('settings.language')}
              <select
                style={field}
                value={locale}
                onChange={(e) => {
                  setLocale(e.target.value as Locale);
                }}
              >
                {locales.map((l) => (
                  <option key={l} value={l}>
                    {t(`locale.${l}`)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}
    </div>
  );
}
