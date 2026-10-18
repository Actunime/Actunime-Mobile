import type { PageDetection } from '@/detection/messages';

import { api, ApiError, mediaId, type ISearchMedia } from './api';
import { getMatches, saveMatch, type IMatch } from './storage';

export type PushResult = 'created' | 'updated' | 'unchanged';

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export const matchKey = (d: Pick<PageDetection, 'kind' | 'title'>): string =>
  `${d.kind}|${normalize(d.title)}`;

export const titleOf = (m: ISearchMedia): string => m.title?.original ?? m.title?.normal ?? '—';

function isExactMatch(media: ISearchMedia, title: string): boolean {
  const wanted = normalize(title);
  const titles = [media.title?.original, media.title?.normal, ...(media.title?.alias ?? [])];
  return titles.some((t) => t && normalize(t) === wanted);
}

export interface IResolution {
  match: IMatch | null;
  candidates: ISearchMedia[];
}

/** Retrouve l'œuvre : association déjà confirmée, sinon correspondance exacte de titre, sinon candidats à confirmer. */
export async function resolve(detection: PageDetection): Promise<IResolution> {
  const key = matchKey(detection);
  const known = (await getMatches())[key];
  if (known) return { match: known, candidates: [] };

  const candidates = await api.searchByKind(detection.kind, detection.title);
  const exact = candidates.filter((c) => isExactMatch(c, detection.title));
  if (exact.length === 1) {
    const match = { mediaId: mediaId(exact[0]), title: titleOf(exact[0]) };
    await saveMatch(key, match);
    return { match, candidates: [] };
  }
  return { match: null, candidates };
}

export async function confirm(detection: PageDetection, media: ISearchMedia): Promise<IMatch> {
  const match = { mediaId: mediaId(media), title: titleOf(media) };
  await saveMatch(matchKey(detection), match);
  return match;
}

/** Écrit la progression dans la liste, sans jamais la faire reculer (crée l'entrée si elle n'existe pas). */
export async function pushProgress(detection: PageDetection, match: IMatch): Promise<PushResult> {
  const isManga = detection.kind === 'manga';
  const number = isManga ? detection.chapter : detection.episode;
  if (number === undefined) throw new Error(`Numéro de ${isManga ? 'chapitre' : 'épisode'} non détecté`);

  let entry;
  try {
    entry = await api.getListByMedia(match.mediaId);
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 404) throw err;
  }

  if (!entry) {
    await api.createListEntry({
      mediaId: match.mediaId,
      mediaType: isManga ? 'Manga' : 'Anime',
      status: isManga ? 'READING' : 'WATCHING',
      ...(isManga ? { chaptersRead: number } : { episodesWatched: number }),
    });
    return 'created';
  }

  const current = (isManga ? entry.chaptersRead : entry.episodesWatched) ?? 0;
  if (number <= current) return 'unchanged';
  await api.updateListEntry(
    (entry.id ?? entry._id) as string,
    isManga ? { chaptersRead: number } : { episodesWatched: number },
  );
  return 'updated';
}
