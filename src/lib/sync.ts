import type { PageDetection } from '@/detection/messages';

import { api, ApiError, mediaId, type IListEntry, type IPendingProposal, type IProposalData, type ISearchMedia } from './api';
import { forgetMatch, getMatches, saveMatch, type IMatch } from './storage';
import { fuzzyTitleMatch } from './title-match';

export type PushResult = 'created' | 'updated' | 'unchanged';

type Kind = 'anime' | 'manga';

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export const matchKey = (d: Pick<PageDetection, 'kind' | 'title'>): string => `${d.kind}|${normalize(d.title)}`;

/**
 * Une œuvre que l'utilisateur peut choisir. Trois origines, comme dans l'extension :
 * - `media` : œuvre validée du catalogue ;
 * - `pending-entry` : œuvre en attente de validation déjà dans MA liste (`id` = entrée de liste) ;
 * - `proposal` : proposition d'ajout en attente d'un membre, pas encore dans ma liste (`id` = proposition).
 */
export interface ICandidate {
  key: string;
  origin: 'media' | 'pending-entry' | 'proposal';
  id: string;
  title: string;
  posterUrl?: string | null;
  /** Titres alternatifs, pour reconnaître l'œuvre sous un autre nom. */
  aliases: string[];
}

const mediaTypeOf = (kind: Kind) => (kind === 'manga' ? 'Manga' : 'Anime');
const entryId = (e: IListEntry) => e.id;

function fromMedia(media: ISearchMedia): ICandidate {
  const id = mediaId(media);
  return {
    key: `media:${id}`,
    origin: 'media',
    id,
    title: media.title?.original ?? media.title?.normal ?? '—',
    posterUrl: media.posterUrl ?? null,
    aliases: [media.title?.normal, ...(media.title?.alias ?? [])].filter((t): t is string => Boolean(t)),
  };
}

function fromProposal(proposal: IPendingProposal): ICandidate | null {
  const id = proposal.id;
  const dependency = proposal.mainDependency as IProposalData | undefined;
  const title = dependency?.title?.original;
  if (!id || !title) return null;
  return {
    key: `proposal:${id}`,
    origin: 'proposal',
    id,
    title,
    posterUrl: dependency?.poster?.url ?? null,
    aliases: dependency?.title?.alias ?? [],
  };
}

function fromPendingEntry(entry: IListEntry): ICandidate | null {
  if (!entry.preview?.title) return null;
  const id = entryId(entry);
  return {
    key: `pending-entry:${id}`,
    origin: 'pending-entry',
    id,
    title: entry.preview.title,
    posterUrl: entry.preview.coverImage ?? null,
    aliases: [],
  };
}

const matchOf = (candidate: ICandidate): IMatch => ({
  kind: candidate.origin === 'media' ? 'media' : 'pending',
  id: candidate.id,
  title: candidate.title,
});

const isExactMatch = (candidate: ICandidate, title: string) => {
  const wanted = normalize(title);
  return [candidate.title, ...candidate.aliases].some((t) => normalize(t) === wanted);
};

const notNull = <T>(value: T | null): value is T => value !== null;

/** Mes entrées en attente de validation, du bon type (anime ou manga). */
async function pendingEntriesFor(kind: Kind): Promise<ICandidate[]> {
  try {
    const entries = await api.getPendingListEntries();
    return entries
      .filter((entry) => entry.mediaType === mediaTypeOf(kind))
      .map(fromPendingEntry)
      .filter(notNull);
  } catch {
    return []; // l'API de liste indisponible ne doit pas empêcher de chercher dans le catalogue
  }
}

export interface IResolution {
  match: IMatch | null;
  candidates: ICandidate[];
}

/**
 * Retrouve l'œuvre : association déjà confirmée, puis mes œuvres en attente de validation (même ordre que
 * l'extension), puis correspondance exacte dans le catalogue, sinon candidats que l'utilisateur confirme.
 */
export async function resolve(detection: PageDetection): Promise<IResolution> {
  const key = matchKey(detection);
  const known = (await getMatches())[key];
  if (known) return { match: known, candidates: [] };

  const ownPending = (await pendingEntriesFor(detection.kind)).find((c) => fuzzyTitleMatch(detection.title, c.title));
  if (ownPending) {
    const match = matchOf(ownPending);
    await saveMatch(key, match);
    return { match, candidates: [] };
  }

  const [media, proposals] = await Promise.all([
    api.searchByKind(detection.kind, detection.title).catch(() => [] as ISearchMedia[]),
    api.searchPendingProposals(detection.kind, detection.title).catch(() => [] as IPendingProposal[]),
  ]);
  const catalogue = media.map(fromMedia);
  const candidates = [...catalogue, ...proposals.map(fromProposal).filter(notNull)];

  const exact = catalogue.filter((candidate) => isExactMatch(candidate, detection.title));
  if (exact.length === 1) {
    const match = matchOf(exact[0]);
    await saveMatch(key, match);
    return { match, candidates: [] };
  }
  return { match: null, candidates };
}

/** Recherche manuelle : mes œuvres en attente d'abord, puis le catalogue, puis les propositions des membres. */
export async function searchCandidates(kind: Kind, query: string): Promise<ICandidate[]> {
  const [own, media, proposals] = await Promise.all([
    pendingEntriesFor(kind),
    api.searchByKind(kind, query, 10).catch(() => [] as ISearchMedia[]),
    api.searchPendingProposals(kind, query, 5).catch(() => [] as IPendingProposal[]),
  ]);
  return [
    ...own.filter((candidate) => fuzzyTitleMatch(query, candidate.title)),
    ...media.map(fromMedia),
    ...proposals.map(fromProposal).filter(notNull),
  ];
}

/**
 * L'utilisateur a choisi une œuvre. Une proposition d'un membre est d'abord ajoutée à ma liste (comme dans
 * l'extension) : la progression s'écrit ensuite sur cette entrée, qui devient l'œuvre quand elle est validée.
 */
export async function confirm(
  detection: Pick<PageDetection, 'kind' | 'title'>,
  candidate: ICandidate,
): Promise<IMatch> {
  let match = matchOf(candidate);
  if (candidate.origin === 'proposal') {
    const entry = await api.createListEntryFromProposal({
      proposalId: candidate.id,
      mediaType: mediaTypeOf(detection.kind),
      status: detection.kind === 'manga' ? 'READING' : 'WATCHING',
      preview: { title: candidate.title, coverImage: candidate.posterUrl ?? undefined },
    });
    match = { kind: 'pending', id: entryId(entry), title: candidate.title };
  }
  await saveMatch(matchKey(detection), match);
  return match;
}

/**
 * Suivre une œuvre absente du catalogue : ajout rapide (proposition + entrée de liste), puis association
 * de la page à cette entrée en attente. Le staff ou la communauté relie ensuite l'œuvre (alias, validation, fusion).
 */
export async function quickAddWork(
  detection: Pick<PageDetection, 'kind' | 'title'>,
  input: { title: string; format: string; aliases: string[] },
): Promise<IMatch> {
  const { entry } = await api.quickAdd({
    mediaType: mediaTypeOf(detection.kind),
    title: input.title,
    format: input.format,
    status: detection.kind === 'manga' ? 'READING' : 'WATCHING',
    ...(input.aliases.length ? { aliases: input.aliases } : {}),
  });
  if (!entry) throw new Error('L’ajout n’a pas créé d’entrée dans ta liste');
  const match: IMatch = { kind: 'pending', id: entryId(entry), title: input.title };
  // la clé reste celle du titre détecté sur la page : les chapitres suivants retrouvent ainsi l'œuvre
  await saveMatch(matchKey(detection), match);
  return match;
}

/** Oublie l'association mémorisée pour cette détection (l'utilisateur dit que ce n'est pas la bonne œuvre). */
export const forget = (detection: PageDetection): Promise<void> => forgetMatch(matchKey(detection));

const progressField = (kind: Kind) => (kind === 'manga' ? 'chaptersRead' : 'episodesWatched');

/** Entrée de ma liste correspondant à l'association, ou `null` si l'œuvre n'y est pas encore. */
async function findEntry(match: IMatch): Promise<IListEntry | null> {
  if (match.kind === 'pending') {
    const entries = await api.getPendingListEntries();
    return entries.find((entry) => entryId(entry) === match.id) ?? null;
  }
  try {
    return await api.getListByMedia(match.id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

/** Progression actuelle dans ma liste (indéfinie si l'œuvre n'y est pas), pour la barre de suivi. */
export async function currentProgress(
  detection: Pick<PageDetection, 'kind'>,
  match: IMatch,
): Promise<number | undefined> {
  try {
    const entry = await findEntry(match);
    return entry ? (entry[progressField(detection.kind)] ?? 0) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Ouvrir le chapitre ou l'épisode N, c'est avoir vu les précédents : la liste passe à N-1 quand elle en est plus
 * loin (jusqu'au précédent, même après un saut). Uniquement pour une œuvre déjà dans la liste — ouvrir une page ne
 * crée jamais d'entrée — et jamais en arrière. Renvoie les numéros ajoutés, ou `null` si rien n'a changé.
 */
export async function markPreviousSeen(
  detection: PageDetection,
  match: IMatch,
  progress: number | undefined,
): Promise<{ from: number; to: number } | null> {
  const isManga = detection.kind === 'manga';
  const number = isManga ? detection.chapter : detection.episode;
  if (number === undefined || number < 2 || progress === undefined) return null;
  const target = number - 1;
  if (target <= progress) return null;

  const entry = await findEntry(match);
  if (!entry) return null;
  await api.updateListEntry(entryId(entry), {
    [progressField(detection.kind)]: target,
    status: isManga ? 'READING' : 'WATCHING',
  });
  return { from: progress + 1, to: target };
}

/**
 * L'œuvre en attente mémorisée n'est plus dans ma liste (validée, fusionnée ou supprimée) : l'association est périmée
 * et doit être refaite, pas affichée comme une panne.
 */
export class StaleMatchError extends Error {
  constructor() {
    super('Cette œuvre a changé depuis la dernière fois : choisis-la à nouveau');
    this.name = 'StaleMatchError';
  }
}

/** Écrit la progression dans la liste, sans jamais la faire reculer (crée l'entrée si elle n'existe pas). */
export async function pushProgress(detection: PageDetection, match: IMatch): Promise<PushResult> {
  const isManga = detection.kind === 'manga';
  const number = isManga ? detection.chapter : detection.episode;
  if (number === undefined) throw new Error(`Numéro de ${isManga ? 'chapitre' : 'épisode'} non détecté`);

  const entry = await findEntry(match);
  const field = progressField(detection.kind);
  const activeStatus = isManga ? 'READING' : 'WATCHING';

  if (!entry) {
    if (match.kind === 'pending') throw new StaleMatchError();
    await api.createListEntry({
      mediaId: match.id,
      mediaType: mediaTypeOf(detection.kind),
      status: activeStatus,
      [field]: number,
    });
    return 'created';
  }

  if (number <= (entry[field] ?? 0)) return 'unchanged';
  await api.updateListEntry(entryId(entry), { [field]: number, status: activeStatus });
  return 'updated';
}
