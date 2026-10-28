import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { IAuthState } from './storage';

const db = vi.hoisted(() => ({ stored: null as IAuthState | null }));
const clearAuth = vi.hoisted(() => vi.fn(async () => void (db.stored = null)));

vi.mock('./storage', () => ({
  getAuth: async () => db.stored,
  setAuth: async (auth: IAuthState) => void (db.stored = auth),
  clearAuth,
}));

import { api, ApiError } from './api';
import { sessionFromTokens } from './session';

const user = { id: 'u1', username: 'maud' };
const NOW = 1_800_000_000_000;

const session = (overrides: Partial<IAuthState> = {}): IAuthState => ({
  accessToken: 'access-1',
  expiresAt: NOW + 3_600_000,
  refreshToken: 'refresh-1',
  refreshExpiresAt: NOW + 30 * 86_400_000,
  user,
  ...overrides,
});

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>();
const refreshCalls = () => fetchMock.mock.calls.filter(([url]) => url.endsWith('/auth/extension/refresh'));
const bearerOf = (call: [string, RequestInit]) => (call[1].headers as Record<string, string>).Authorization;

const renewedTokens = {
  accessToken: 'access-2',
  expiresIn: 604_800,
  refreshToken: 'refresh-2',
  refreshExpiresIn: 2_592_000,
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  db.stored = session();
  clearAuth.mockClear();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('sessionFromTokens', () => {
  it('garde le jeton de renouvellement et son échéance, avec une minute de marge', () => {
    const result = sessionFromTokens(renewedTokens, user, NOW);

    expect(result.accessToken).toBe('access-2');
    expect(result.expiresAt).toBe(NOW + 604_800_000 - 60_000);
    expect(result.refreshToken).toBe('refresh-2');
    expect(result.refreshExpiresAt).toBe(NOW + 2_592_000_000 - 60_000);
  });

  it('reste compatible avec un échange sans jeton de renouvellement (API pas encore déployée)', () => {
    const result = sessionFromTokens({ accessToken: 'a', expiresIn: 604_800 }, user, NOW);

    expect(result.refreshToken).toBeUndefined();
    expect(result.refreshExpiresAt).toBeUndefined();
  });
});

describe('requête authentifiée', () => {
  it('envoie le jeton d’accès tel quel tant qu’il est valide, sans renouveler', async () => {
    fetchMock.mockResolvedValue(json(200, { total: 1 }));

    await api.getListStatistics();

    expect(refreshCalls()).toHaveLength(0);
    expect(bearerOf(fetchMock.mock.calls[0] as [string, RequestInit])).toBe('Bearer access-1');
  });

  it('renouvelle avant l’expiration, enregistre les nouveaux jetons (rotation) et utilise le nouveau jeton', async () => {
    db.stored = session({ expiresAt: NOW + 10_000 });
    fetchMock.mockImplementation(async (url) =>
      url.endsWith('/auth/extension/refresh') ? json(200, renewedTokens) : json(200, { total: 1 }),
    );

    await api.getListStatistics();

    expect(JSON.parse(refreshCalls()[0][1].body as string)).toEqual({ refreshToken: 'refresh-1' });
    expect(db.stored?.accessToken).toBe('access-2');
    expect(db.stored?.refreshToken).toBe('refresh-2');
    expect(bearerOf(fetchMock.mock.calls[1] as [string, RequestInit])).toBe('Bearer access-2');
  });

  it('mutualise le renouvellement entre des requêtes simultanées', async () => {
    db.stored = session({ expiresAt: NOW - 1 });
    fetchMock.mockImplementation(async (url) =>
      url.endsWith('/auth/extension/refresh') ? json(200, renewedTokens) : json(200, { total: 1 }),
    );

    await Promise.all([api.getListStatistics(), api.getListStatistics(), api.getPendingListEntries()]);

    expect(refreshCalls()).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('sur 401, renouvelle une fois puis rejoue la requête', async () => {
    fetchMock.mockImplementation(async (url, init) => {
      if (url.endsWith('/auth/extension/refresh')) return json(200, renewedTokens);
      const token = (init.headers as Record<string, string>).Authorization;
      return token === 'Bearer access-2' ? json(200, { total: 7 }) : json(401, { message: 'expired' });
    });

    await expect(api.getListStatistics()).resolves.toEqual({ total: 7 });
    expect(refreshCalls()).toHaveLength(1);
    expect(clearAuth).not.toHaveBeenCalled();
  });

  it('mutualise le renouvellement de plusieurs requêtes refusées en même temps', async () => {
    fetchMock.mockImplementation(async (url, init) => {
      if (url.endsWith('/auth/extension/refresh')) return json(200, renewedTokens);
      const token = (init.headers as Record<string, string>).Authorization;
      return token === 'Bearer access-2' ? json(200, { ok: true }) : json(401, { message: 'expired' });
    });

    await Promise.all([api.getListStatistics(), api.getPendingListEntries(), api.getListByMedia('m1')]);

    expect(refreshCalls()).toHaveLength(1);
  });

  it('ne tente pas deux fois : un rejeu encore refusé déconnecte', async () => {
    fetchMock.mockImplementation(async (url) =>
      url.endsWith('/auth/extension/refresh') ? json(200, renewedTokens) : json(401, { message: 'no' }),
    );

    await expect(api.getListStatistics()).rejects.toMatchObject({ status: 401 });

    expect(refreshCalls()).toHaveLength(1);
    expect(clearAuth).toHaveBeenCalledTimes(1);
  });

  it('déconnecte quand le renouvellement est refusé (expiré, révoqué ou réutilisé)', async () => {
    fetchMock.mockImplementation(async (url) =>
      url.endsWith('/auth/extension/refresh') ? json(401, { message: 'revoked' }) : json(401, { message: 'expired' }),
    );

    await expect(api.getListStatistics()).rejects.toBeInstanceOf(ApiError);

    expect(refreshCalls()).toHaveLength(1);
    expect(db.stored).toBeNull();
  });

  it('garde la session quand le renouvellement échoue faute de réseau', async () => {
    db.stored = session({ expiresAt: NOW + 10_000 });
    fetchMock.mockImplementation(async (url) => {
      if (url.endsWith('/auth/extension/refresh')) throw new TypeError('network');
      return json(200, { total: 1 });
    });

    await api.getListStatistics();

    expect(clearAuth).not.toHaveBeenCalled();
    expect(bearerOf(fetchMock.mock.calls[1] as [string, RequestInit])).toBe('Bearer access-1');
  });

  it('sans jeton de renouvellement (ancienne session), un 401 déconnecte comme avant', async () => {
    db.stored = session({ refreshToken: undefined, refreshExpiresAt: undefined });
    fetchMock.mockResolvedValue(json(401, { message: 'expired' }));

    await expect(api.getListStatistics()).rejects.toMatchObject({ status: 401 });

    expect(refreshCalls()).toHaveLength(0);
    expect(clearAuth).toHaveBeenCalledTimes(1);
  });

  it('lit une réponse 200 sans corps comme « aucune entrée »', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 200 }));

    await expect(api.getListByMedia('m1')).resolves.toBeNull();
  });
});

