import { describe, expect, it, vi } from 'vitest';

import { CHECK_INTERVAL_MS, fetchLatestRelease, isNewer, parseManifest, pickRelease, shouldCheck } from './updates';

const SHA = 'a'.repeat(64);
const release = (overrides: Record<string, unknown> = {}) => ({
  draft: false,
  assets: [
    { name: 'latest.json', browser_download_url: 'https://dl.example/latest.json' },
    { name: 'actunime-mobile-beta-7.apk', browser_download_url: 'https://dl.example/app-7.apk' },
  ],
  ...overrides,
});
const manifest = (overrides: Record<string, unknown> = {}) => ({
  version: '0.1.0-beta.7',
  versionCode: 7,
  sha256: SHA,
  apk: 'actunime-mobile-beta-7.apk',
  notes: 'fix: un correctif',
  ...overrides,
});

describe('shouldCheck / isNewer', () => {
  it('une recherche par jour, sauf demande explicite', () => {
    const now = 1_000_000_000;
    expect(shouldCheck(undefined, now)).toBe(true);
    expect(shouldCheck(now - 1000, now)).toBe(false);
    expect(shouldCheck(now - CHECK_INTERVAL_MS, now)).toBe(true);
    expect(shouldCheck(now - 1000, now, true)).toBe(true);
  });

  it('seul un versionCode plus grand est une mise à jour', () => {
    expect(isNewer(8, 7)).toBe(true);
    expect(isNewer(7, 7)).toBe(false);
    expect(isNewer(6, 7)).toBe(false);
  });
});

describe('pickRelease / parseManifest', () => {
  it('prend la première release publiée qui porte une fiche, pas un brouillon ni une release sans fiche', () => {
    const picked = pickRelease([{ draft: true, assets: release().assets }, { draft: false, assets: [] }, release()]);
    expect(picked?.manifestUrl).toBe('https://dl.example/latest.json');
    expect(pickRelease([])).toBeNull();
    expect(pickRelease('pas une liste')).toBeNull();
  });

  it('valide la fiche et retrouve l’adresse de l’APK', () => {
    expect(parseManifest(manifest(), release())).toEqual({
      version: '0.1.0-beta.7',
      versionCode: 7,
      sha256: SHA,
      apkUrl: 'https://dl.example/app-7.apk',
      notes: 'fix: un correctif',
    });
  });

  it('refuse une fiche incomplète ou suspecte', () => {
    expect(parseManifest(manifest({ sha256: 'trop court' }), release())).toBeNull();
    expect(parseManifest(manifest({ versionCode: '7' }), release())).toBeNull();
    expect(parseManifest(manifest({ versionCode: 0 }), release())).toBeNull();
    expect(parseManifest(manifest({ apk: 'absent.apk' }), release())).toBeNull();
    expect(parseManifest(null, release())).toBeNull();
  });
});

describe('fetchLatestRelease', () => {
  const respond = (body: unknown, ok = true, status = 200) => ({ ok, status, json: async () => body }) as Response;

  it('lit la liste puis la fiche', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(respond([release()])).mockResolvedValueOnce(respond(manifest()));
    const info = await fetchLatestRelease('https://api.example/releases', fetchImpl as unknown as typeof fetch);
    expect(info?.versionCode).toBe(7);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('rend null sans release, et signale une erreur du serveur', async () => {
    const none = vi.fn().mockResolvedValueOnce(respond([]));
    expect(await fetchLatestRelease('x', none as unknown as typeof fetch)).toBeNull();
    const down = vi.fn().mockResolvedValueOnce(respond({}, false, 503));
    await expect(fetchLatestRelease('x', down as unknown as typeof fetch)).rejects.toThrow('503');
  });
});
