import type { IListEntry } from '@/lib/api';
import { lastReadKey, type ILastRead } from '@/lib/browsing';
import { entryId, kindOf } from '@/lib/media';

/** Dernière page lue dans le navigateur pour une entrée de ma liste (œuvre validée, ou entrée en attente de validation). */
export function readOf(entry: IListEntry, reads: Record<string, ILastRead>): ILastRead | undefined {
  return reads[lastReadKey(kindOf(entry.mediaType), entry.media ? entry.media.id : entryId(entry))];
}

/** Les entrées lues dans le navigateur d'abord (la lecture la plus récente en tête), les autres gardent leur ordre. */
export function readFirst(entries: IListEntry[], reads: Record<string, ILastRead>): IListEntry[] {
  const at = (entry: IListEntry) => readOf(entry, reads)?.at ?? -1;
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => at(b.entry) - at(a.entry) || a.index - b.index)
    .map(({ entry }) => entry);
}
