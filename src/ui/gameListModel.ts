import { localizedName } from '../i18n';
import type { InteractiveObjectConfig, Locale, ObjectKind } from '../lib/types';

export interface GameEntry {
  gameId: string;
  /** First anchor the operator mapped this game onto. */
  anchorId: string;
  name: string;
  kind: ObjectKind;
  /** Operator category, or null to group by object kind. */
  category: string | null;
  thumbnailUrl: string | undefined;
}

export interface GameGroup {
  /** `category` text or the object kind; the UI translates kinds. */
  key: string;
  kind: ObjectKind | null;
  entries: GameEntry[];
}

/** One entry per game, however many tables or machines it is mapped onto. */
export function buildGameEntries(
  objects: readonly InteractiveObjectConfig[],
  locale: Locale,
): GameEntry[] {
  const seen = new Set<string>();
  const entries: GameEntry[] = [];
  for (const object of objects) {
    if (seen.has(object.gameId)) continue;
    seen.add(object.gameId);
    entries.push({
      gameId: object.gameId,
      anchorId: object.anchorId,
      name: localizedName(object.displayName, locale),
      kind: object.kind,
      category: object.category ?? null,
      thumbnailUrl: object.thumbnailUrl,
    });
  }
  return entries;
}

/** Case-insensitive match on the game name and category. `kindLabel` adds the translated kind as a search term. */
export function filterEntries(
  entries: readonly GameEntry[],
  query: string,
  kindLabel: (kind: ObjectKind) => string,
): GameEntry[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return [...entries];
  return entries.filter((entry) =>
    [entry.name, entry.category ?? '', kindLabel(entry.kind)].some((text) =>
      text.toLocaleLowerCase().includes(needle),
    ),
  );
}

/** Group by the operator's category, or by object kind when a game has none. Groups keep first-seen order. */
export function groupEntries(entries: readonly GameEntry[]): GameGroup[] {
  const groups = new Map<string, GameGroup>();
  for (const entry of entries) {
    const key = entry.category ?? entry.kind;
    let group = groups.get(key);
    if (!group) {
      group = { key, kind: entry.category === null ? entry.kind : null, entries: [] };
      groups.set(key, group);
    }
    group.entries.push(entry);
  }
  return [...groups.values()];
}
