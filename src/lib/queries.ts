import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  api,
  type IListEntry,
  type IListEntryFields,
  type EntityKind,
  type EntityRelation,
  type FavoriteType,
  type IMediaSearchBody,
  type ListStatus,
  type MediaKind,
} from './api';
import { bumpProgress } from './list-filter';

const FIVE_MINUTES = 5 * 60_000;

export const useMedia = (kind: MediaKind, id: string) =>
  useQuery({ queryKey: ['media', kind, id], queryFn: () => api.getMedia(kind, id), staleTime: FIVE_MINUTES });

export const useGenres = (ids: string[] | undefined) =>
  useQuery({
    queryKey: ['genres', ids?.join(',') ?? ''],
    queryFn: () => api.getGenres(ids ?? []),
    enabled: Boolean(ids?.length),
    staleTime: Infinity,
  });

/** Mon entrée pour cette œuvre (`null` : pas dans ma liste). */
export const useEntryForMedia = (mediaId: string) =>
  useQuery({ queryKey: ['entry', mediaId], queryFn: () => api.getListByMedia(mediaId) });

export const useSearch = (kind: MediaKind, term: string) =>
  useInfiniteQuery({
    queryKey: ['search', kind, term],
    queryFn: ({ pageParam }) => api.searchMedia(kind, term, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
    enabled: term.trim().length >= 2,
  });

/** Recherche du catalogue avec filtres et tri (page Animes / Mangas du site), pagination infinie. */
export const useCatalogSearch = (kind: MediaKind, body: IMediaSearchBody) =>
  useInfiniteQuery({
    queryKey: ['catalog', kind, JSON.stringify(body)],
    queryFn: ({ pageParam }) => api.searchCatalog(kind, { ...body, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
    staleTime: FIVE_MINUTES,
  });

export const useTrending = (kind: MediaKind, period: '24h' | '7d' | '30d', enabled: boolean) =>
  useQuery({ queryKey: ['trending', kind, period], queryFn: () => api.getTrending(kind, period), enabled, staleTime: FIVE_MINUTES });

/** Genres, thèmes, démographies ou tags proposés dans le tiroir des filtres. */
export const useMetadataList = (type: string) =>
  useQuery({ queryKey: ['metadata-list', type], queryFn: () => api.searchMetadata(type), staleTime: Infinity });

/** Noms des métadonnées (genres, thèmes…) d'identifiants donnés : résolus par lot comme `useDetailedAnimeCards`. */
export const useMetadataNames = (ids: (string | number)[]) =>
  useQuery({
    queryKey: ['genres', [...new Set(ids)].map(String).sort().join(',')],
    queryFn: () => api.getGenres([...new Set(ids)]),
    enabled: ids.length > 0,
    staleTime: Infinity,
  });

export const useMediaLinks = (kind: MediaKind, id: string, what: 'characters' | 'staffs' | 'tracks' | 'companies') =>
  useQuery({
    queryKey: ['media-links', kind, id, what],
    queryFn: () => api.getMediaLinks(kind, id, what),
    staleTime: FIVE_MINUTES,
  });

export const useAgendaAnimes = () =>
  useQuery({ queryKey: ['agenda-animes'], queryFn: () => api.getAgendaAnimes(), staleTime: FIVE_MINUTES });

export const useSeasonAnimes = (period: 'current' | 'next') =>
  useQuery({ queryKey: ['season-animes', period], queryFn: () => api.getSeasonAnimes(period), staleTime: FIVE_MINUTES });

export const useMemberProfile = (username: string) =>
  useQuery({ queryKey: ['member', username, 'profile'], queryFn: () => api.getMemberProfile(username), enabled: !!username, retry: false });

export const useAffinity = (memberId: string | undefined, enabled: boolean) =>
  useQuery({ queryKey: ['member', memberId, 'affinity'], queryFn: () => api.getAffinity(memberId!), enabled: enabled && !!memberId, retry: false, staleTime: FIVE_MINUTES });

export const useMemberFriends = (memberId: string | undefined, enabled: boolean) =>
  useQuery({ queryKey: ['member', memberId, 'friends-preview'], queryFn: () => api.getMemberFriends(memberId!), enabled: enabled && !!memberId, retry: false, staleTime: FIVE_MINUTES });

export const useMemberStats = (username: string, enabled = true) =>
  useQuery({ queryKey: ['member', username, 'stats'], queryFn: () => api.getMemberStats(username), enabled: enabled && !!username });

/** Liste d'un membre, par pages, filtrable par statut. */
export const useMemberList = (memberId: string | undefined, mediaType: 'Anime' | 'Manga', status: ListStatus | undefined, enabled = true) =>
  useInfiniteQuery({
    queryKey: ['member-list', memberId, mediaType, status ?? 'ALL'],
    queryFn: ({ pageParam }) => api.getMemberList(memberId as string, mediaType, status, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
    enabled: enabled && !!memberId,
  });

export const useMemberFavorites = (memberId: string | undefined, type: FavoriteType | undefined, enabled = true) =>
  useInfiniteQuery({
    queryKey: ['member-favorites', memberId, type ?? 'ALL'],
    queryFn: ({ pageParam }) => api.getMemberFavorites(memberId as string, type, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
    enabled: enabled && !!memberId,
  });

export const useEntity = (kind: EntityKind, id: string) =>
  useQuery({ queryKey: ['entity', kind, id], queryFn: () => api.getEntity(kind, id), staleTime: FIVE_MINUTES, enabled: !!id });

/** Aperçu d'une relation d'une entité (première page). */
export const useEntityRelation = (kind: EntityKind, id: string, relation: EntityRelation, enabled = true) =>
  useQuery({
    queryKey: ['entity-relation', kind, id, relation],
    queryFn: () => api.getEntityRelation(kind, id, relation),
    staleTime: FIVE_MINUTES,
    enabled: enabled && !!id,
  });

export const useMediaNews = (id: string) =>
  useQuery({ queryKey: ['media-news', id], queryFn: () => api.getMediaNews(id), staleTime: FIVE_MINUTES, enabled: !!id });

export const useMediaFollowers = (kind: MediaKind, id: string) =>
  useQuery({ queryKey: ['media-followers', kind, id], queryFn: () => api.getMediaFollowers(kind, id), staleTime: FIVE_MINUTES });

export const useRelations = (kind: MediaKind, id: string) =>
  useQuery({ queryKey: ['relations', kind, id], queryFn: () => api.getRelations(kind, id), staleTime: FIVE_MINUTES });

export const useIsFavorite = (targetId: string | undefined, targetType: 'Anime' | 'Manga') =>
  useQuery({
    queryKey: ['favorite', targetType, targetId],
    queryFn: () => api.isFavorite(targetId as string, targetType).then((r) => r.isFavorited),
    enabled: !!targetId,
  });

export function useToggleFavorite(targetId: string | undefined, targetType: 'Anime' | 'Manga') {
  const client = useQueryClient();
  const key = ['favorite', targetType, targetId];
  return useMutation({
    mutationFn: () => api.toggleFavorite(targetId as string, targetType),
    onMutate: () => client.setQueryData<boolean>(key, (old) => !old),
    onSettled: () => client.invalidateQueries({ queryKey: key }),
  });
}

/** Toute ma liste d'un type (comme `useMyList` du site) : filtres, tri et sections se font sur l'appareil. */
export const useMyEntries = (mediaType: 'Anime' | 'Manga') =>
  useQuery({ queryKey: ['my-list', 'entries', mediaType], queryFn: () => api.getAllMyEntries(mediaType) });

export const useMyList = (mediaType: 'Anime' | 'Manga', status: ListStatus | undefined) =>
  useInfiniteQuery({
    queryKey: ['my-list', mediaType, status ?? 'ALL'],
    queryFn: ({ pageParam }) => api.getMyList({ mediaType, status, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
  });

export const usePendingEntries = () => useQuery({ queryKey: ['pending-entries'], queryFn: api.getPendingListEntries });

export const useListStatistics = () => useQuery({ queryKey: ['list-statistics'], queryFn: api.getListStatistics });

/** Entrées en cours ou prévues d'un type, toutes pages : de quoi calculer retard et planning de « Mon suivi ». */
export const useAllMyList = (mediaType: 'Anime' | 'Manga', status: ListStatus) =>
  useQuery({ queryKey: ['my-list', 'all', mediaType, status], queryFn: () => api.getAllMyList(mediaType, status) });

/** Après un changement de ma liste, tout ce qui l'affiche doit se rafraîchir. */
function useInvalidateList() {
  const client = useQueryClient();
  return (mediaId: string) =>
    Promise.all([
      client.invalidateQueries({ queryKey: ['entry', mediaId] }),
      client.invalidateQueries({ queryKey: ['my-list'] }),
      client.invalidateQueries({ queryKey: ['list-statistics'] }),
    ]);
}

interface ISaveEntryInput {
  mediaId: string;
  mediaType: 'Anime' | 'Manga';
  /** Entrée existante : mise à jour ; sinon création. */
  entry?: IListEntry | null;
  fields: IListEntryFields;
  update: Partial<IListEntryFields>;
}

export function useSaveEntry() {
  const invalidate = useInvalidateList();
  return useMutation({
    mutationFn: ({ mediaId, mediaType, entry, fields, update }: ISaveEntryInput) => {
      const id = entry?.id;
      return id ? api.updateListEntry(id, update) : api.createListEntry({ mediaId, mediaType, ...fields });
    },
    onSuccess: (_data, input) => invalidate(input.mediaId),
  });
}

export function useRemoveEntry() {
  const invalidate = useInvalidateList();
  return useMutation({
    mutationFn: ({ entry }: { entry: IListEntry; mediaId: string }) => api.deleteListEntry(entry.id),
    onSuccess: (_data, input) => invalidate(input.mediaId),
  });
}

/** « +1 » de Ma liste : un épisode vu ou un chapitre lu de plus, sans ouvrir le formulaire. */
export function useQuickProgress() {
  const invalidate = useInvalidateList();
  return useMutation({
    mutationFn: ({ entry }: { entry: IListEntry; mediaId: string }) => {
      const id = entry.id;
      return entry.mediaType === 'Manga'
        ? api.updateListEntry(id, { chaptersRead: (entry.chaptersRead ?? 0) + 1 })
        : api.updateListEntry(id, { episodesWatched: (entry.episodesWatched ?? 0) + 1 });
    },
    onSuccess: (_data, input) => invalidate(input.mediaId),
  });
}

/** Modification rapide d'une entrée (`IListEntryPatch` du site : `progress` = épisodes vus ou chapitres lus). */
export interface IEntryPatch extends Partial<Omit<IListEntryFields, 'score'>> {
  progress?: number;
  /** `null` efface la note. */
  score?: number | null;
}

const toIsoDate = (value: string | null | undefined) => (value ? new Date(value).toISOString() : null);

/**
 * Corps envoyé à l'API pour une modification rapide (`useListPatch` du site) : progression traduite en épisodes
 * ou chapitres, note effacée par 0, dates posées au changement de statut (début, fin, mise en pause).
 */
export function patchToFields(entry: IListEntry, patch: IEntryPatch, now = new Date()): Partial<IListEntryFields> {
  const { progress, score, startedAt, completedAt, onHoldSince, ...rest } = patch;
  const fields: Partial<IListEntryFields> = { ...rest };
  if (progress !== undefined) {
    if (entry.mediaType === 'Manga') fields.chaptersRead = progress;
    else fields.episodesWatched = progress;
  }
  if (score !== undefined) fields.score = score ?? 0;
  const status = patch.status ?? entry.status;
  const statusChanged = patch.status !== undefined && patch.status !== entry.status;
  const stamp = now.toISOString();
  if (statusChanged && (status === 'WATCHING' || status === 'READING') && !entry.startedAt) fields.startedAt = stamp;
  if (statusChanged && status === 'COMPLETED' && !entry.completedAt) fields.completedAt = stamp;
  if (statusChanged && status === 'ON_HOLD') fields.onHoldSince = stamp;
  if (startedAt !== undefined) fields.startedAt = toIsoDate(startedAt);
  if (completedAt !== undefined) fields.completedAt = toIsoDate(completedAt);
  if (onHoldSince !== undefined) fields.onHoldSince = toIsoDate(onHoldSince);
  return fields;
}

/**
 * Applique une modification rapide (+1, statut, note, dates…) tout de suite à l'écran puis à l'API, comme
 * `useListPatch` du site : la liste en cache est mise à jour avant la réponse et restaurée en cas d'échec.
 */
export function usePatchEntry() {
  const client = useQueryClient();
  const invalidate = useInvalidateList();
  return useMutation({
    mutationFn: ({ entry, patch }: { entry: IListEntry; patch: IEntryPatch }) =>
      api.updateListEntry(entry.id, patchToFields(entry, patch)),
    onMutate: async ({ entry, patch }) => {
      // Ma liste complète ET les listes par statut de « Mon suivi » sont mises à jour sur place.
      const keys = [['my-list', 'entries', entry.mediaType ?? 'Anime'], ['my-list', 'all']];
      await Promise.all(keys.map((queryKey) => client.cancelQueries({ queryKey })));
      const previous = keys.flatMap((queryKey) => client.getQueriesData<IListEntry[]>({ queryKey }));
      const fields = patchToFields(entry, patch);
      const id = entry.id;
      for (const queryKey of keys) {
        client.setQueriesData<IListEntry[]>({ queryKey }, (old) =>
          Array.isArray(old) ? old.map((e) => (e.id === id ? { ...e, ...fields, updatedAt: e.updatedAt } : e)) : old,
        );
      }
      return { previous };
    },
    onError: (_error, _input, context) => {
      for (const [queryKey, data] of context?.previous ?? []) client.setQueryData(queryKey, data);
    },
    // Un changement de statut déplace l'entrée d'une liste à l'autre : on recharge. Sans cela (+1, note, dates),
    // la mise à jour sur place suffit : recharger toute la liste (centaines d'entrées) à chaque tape est coûteux.
    onSettled: (_data, _error, { entry, patch }) => {
      if (patch.status !== undefined && patch.status !== entry.status) return invalidate(entry.mediaId ?? '');
      return Promise.all([
        client.invalidateQueries({ queryKey: ['entry', entry.mediaId ?? ''] }),
        client.invalidateQueries({ queryKey: ['list-statistics'] }),
        client.invalidateQueries({ queryKey: ['my-list'], refetchType: 'none' }),
      ]);
    },
  });
}

/** « +1 » d'une carte : un épisode ou un chapitre de plus, « Terminé » au dernier. */
export function nextProgressPatch(entry: IListEntry, total?: number): IEntryPatch | null {
  const progress = (entry.mediaType === 'Manga' ? entry.chaptersRead : entry.episodesWatched) ?? 0;
  return bumpProgress(progress, 1, total);
}
