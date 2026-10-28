import type { IListEntry, IMedia, MediaKind } from './api';

/** Titre affiché : le titre normal du site, sinon l'original. */
export function mediaTitle(media?: Pick<IMedia, 'title'> | null): string {
  return media?.title?.original ?? media?.title?.normal ?? 'Sans titre';
}

export function entryId(entry: IListEntry): string {
  return (entry.id ?? entry._id) as string;
}

export const kindOf = (mediaType?: 'Anime' | 'Manga'): MediaKind => (mediaType === 'Manga' ? 'manga' : 'anime');
export const mediaTypeOf = (kind: MediaKind): 'Anime' | 'Manga' => (kind === 'manga' ? 'Manga' : 'Anime');

/** Total d'épisodes (anime) ou de chapitres (manga) quand il est connu. */
export function totalOf(kind: MediaKind, media?: IMedia | null): number | undefined {
  const total = kind === 'manga' ? media?.chaptersInfo?.total : media?.episodesInfo?.total;
  return total && total > 0 ? total : undefined;
}

/** Progression de l'entrée : « 5 / 12 ép. » ou « 5 ch. ». */
export function progressLabel(entry: IListEntry, media?: IMedia | null): string | null {
  const manga = entry.mediaType === 'Manga';
  const done = manga ? entry.chaptersRead : entry.episodesWatched;
  if (done === undefined || done === null) return null;
  const total = totalOf(kindOf(entry.mediaType), media);
  const unit = manga ? 'ch.' : 'ép.';
  return total ? `${done} / ${total} ${unit}` : `${done} ${unit}`;
}

export function formatYear(media?: IMedia | null): string | null {
  const start = media?.date?.start;
  if (!start) return null;
  const year = new Date(start).getFullYear();
  return Number.isNaN(year) ? null : String(year);
}
