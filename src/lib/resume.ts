import type { IListEntry } from '@/lib/api';
import { lastReadKey, type ILastRead } from '@/lib/browsing';
import { entryId, kindOf, mediaTitle } from '@/lib/media';

export interface IResumeTarget {
  entry: IListEntry;
  kind: 'anime' | 'manga';
  title: string;
  read: ILastRead;
}

/** L'œuvre en cours dont la dernière page lue dans le navigateur est la plus récente, ou `null` si aucune n'a été lue. */
export function latestResume(entries: IListEntry[], reads: Record<string, ILastRead>): IResumeTarget | null {
  let best: IResumeTarget | null = null;
  for (const entry of entries) {
    const kind = kindOf(entry.mediaType);
    const id = entry.media ? entry.media.id : entryId(entry);
    const read = reads[lastReadKey(kind, id)];
    if (!read || (best && best.read.at >= read.at)) continue;
    best = { entry, kind, read, title: entry.media ? mediaTitle(entry.media) : (entry.preview?.title ?? 'Sans titre') };
  }
  return best;
}
