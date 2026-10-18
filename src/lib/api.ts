import { API_URL } from './config';
import { clearAuth, getAuth } from './storage';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface IRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean;
}

async function request<T>(
  path: string,
  { method = 'GET', body, auth = true }: IRequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const state = await getAuth();
    if (state) headers.Authorization = `Bearer ${state.accessToken}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'omit',
    });
  } catch {
    throw new ApiError(0, 'Serveur Actunime inaccessible');
  }

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      message = ((await response.json()) as { message?: string }).message ?? message;
    } catch {
      // corps non JSON
    }
    if (response.status === 401 && auth) await clearAuth();
    throw new ApiError(response.status, message);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export interface ISearchMedia {
  id?: string;
  _id?: string;
  title?: { original?: string; normal?: string; alias?: string[] };
  posterUrl?: string | null;
}

export interface IListEntry {
  id?: string;
  _id?: string;
  status: string;
  episodesWatched?: number;
  chaptersRead?: number;
}

export const mediaId = (e: { id?: string; _id?: string }): string => (e.id ?? e._id) as string;

export const api = {
  exchangeCode(code: string, codeVerifier: string) {
    return request<{
      accessToken: string;
      expiresIn: number;
      user: { id: string; username: string; displayName?: string; avatarUrl?: string | null };
    }>('/auth/extension/exchange', { method: 'POST', body: { code, codeVerifier }, auth: false });
  },

  searchByKind(kind: 'anime' | 'manga', search: string, limit = 6) {
    return request<{ results?: ISearchMedia[]; data?: ISearchMedia[] }>(
      kind === 'manga' ? '/mangas' : '/animes',
      {
        method: 'POST',
        body: { query: { search }, limit, page: 1 },
      },
    ).then((res) => res.results ?? res.data ?? []);
  },

  getListByMedia(id: string) {
    return request<IListEntry>(`/lists/by-media/${id}`);
  },

  createListEntry(body: {
    mediaId: string;
    mediaType: 'Anime' | 'Manga';
    status: string;
    episodesWatched?: number;
    chaptersRead?: number;
  }) {
    return request<IListEntry>('/lists/create', { method: 'POST', body });
  },

  updateListEntry(id: string, patch: { episodesWatched?: number; chaptersRead?: number }) {
    return request<IListEntry>(`/lists/${id}`, { method: 'PUT', body: patch });
  },
};
