import { API_URL } from './config';
import { ApiError } from './api-error';
import { markSignedOut } from './auth-store';
import { getAccessToken, refreshSession, type ITokenResponse } from './session';
import { clearAuth } from './storage';

export { ApiError };

interface IRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean;
}

async function send(path: string, method: string, body: unknown, token: string | null): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    return await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'omit',
    });
  } catch {
    throw new ApiError(0, 'Serveur Actunime inaccessible');
  }
}

async function request<T>(path: string, { method = 'GET', body, auth = true }: IRequestOptions = {}): Promise<T> {
  const token = auth ? await getAccessToken() : null;
  let response = await send(path, method, body, token);

  // Jeton refusé : une seule tentative de renouvellement (partagée entre les requêtes simultanées), puis on rejoue.
  if (response.status === 401 && auth && token) {
    const renewed = await refreshSession(token);
    if (renewed && renewed.accessToken !== token) response = await send(path, method, body, renewed.accessToken);
  }

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      message = ((await response.json()) as { message?: string }).message ?? message;
    } catch {
      // corps non JSON
    }
    if (response.status === 401 && auth) {
      await clearAuth();
      markSignedOut();
    }
    throw new ApiError(response.status, message);
  }
  if (response.status === 204) return undefined as T;
  // Certaines routes répondent 200 sans corps (ex. entrée de liste absente) : on lit en texte avant d'interpréter.
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

export type MediaKind = 'anime' | 'manga';
export type ListStatus = 'WATCHING' | 'READING' | 'COMPLETED' | 'ON_HOLD' | 'DROPPED' | 'PLAN_TO_WATCH' | 'PLAN_TO_READ';
export type ListVisibility = 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE';

export interface ISearchMedia {
  id?: string;
  _id?: string;
  title?: { original?: string; normal?: string; alias?: string[] };
  posterUrl?: string | null;
}

/** Fiche d'une œuvre telle que l'API la renvoie (seuls les champs affichés par l'app sont typés). */
export interface IMedia extends ISearchMedia {
  slug?: string;
  synopsis?: string;
  bannerUrl?: string | null;
  /** `AIRING`, `ENDED`, `SOON`… (`MediaStatusObj` côté types). */
  status?: string;
  format?: string;
  date?: { start?: string; end?: string };
  /** Identifiants de métadonnées, à résoudre avec `getGenres`. */
  genres?: string[];
  episodesInfo?: { total?: number; airing?: number; durationMinutes?: number; broadcastPaused?: boolean; nextAiringDate?: string };
  chaptersInfo?: { total?: number };
  volumesInfo?: { total?: number };
  /** Moyenne communautaire : `average` n'est fournie qu'à partir de 3 notes. */
  communityScore?: { average?: number; count: number };
}

export interface IListEntry {
  id?: string;
  _id?: string;
  mediaType?: 'Anime' | 'Manga';
  mediaId?: string;
  status: ListStatus;
  score?: number;
  episodesWatched?: number;
  chaptersRead?: number;
  volumesRead?: number;
  notes?: string;
  notesPublic?: boolean;
  startedAt?: string | null;
  completedAt?: string | null;
  onHoldSince?: string | null;
  rewatchCount?: number;
  visibility?: ListVisibility;
  updatedAt?: string;
  /** Œuvre peuplée (absente pour une entrée en attente de validation). */
  media?: IMedia | null;
  /** Présent quand l'entrée pointe vers une proposition en attente de validation (pas encore d'œuvre). */
  preview?: { title: string; coverImage?: string } | null;
}

/** Champs d'une entrée que le membre peut saisir (corps de création et de mise à jour). */
export interface IListEntryFields {
  status: ListStatus;
  score?: number;
  episodesWatched?: number;
  chaptersRead?: number;
  volumesRead?: number;
  notes?: string;
  notesPublic?: boolean;
  startedAt?: string | null;
  completedAt?: string | null;
  onHoldSince?: string | null;
  rewatchCount?: number;
  visibility?: ListVisibility;
}

export interface IPage<T> {
  results: T[];
  total: number;
  page: number;
  pageCount: number;
  hasNextPage: boolean;
}

export interface IListStatistics {
  total: number;
  animeCount: number;
  mangaCount: number;
  byStatus: { status: ListStatus; count: number }[];
  averageScore?: number;
  totalEpisodesWatched: number;
  totalChaptersRead: number;
}

export interface IGenre {
  id: string;
  name: string;
}

/** Proposition d'ajout d'une œuvre, tant qu'elle n'est pas validée par la modération. */
export interface IPendingProposal {
  id?: string;
  _id?: string;
  mainDependency?: {
    title?: { original?: string; alias?: string[] };
    poster?: { url?: string; file?: string };
  };
}

export const mediaId = (e: { id?: string; _id?: string }): string => (e.id ?? e._id) as string;

const kindPath = (kind: MediaKind) => (kind === 'manga' ? '/mangas' : '/animes');

export const api = {
  exchangeCode(code: string, codeVerifier: string) {
    return request<
      ITokenResponse & {
        user: { id: string; username: string; displayName?: string; avatarUrl?: string | null };
      }
    >('/auth/extension/exchange', { method: 'POST', body: { code, codeVerifier }, auth: false });
  },

  searchByKind(kind: MediaKind, search: string, limit = 6) {
    return request<{ results?: ISearchMedia[]; data?: ISearchMedia[] }>(kindPath(kind), {
      method: 'POST',
      body: { query: { search }, limit, page: 1 },
    }).then((res) => res.results ?? res.data ?? []);
  },

  /** Recherche paginée pour l'écran Recherche (œuvres vérifiées, publique). */
  searchMedia(kind: MediaKind, search: string, page = 1, limit = 20) {
    return request<IPage<IMedia>>(kindPath(kind), {
      method: 'POST',
      body: { query: { search }, limit, page },
      auth: false,
    });
  },

  getMedia(kind: MediaKind, id: string) {
    return request<IMedia>(`${kindPath(kind)}?id=${encodeURIComponent(id)}`, { auth: false });
  },

  /** Animes de la saison en cours, par date de début. */
  getSeasonAnimes(limit = 20) {
    return request<IPage<IMedia>>('/animes', {
      method: 'POST',
      body: { query: { verified: true, seasonPeriod: 'current' }, sort: { 'date.start': 'asc' }, limit, page: 1 },
      auth: false,
    }).then((res) => res.results);
  },

  /** Identifiants des œuvres en tendance (à compléter avec `getMedia`). */
  getTrendingIds(type: 'Anime' | 'Manga', period: '24h' | '7d' | '30d' = '7d', limit = 10) {
    return request<{ entities: { entityId: string }[] }>(`/trending?type=${type}&period=${period}&limit=${limit}`, {
      auth: false,
    }).then((res) => res.entities.map((e) => e.entityId));
  },

  getGenres(ids: string[]) {
    if (ids.length === 0) return Promise.resolve([] as IGenre[]);
    return request<IGenre[]>('/metadata/by-ids', {
      method: 'POST',
      body: { ids: ids.map(Number) },
      auth: false,
    });
  },

  getListByMedia(id: string) {
    return request<IListEntry | null>(`/lists/by-media/${id}`);
  },

  /** Ma liste, une page à la fois, filtrée par type et statut (œuvres peuplées). */
  getMyList(params: { mediaType: 'Anime' | 'Manga'; status?: ListStatus; page?: number; limit?: number }) {
    const { mediaType, status, page = 1, limit = 30 } = params;
    return request<IPage<IListEntry>>('/lists', {
      method: 'POST',
      body: { page, limit, query: { mediaType, ...(status ? { status } : {}) } },
    });
  },

  getListStatistics() {
    return request<IListStatistics>('/lists/statistics');
  },

  createListEntry(body: { mediaId: string; mediaType: 'Anime' | 'Manga' } & IListEntryFields) {
    return request<IListEntry>('/lists/create', { method: 'POST', body });
  },

  /** Entrées de ma liste dont l'œuvre est encore en attente de validation. */
  getPendingListEntries() {
    return request<IListEntry[]>('/lists/pending');
  },

  /** Propositions d'ajout en attente (celles de tous les membres) dont le titre correspond. */
  searchPendingProposals(kind: MediaKind, search: string, limit = 5) {
    return request<{ results?: IPendingProposal[]; data?: IPendingProposal[] }>('/proposals/paginate', {
      method: 'POST',
      body: {
        query: { search, status: 'PENDING', mode: 'CREATION', entityType: kind === 'manga' ? 'Manga' : 'Anime' },
        limit,
        page: 1,
      },
    }).then((res) => res.results ?? res.data ?? []);
  },

  /** Ajoute à ma liste une œuvre proposée mais pas encore validée. */
  createListEntryFromProposal(body: {
    proposalId: string;
    mediaType: 'Anime' | 'Manga';
    status: string;
    preview: { title: string; coverImage?: string };
  }) {
    return request<IListEntry>('/lists/from-proposal', { method: 'POST', body });
  },

  updateListEntry(id: string, patch: Partial<IListEntryFields>) {
    return request<IListEntry>(`/lists/${id}`, { method: 'PUT', body: patch });
  },

  deleteListEntry(id: string) {
    return request<unknown>(`/lists/${id}`, { method: 'DELETE' });
  },
};
