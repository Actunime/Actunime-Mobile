import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  api,
  type IListEntry,
  type IListEntryFields,
  type IMedia,
  type ListStatus,
  type MediaKind,
} from './api';

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

export const useMyList = (mediaType: 'Anime' | 'Manga', status: ListStatus | undefined) =>
  useInfiniteQuery({
    queryKey: ['my-list', mediaType, status ?? 'ALL'],
    queryFn: ({ pageParam }) => api.getMyList({ mediaType, status, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
  });

export const usePendingEntries = () => useQuery({ queryKey: ['pending-entries'], queryFn: api.getPendingListEntries });

export const useListStatistics = () => useQuery({ queryKey: ['list-statistics'], queryFn: api.getListStatistics });

/** Les 10 œuvres en tendance, complétées par leur fiche (une œuvre introuvable est ignorée). */
export const useTrending = (type: 'Anime' | 'Manga') =>
  useQuery({
    queryKey: ['trending', type],
    staleTime: FIVE_MINUTES,
    queryFn: async () => {
      const ids = await api.getTrendingIds(type);
      const kind: MediaKind = type === 'Manga' ? 'manga' : 'anime';
      const medias = await Promise.all(ids.map((id) => api.getMedia(kind, id).catch(() => null)));
      return medias.filter((media): media is IMedia => media !== null);
    },
  });

export const useSeasonAnimes = () =>
  useQuery({ queryKey: ['season'], queryFn: () => api.getSeasonAnimes(), staleTime: FIVE_MINUTES });

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
      const id = entry?.id ?? entry?._id;
      return id ? api.updateListEntry(id, update) : api.createListEntry({ mediaId, mediaType, ...fields });
    },
    onSuccess: (_data, input) => invalidate(input.mediaId),
  });
}

export function useRemoveEntry() {
  const invalidate = useInvalidateList();
  return useMutation({
    mutationFn: ({ entry }: { entry: IListEntry; mediaId: string }) => api.deleteListEntry((entry.id ?? entry._id) as string),
    onSuccess: (_data, input) => invalidate(input.mediaId),
  });
}
