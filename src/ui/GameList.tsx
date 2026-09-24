import { useMemo, useState, type CSSProperties } from 'react';
import type { InteractiveObjectConfig } from '../lib/types';
import { useT } from '../i18n/useT';
import { useLobby } from '../lib/storeContext';
import { buildGameEntries, filterEntries, groupEntries, type GameEntry } from './gameListModel';
import { buttonStyle, panelStyle, type Colors } from './uiStyles';

interface Props {
  colors: Colors;
  objects: readonly InteractiveObjectConfig[];
  onSelect(entry: GameEntry): void;
}

/** Searchable, categorized list of every game. Selecting one hands over to `onSelect`. */
export function GameList(props: Props) {
  const open = useLobby((s) => s.gameListOpen);
  return open ? <GameListDialog {...props} /> : null;
}

function GameListDialog({ colors, objects, onSelect }: Props) {
  const close = useLobby((s) => s.closeGameList);
  const locale = useLobby((s) => s.locale);
  const t = useT();
  const [query, setQuery] = useState('');

  const entries = useMemo(() => buildGameEntries(objects, locale), [objects, locale]);
  const groups = useMemo(
    () => groupEntries(filterEntries(entries, query, (kind) => t(`kind.${kind}`))),
    [entries, query, t],
  );

  const backdrop: CSSProperties = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.6)',
    pointerEvents: 'auto',
  };
  const panel: CSSProperties = {
    ...panelStyle(colors),
    width: 'min(560px, 94vw)',
    maxHeight: '86%',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: 16,
  };

  return (
    <div
      data-acehall-modal=""
      style={backdrop}
      onClick={close}
      onKeyDown={(e) => {
        if (e.key === 'Escape') close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('list.title')}
        style={panel}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <strong style={{ flex: 1, fontSize: 18 }}>{t('list.title')}</strong>
          <button
            type="button"
            aria-label={t('list.close')}
            style={buttonStyle(colors)}
            onClick={close}
          >
            ✕
          </button>
        </div>
        <input
          autoFocus
          type="search"
          value={query}
          placeholder={t('list.search')}
          aria-label={t('list.search')}
          onChange={(e) => {
            setQuery(e.target.value);
          }}
          style={{ font: 'inherit', padding: '8px 10px', borderRadius: 8 }}
        />
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {groups.length === 0 && <span style={{ opacity: 0.7 }}>{t('list.empty')}</span>}
          {groups.map((group) => (
            <section key={group.key}>
              <h3 style={{ margin: '0 0 6px', fontSize: 13, opacity: 0.7, fontWeight: 600 }}>
                {group.kind ? t(`kind.${group.kind}`) : group.key}
              </h3>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
                {group.entries.map((entry) => (
                  <li key={entry.gameId}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(entry);
                      }}
                      style={{
                        ...buttonStyle(colors),
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        borderRadius: 10,
                        textAlign: 'left',
                      }}
                    >
                      {entry.thumbnailUrl && (
                        <img
                          src={entry.thumbnailUrl}
                          alt=""
                          width={40}
                          height={40}
                          style={{ borderRadius: 6, objectFit: 'cover' }}
                        />
                      )}
                      {entry.name}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
