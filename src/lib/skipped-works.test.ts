import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (key: string) => store.get(key) ?? null,
    setItem: async (key: string, value: string) => void store.set(key, value),
  },
}));

import { firstSight, parseSkipped, resetSession, resumeWork, skipModeOf, skipWork } from './skipped-works';

beforeEach(() => {
  store.clear();
  resetSession();
});

describe('œuvres non suivies', () => {
  it('« pas pour le moment » ne survit pas à la session, « ne plus suivre » si', async () => {
    await skipWork('manga|x', 'session');
    await skipWork('manga|y', 'forever');
    expect(await skipModeOf('manga|x')).toBe('session');
    expect(await skipModeOf('manga|y')).toBe('forever');
    expect(store.get('actunime.skippedWorks')).toBe(JSON.stringify(['manga|y']));

    resetSession();
    expect(await skipModeOf('manga|x')).toBeNull();
    expect(await skipModeOf('manga|y')).toBe('forever');
  });

  it('reprendre le suivi efface les deux façons de mettre de côté', async () => {
    await skipWork('manga|x', 'session');
    await skipWork('manga|y', 'forever');
    await resumeWork('manga|x');
    await resumeWork('manga|y');
    expect(await skipModeOf('manga|x')).toBeNull();
    expect(await skipModeOf('manga|y')).toBeNull();
    expect(store.get('actunime.skippedWorks')).toBe('[]');
  });

  it('une œuvre rendue définitive quitte la liste de session', async () => {
    await skipWork('manga|x', 'session');
    await skipWork('manga|x', 'forever');
    resetSession();
    expect(await skipModeOf('manga|x')).toBe('forever');
  });

  it('le panneau ne s’annonce qu’à la première rencontre', () => {
    expect(firstSight('manga|x')).toBe(true);
    expect(firstSight('manga|x')).toBe(false);
    expect(firstSight('manga|y')).toBe(true);
  });

  it('lit une valeur abîmée comme une liste vide', () => {
    expect(parseSkipped(null)).toEqual([]);
    expect(parseSkipped('pas du json')).toEqual([]);
    expect(parseSkipped('{"a":1}')).toEqual([]);
    expect(parseSkipped('["a",3,"b"]')).toEqual(['a', 'b']);
  });
});
