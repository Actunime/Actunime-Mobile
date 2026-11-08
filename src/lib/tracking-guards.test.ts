import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: async (k: string) => store.get(k) ?? null, setItem: async (k: string, v: string) => void store.set(k, v) },
}));
vi.mock('expo-secure-store', () => ({ getItemAsync: vi.fn(), setItemAsync: vi.fn(), deleteItemAsync: vi.fn() }));

import type { PageDetection } from '@/detection/messages';

import { resetSession, skipWork } from './skipped-works';
import { matchKey } from './sync';
import { progressAllowed } from './tracking-guards';

const page = (title: string): PageDetection => ({ kind: 'manga', title, url: `https://x/${title}`, host: 'x', source: 'auto', chapter: 3 }) as PageDetection;

beforeEach(() => {
  store.clear();
  resetSession();
});

describe('progressAllowed', () => {
  it('autorise la page affichée d’une œuvre suivie', async () => {
    expect(await progressAllowed(page('Solo Leveling'), page('Solo Leveling'))).toBe(true);
    expect(await progressAllowed(page('Solo Leveling'), null)).toBe(true);
  });

  it('refuse une page déjà quittée : le message d’une œuvre précédente n’écrit rien', async () => {
    expect(await progressAllowed(page('Ancienne œuvre'), page('Nouvelle œuvre'))).toBe(false);
  });

  it('refuse une œuvre mise de côté, pour le moment ou pour de bon', async () => {
    await skipWork(matchKey(page('A')), 'session');
    await skipWork(matchKey(page('B')), 'forever');
    expect(await progressAllowed(page('A'), page('A'))).toBe(false);
    expect(await progressAllowed(page('B'), page('B'))).toBe(false);
    expect(await progressAllowed(page('C'), page('C'))).toBe(true);
  });
});
