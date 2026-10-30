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
  title?: { original?: string; normal?: string; alias?: string[]; aliasNormal?: string[] };
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
  /** Source de l'adaptation (`MANGA`, `LIGHT_NOVEL`…, `MediaSourceObj`). */
  source?: string;
  vf?: boolean;
  verified?: boolean;
  adult?: boolean;
  /** Saison de la série (`getSeasonLabel` : « Saison 2 », « Saison 2 Partie 1 »). */
  season?: { number: number; part?: number } | null;
  date?: { start?: string; end?: string; startPrecision?: 'day' | 'month' | 'year'; endPrecision?: 'day' | 'month' | 'year' };
  /** Identifiants de métadonnées, à résoudre avec `getGenres`. */
  genres?: string[];
  themes?: string[];
  demographics?: string[];
  tags?: { id: number; data?: { name?: string } | null }[];
  trailers?: { url: string }[];
  episodesInfo?: { total?: number; airing?: number; durationMinutes?: number; broadcastPaused?: boolean; nextAiringDate?: string };
  chaptersInfo?: { total?: number; airing?: number };
  /** Liens officiels et de lecture/streaming. */
  links?: { url: string; name?: string }[];
  country?: string;
  audience?: 'ALL' | 'TEEN' | 'MATURE' | null;
  posterId?: string;
  volumesInfo?: { total?: number; airing?: number };
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
  createdAt?: string;
  /** `PENDING` : œuvre proposée pas encore référencée ; `REJECTED` : proposition refusée. */
  listEntryStatus?: 'ACTIVE' | 'PENDING' | 'REJECTED';
  proposalId?: string;
  /** Moyenne de la communauté pour l'œuvre (absente sous 3 notes). */
  communityScore?: { average?: number; count: number };
  /** Amis qui ont aussi l'œuvre (ma propre liste seulement, absent si aucun ami ne l'a). */
  friends?: IFriendEntry[];
  friendsSummary?: { count: number; average?: number; completed: number };
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

/** Ce qu'un ami a mis sur une œuvre de ma liste (`friend-entries.ts` de l'API). */
export interface IFriendEntry {
  memberId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string | null;
  status: ListStatus;
  score?: number;
  episodesWatched?: number;
  chaptersRead?: number;
}

/** Statistiques de ma liste, telles que `GET /lists/statistics` les renvoie (`ListsService.getStatistics`). */
export interface IListStatistics {
  total: number;
  anime: { total: number; completed: number; watching: number; onHold: number; dropped: number; planToWatch: number };
  manga: { total: number; completed: number; reading: number; onHold: number; dropped: number; planToRead: number };
}

/** Requête d'une page de recherche (`IAnimePaginationBody` / `IMangaPaginationBody`). */
export interface IMediaSearchBody {
  query?: Record<string, unknown>;
  sort?: Record<string, 'asc' | 'desc' | undefined>;
  page?: number;
  limit?: number;
  onlyVerified?: boolean;
}

/** Membres qui suivent une œuvre (`GET /community/media-followers/:type/:id`, `IMediaFollowersInfo`). */
export interface IMediaFollowerEntry {
  member: { id: string; username: string; displayName?: string; avatarUrl?: string | null };
  status: ListStatus;
  progress?: number;
  updatedAt: string;
}
export interface IMediaFollowers {
  count: number;
  friendsCount: number;
  friendEntries?: IMediaFollowerEntry[];
  statusCounts?: Partial<Record<ListStatus, number>>;
  recentFollowers?: IMediaFollowerEntry[];
}

export interface IMetadata {
  id: string;
  name: string;
  type?: string;
}

/** Personnage, membre du staff, musique ou société liés à une œuvre (`I*Relation` : la fiche liée est dans `data`). */
export interface IMediaLink {
  id?: string;
  role?: string;
  job?: number;
  label?: string;
  type?: string;
  data?: {
    id: string;
    name?: { original?: string; alias?: string[] };
    avatarUrl?: string | null;
    logoUrl?: string | null;
    coverUrl?: string | null;
    type?: string;
  } | null;
}

/** Relations d'une œuvre (suites, préquelles, adaptations : `GET /media-relations/carousel`). */
export interface IMediaRelation {
  id: string;
  label?: number;
  season?: { number: number; part?: number } | null;
  targetType: 'Anime' | 'Manga';
  targetId: string;
  target?: IMedia | null;
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

  /** Page de recherche avec filtres et tri, comme la page Animes / Mangas du site. */
  searchCatalog(kind: MediaKind, body: IMediaSearchBody) {
    return request<IPage<IMedia>>(kindPath(kind), { method: 'POST', body, auth: false });
  },

  /** Métadonnées d'un type (genres, thèmes, démographies, tags) pour le tiroir des filtres. */
  searchMetadata(type: string, search = '') {
    return request<IMetadata[]>('/metadata/search', { method: 'POST', body: { type, search }, auth: false });
  },

  /** Aperçu des personnages, du staff, des musiques ou des sociétés d'une œuvre. */
  getMediaLinks(kind: MediaKind, id: string, what: 'characters' | 'staffs' | 'tracks' | 'companies', limit = 12) {
    return request<IPage<IMediaLink>>(`${kindPath(kind)}/${id}/${what}`, {
      method: 'POST',
      body: { page: 1, limit },
      auth: false,
    });
  },

  getMediaFollowers(kind: MediaKind, id: string) {
    return request<IMediaFollowers>(`/community/media-followers/${kind === 'manga' ? 'Manga' : 'Anime'}/${encodeURIComponent(id)}`);
  },

  getRelations(kind: MediaKind, id: string) {
    const mediaType = kind === 'manga' ? 'Manga' : 'Anime';
    return request<{ direct: IMediaRelation[]; indirect: IMediaRelation[] }>(
      `/media-relations/carousel?mediaId=${encodeURIComponent(id)}&mediaType=${mediaType}`,
      { auth: false },
    );
  },

  /** Tendances d'une période (`useTrendingAnimes` du site) : fiches vérifiées dans l'ordre du classement. */
  async getTrending(kind: MediaKind, period: '24h' | '7d' | '30d') {
    const res = await request<{ entities?: { entityId: string }[] }>(
      `/trending?period=${period}&type=${kind === 'manga' ? 'Manga' : 'Anime'}&limit=20`,
      { auth: false },
    );
    const medias = await Promise.all(
      (res.entities ?? []).map((e) => request<IMedia>(`${kindPath(kind)}?id=${encodeURIComponent(e.entityId)}`, { auth: false }).catch(() => null)),
    );
    return medias.filter((m): m is IMedia => m?.verified === true);
  },

  getMedia(kind: MediaKind, id: string) {
    return request<IMedia>(`${kindPath(kind)}?id=${encodeURIComponent(id)}`, { auth: false });
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

  /** Toute ma liste d'un type, tous statuts (pages de 200 enchaînées, comme `useMyList` du site). */
  async getAllMyEntries(mediaType: 'Anime' | 'Manga'): Promise<IListEntry[]> {
    const entries: IListEntry[] = [];
    for (let page = 1; page <= 50; page++) {
      const res = await request<IPage<IListEntry>>('/lists', {
        method: 'POST',
        body: { page, limit: 200, query: { mediaType } },
      });
      entries.push(...res.results);
      if (!res.hasNextPage) break;
    }
    return entries;
  },

  /** Toutes les entrées de ma liste pour un type et un statut (pages de 100 enchaînées), œuvres peuplées. */
  async getAllMyList(mediaType: 'Anime' | 'Manga', status: ListStatus): Promise<IListEntry[]> {
    const entries: IListEntry[] = [];
    for (let page = 1; page <= 20; page++) {
      const res = await request<IPage<IListEntry>>('/lists', {
        method: 'POST',
        body: { page, limit: 100, query: { mediaType, status } },
      });
      entries.push(...res.results);
      if (!res.hasNextPage) break;
    }
    return entries;
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

  /** L'œuvre est-elle dans mes favoris ? */
  isFavorite(targetId: string, targetType: 'Anime' | 'Manga') {
    return request<{ isFavorited: boolean }>(`/favoris/check?targetId=${encodeURIComponent(targetId)}&targetType=${targetType}`);
  },

  toggleFavorite(targetId: string, targetType: 'Anime' | 'Manga') {
    return request<{ action: 'added' | 'removed' }>('/favoris/toggle', { method: 'POST', body: { targetId, targetType } });
  },

  updateListEntry(id: string, patch: Partial<IListEntryFields>) {
    return request<IListEntry>(`/lists/${id}`, { method: 'PUT', body: patch });
  },

  deleteListEntry(id: string) {
    return request<unknown>(`/lists/${id}`, { method: 'DELETE' });
  },
};
