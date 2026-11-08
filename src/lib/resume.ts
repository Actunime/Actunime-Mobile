import type { IListEntry } from '@/lib/api';
import { lastReadKey, type ILastRead } from '@/lib/browsing';
import { entryId, kindOf } from '@/lib/media';

/** Dernière page lue dans le navigateur pour une entrée de ma liste (œuvre validée, ou entrée en attente de validation). */
export function readOf(entry: IListEntry, reads: Record<string, ILastRead>): ILastRead | undefined {
  return reads[lastReadKey(kindOf(entry.mediaType), entry.media ? entry.media.id : entryId(entry))];
}
