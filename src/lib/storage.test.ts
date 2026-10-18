import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (key: string) => store.get(key) ?? null,
    setItem: async (key: string, value: string) => void store.set(key, value),
  },
}));
vi.mock('expo-secure-store', () => ({ getItemAsync: vi.fn(), setItemAsync: vi.fn(), deleteItemAsync: vi.fn() }));

import { getMatches, saveMatch } from './storage';

beforeEach(() => store.clear());

describe('associations œuvre ↔ détection', () => {
  it('relit une association enregistrée par la première version (mediaId, sans kind) comme une œuvre validée', async () => {
    store.set('actunime.matches', JSON.stringify({ 'manga|solo leveling': { mediaId: 'm1', title: 'Solo Leveling' } }));

    expect((await getMatches())['manga|solo leveling']).toEqual({ kind: 'media', id: 'm1', title: 'Solo Leveling' });
  });

  it('conserve une association en attente de validation', async () => {
    await saveMatch('manga|x', { kind: 'pending', id: 'e1', title: 'X' });

    expect((await getMatches())['manga|x']).toEqual({ kind: 'pending', id: 'e1', title: 'X' });
  });
});
