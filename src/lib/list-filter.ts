import type { IListEntry, IMedia, ListStatus, MediaKind } from './api';
import { estimatedAired } from './suivi';

/**
 * Recherche, filtres, tri et regroupement de Ma liste, repris du site :
 * `Actunime-Web/src/lib/list-filter.ts` (filtre et tri côté appareil), `routes/_authenticated/suivi/animes.tsx`
 * (sections par statut, compteurs) et `ui/src/components/cards/ListEntryBand.tsx` (« N disponibles »).
 */

/** Requête de la barre de filtres (mêmes champs que les pages de recherche et l'API). */
export type IListQuery = Record<string, unknown>;
export type SortDirection = 'asc' | 'desc';
export type IListSort = Record<string, SortDirection | undefined>;

/** Tri de ma liste : le tri par défaut d'une catégorie « En cours » est « Épisodes disponibles ». */
export const LIST_SORT_FIELDS: Record<MediaKind, string[]> = {
  anime: ['updatedAt', 'title.original', 'date.start', 'score', 'progress'],
  manga: ['updatedAt', 'title.original', 'date.start', 'score'],
};
export const LIST_SORT_LABELS: Record<string, string> = {
  updatedAt: 'Dernière modification',
  'title.original': 'Titre',
  'date.start': 'Date de sortie',
  score: 'Ma note',
  progress: 'Épisodes disponibles',
};

/** Tri des pages de recherche (`FilterBarAnime` / `FilterBarManga` du site). */
export const SEARCH_SORT_FIELDS: Record<MediaKind, string[]> = {
  anime: ['createdAt', 'updatedAt', 'date.start', 'title.original', 'status', 'format', 'verified'],
  manga: ['createdAt', 'updatedAt', 'title.original', 'status', 'format', 'verified'],
};
export const SEARCH_SORT_LABELS: Record<string, string> = {
  createdAt: 'Créé le',
  updatedAt: 'Mis à jour le',
  'date.start': 'Date de sortie',
  'title.original': 'Titre',
  status: 'Statut',
  format: 'Format',
  verified: 'Vérifié',
};
/** Tri d'une recherche sans tri choisi : les dernières fiches ajoutées (le « Trier 1 » du site). */
export const DEFAULT_SEARCH_SORT: IListSort = { createdAt: 'desc' };

/** Un appui sur un champ de tri : décroissant, puis croissant, puis retiré (`SortPopover.cycleSortField`). */
export function cycleSort(sort: IListSort, field: string): IListSort {
  const current = sort[field];
  const next: SortDirection | undefined = !current ? 'desc' : current === 'desc' ? 'asc' : undefined;
  const result = { ...sort };
  if (next) result[field] = next;
  else delete result[field];
  return result;
}

export const activeSortCount = (sort: IListSort | undefined) => Object.values(sort ?? {}).filter(Boolean).length;

export const MEDIA_SEASONS = ['WINTER', 'SPRING', 'SUMMER', 'FALL'] as const;
export type MediaSeason = (typeof MEDIA_SEASONS)[number];
export const SEASON_LABELS: Record<MediaSeason, string> = { WINTER: 'Hiver', SPRING: 'Printemps', SUMMER: 'Été', FALL: 'Automne' };
export const seasonOfDate = (date: Date): MediaSeason => MEDIA_SEASONS[Math.floor(date.getMonth() / 3)];

/** Facettes de métadonnées filtrables, avec le nom de leur champ d'exclusion (`facets.ts` du site). */
export const FACETS = [
  { key: 'genres', exclude: 'excludeGenres', label: 'Genres', type: 'GENRE' },
  { key: 'themes', exclude: 'excludeThemes', label: 'Thèmes', type: 'THEME' },
  { key: 'demographics', exclude: 'excludeDemographics', label: 'Démographique', type: 'DEMOGRAPHIC' },
  { key: 'tags', exclude: 'excludeTags', label: 'Tags', type: 'TAG' },
] as const;
export type FacetKey = (typeof FACETS)[number]['key'];

export interface IFacetValue {
  include: string[];
  exclude: string[];
  mode: 'any' | 'all';
}

export function readFacet(query: IListQuery | undefined, key: FacetKey): IFacetValue {
  const facet = FACETS.find((f) => f.key === key)!;
  const ids = (value: unknown) => (Array.isArray(value) ? value.map(String) : []);
  return {
    include: ids(query?.[key]),
    exclude: ids(query?.[facet.exclude]),
    mode: query?.[`${key}Mode`] === 'all' ? 'all' : 'any',
  };
}

/** Champs de requête d'une facette (`undefined` = champ retiré), en nombres comme l'API les attend. */
export function facetToQueryPatch(key: FacetKey, value: IFacetValue): IListQuery {
  const facet = FACETS.find((f) => f.key === key)!;
  const toIds = (ids: string[]) => (ids.length > 0 ? ids.map(Number) : undefined);
  return {
    [key]: toIds(value.include),
    [`${key}Mode`]: value.include.length > 1 && value.mode === 'all' ? 'all' : undefined,
    [facet.exclude]: toIds(value.exclude),
  };
}

/** Neutre → retenu → exclu → neutre (`FacetFilter.cycle`). */
export function cycleFacet(value: IFacetValue, id: string): IFacetValue {
  if (value.include.includes(id)) {
    return { ...value, include: value.include.filter((v) => v !== id), exclude: [...value.exclude, id] };
  }
  if (value.exclude.includes(id)) return { ...value, exclude: value.exclude.filter((v) => v !== id) };
  return { ...value, include: [...value.include, id] };
}

/** Requête sans champ vide (`cleanFormData` du site). */
export function cleanQuery(query: IListQuery): IListQuery {
  return Object.fromEntries(
    Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)),
  );
}

/** Nombre de filtres actifs du tiroir « Filtres » (la recherche texte n'en est pas un). */
export function activeFilterCount(query: IListQuery | undefined): number {
  if (!query) return 0;
  let count = 0;
  if (query.format) count++;
  if (query.status) count++;
  if (query.season || query.year) count++;
  for (const facet of FACETS) {
    const value = readFacet(query, facet.key);
    count += value.include.length + value.exclude.length;
  }
  return count;
}

/** Même normalisation que l'API pour les titres : sans accents ni ponctuation, minuscules, espaces simples. */
export const normalizeTitle = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export function entryTitle(entry: IListEntry): string {
  return entry.media?.title?.original || entry.media?.title?.normal || entry.preview?.title || '';
}

/** Tous les titres d'une entrée (original, normalisé, surnoms) : la recherche porte sur chacun, comme côté API. */
function searchableTitles(entry: IListEntry): string[] {
  const title = entry.media?.title as (IMedia['title'] & { aliasNormal?: string[] }) | undefined;
  return [entryTitle(entry), title?.normal, ...(title?.alias ?? []), ...(title?.aliasNormal ?? [])]
    .filter((t): t is string => !!t)
    .map(normalizeTitle);
}

const toIds = (value: unknown): string[] => (Array.isArray(value) ? value.map(String) : []);

function matchesFacet(have: unknown[], query: IListQuery, key: string, excludeKey: string): boolean {
  const include = toIds(query[key]);
  const exclude = toIds(query[excludeKey]);
  const ids = have.map(String);
  if (include.length > 0) {
    const ok = query[`${key}Mode`] === 'all' ? include.every((id) => ids.includes(id)) : include.some((id) => ids.includes(id));
    if (!ok) return false;
  }
  return !exclude.some((id) => ids.includes(id));
}

type IFacetMedia = IMedia & { themes?: unknown[]; demographics?: unknown[]; tags?: { id: number | string }[] };

/** Vrai si l'œuvre répond à la requête de la barre de filtres (recherche, format, diffusion, saison, facettes). */
export function matchesListQuery(entry: IListEntry, query: IListQuery | undefined): boolean {
  if (!query) return true;
  const media = entry.media as IFacetMedia | null | undefined;

  const search = typeof query.search === 'string' ? normalizeTitle(query.search) : '';
  if (search && !searchableTitles(entry).some((title) => title.includes(search))) return false;

  const needsMedia = ['format', 'status', 'season', 'year', 'genres', 'themes', 'demographics', 'tags'].some(
    (key) => query[key] !== undefined || query[`exclude${key[0].toUpperCase()}${key.slice(1)}`] !== undefined,
  );
  if (!media) return !needsMedia;

  if (query.format && String(query.format) !== String(media.format)) return false;
  if (query.status && query.status !== media.status) return false;

  if (query.season || query.year) {
    const start = media.date?.start ? new Date(media.date.start) : null;
    if (!start || Number.isNaN(start.getTime())) return false;
    if (query.year && start.getFullYear() !== Number(query.year)) return false;
    if (query.season && seasonOfDate(start) !== query.season) return false;
  }

  if (!matchesFacet(media.genres ?? [], query, 'genres', 'excludeGenres')) return false;
  if (!matchesFacet(media.themes ?? [], query, 'themes', 'excludeThemes')) return false;
  if (!matchesFacet(media.demographics ?? [], query, 'demographics', 'excludeDemographics')) return false;
  return matchesFacet((media.tags ?? []).map((tag) => tag.id), query, 'tags', 'excludeTags');
}

const timeOf = (value: unknown) => (value ? new Date(value as string).getTime() : 0);

/** Épisodes sortis d'un anime de ma liste (0 pour un manga ou sans fiche). */
export const airedOf = (entry: IListEntry, from = new Date()): number =>
  entry.mediaType === 'Anime' && entry.media ? estimatedAired(entry.media, from) : 0;

/** Tri local selon les champs choisis dans « Trier » (le premier champ prime) ; `aired` = épisodes sortis. */
export function sortListEntries(
  entries: IListEntry[],
  sort: IListSort | undefined,
  aired: (e: IListEntry) => number = airedOf,
): IListEntry[] {
  const keys = Object.entries(sort ?? {}).filter(([, dir]) => !!dir) as [string, SortDirection][];
  if (keys.length === 0) return entries;
  const value = (entry: IListEntry, key: string): number | string => {
    switch (key) {
      case 'updatedAt':
        return timeOf(entry.updatedAt);
      case 'title.original':
        return entryTitle(entry).toLowerCase();
      case 'date.start':
        return timeOf(entry.media?.date?.start);
      case 'score':
        return entry.score ?? 0;
      case 'progress':
        return Math.max(0, aired(entry) - (entry.episodesWatched ?? 0));
      default:
        return 0;
    }
  };
  return [...entries].sort((a, b) => {
    for (const [key, dir] of keys) {
      const [x, y] = [value(a, key), value(b, key)];
      if (x === y) continue;
      return (x > y ? 1 : -1) * (dir === 'asc' ? 1 : -1);
    }
    return 0;
  });
}

export type ListStatusFilter = ListStatus | 'ALL';

/** Entrées affichées pour une catégorie : filtre, puis tri choisi ou « disponibles d'abord » en « En cours ». */
export function filterListEntries(
  entries: IListEntry[],
  status: ListStatusFilter,
  query: IListQuery | undefined,
  sort: IListSort | undefined,
  aired: (e: IListEntry) => number = airedOf,
): IListEntry[] {
  const filtered = entries.filter((entry) => (status === 'ALL' || entry.status === status) && matchesListQuery(entry, query));
  if (activeSortCount(sort) > 0) return sortListEntries(filtered, sort, aired);
  if (status === 'WATCHING') return sortListEntries(filtered, { progress: 'desc' }, aired);
  return filtered;
}

/** Ordre des sections de « Tous » : en cours, en pause, terminé, abandonné, planifié. */
export const SECTION_ORDER: Record<MediaKind, ListStatus[]> = {
  anime: ['WATCHING', 'ON_HOLD', 'COMPLETED', 'DROPPED', 'PLAN_TO_WATCH'],
  manga: ['READING', 'ON_HOLD', 'COMPLETED', 'DROPPED', 'PLAN_TO_READ'],
};

export interface IListSection {
  key: string;
  status: ListStatus | null;
  label: string;
  entries: IListEntry[];
}

/**
 * Sections par statut, seulement pour « Tous » sans recherche, filtre ni tri (sinon `null` : liste à plat).
 * Les entrées dont le statut n'est pas reconnu (import) vont dans « Autres ».
 */
export function groupListEntries(
  entries: IListEntry[],
  kind: MediaKind,
  status: ListStatusFilter,
  query: IListQuery | undefined,
  sort: IListSort | undefined,
  labels: Record<ListStatus, string>,
): IListSection[] | null {
  if (status !== 'ALL' || Object.keys(query ?? {}).length > 0 || activeSortCount(sort) > 0) return null;
  const order = SECTION_ORDER[kind];
  const sections: IListSection[] = [];
  for (const value of order) {
    const items = entries.filter((e) => e.status === value);
    if (items.length > 0) sections.push({ key: value, status: value, label: labels[value], entries: items });
  }
  const others = entries.filter((e) => !order.includes(e.status));
  if (others.length > 0) sections.push({ key: 'OTHERS', status: null, label: 'Autres', entries: others });
  return sections;
}

/** Compteurs de la bande de statuts : `ALL` + un par statut. */
export function countByStatus(entries: IListEntry[]): Record<string, number> {
  const counts: Record<string, number> = { ALL: entries.length };
  for (const entry of entries) counts[entry.status] = (counts[entry.status] ?? 0) + 1;
  return counts;
}

export interface IBandState {
  progress: number;
  /** Largeur de la barre en %, par rapport au total, sinon aux épisodes sortis. */
  pct: number;
  /** Série sans total connu : la fin de la barre s'estompe. */
  openEnded: boolean;
  isActive: boolean;
  isDone: boolean;
  /** Épisodes sortis non vus. */
  behind: number;
  /** « 3 disponibles » / « À jour », seulement en cours avec des épisodes sortis connus. */
  availableLabel: string | null;
  /** `warning` au-delà de 2 de retard, `success` jusqu'à 2, `muted` à jour. */
  availableTone: 'warning' | 'success' | 'muted' | null;
}

/** Ce qu'affiche la bande de gestion d'une carte de ma liste (`ListEntryBand` du site). */
export function bandState(entry: IListEntry, kind: MediaKind, total?: number, available?: number): IBandState {
  const progress = (kind === 'anime' ? entry.episodesWatched : entry.chaptersRead) ?? 0;
  const reference = total || available || 0;
  const pct = reference ? Math.min(100, Math.round((progress / reference) * 100)) : 0;
  const isActive = entry.status === 'WATCHING' || entry.status === 'READING';
  const isDone = entry.status === 'COMPLETED';
  const behind = available != null ? Math.max(0, available - progress) : 0;
  const showAvailable = isActive && available != null;
  return {
    progress,
    pct: isDone ? 100 : pct,
    openEnded: !total,
    isActive,
    isDone,
    behind,
    availableLabel: showAvailable ? (behind > 0 ? `${behind} disponible${behind > 1 ? 's' : ''}` : 'À jour') : null,
    availableTone: showAvailable ? (behind > 0 ? (behind > 2 ? 'warning' : 'success') : 'muted') : null,
  };
}

/**
 * Nouvelle progression après « +1 » / « −1 » : bornée à 0 et au total ; atteindre le total passe l'entrée à
 * « Terminé ». `null` quand rien ne change.
 */
export function bumpProgress(
  progress: number,
  delta: number,
  total?: number,
): { progress: number; status?: 'COMPLETED' } | null {
  const next = Math.max(0, total ? Math.min(total, progress + delta) : progress + delta);
  if (next === progress) return null;
  return { progress: next, ...(total && next >= total && delta > 0 ? { status: 'COMPLETED' as const } : {}) };
}
