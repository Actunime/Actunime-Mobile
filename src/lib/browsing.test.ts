import { describe, expect, it } from 'vitest';

import { agoLabel, hostOf, MAX_LAST_READS, MAX_RECENT_SITES, mergeLastRead, removeSite, siteHome, togglePinned, upsertSite, type IBrowserSite } from './browsing';

describe('hostOf', () => {
  it('retire www. et ne garde que http(s)', () => {
    expect(hostOf('https://www.crunchyroll.com/fr/watch/abc')).toBe('crunchyroll.com');
    expect(hostOf('about:blank')).toBeNull();
    expect(hostOf('pas une url')).toBeNull();
  });
});

describe('upsertSite', () => {
  it('place le site visité en tête et garde un seul exemplaire par hôte', () => {
    const first = upsertSite([], 'https://adn.com/video/1', 1);
    const second = upsertSite(first, 'https://crunchyroll.com/', 2);
    const third = upsertSite(second, 'https://www.adn.com/video/2', 3);
    expect(third.map((site) => site.host)).toEqual(['adn.com', 'crunchyroll.com']);
    expect(third[0]!.url).toBe('https://www.adn.com/video/2');
  });

  it('ignore les moteurs de recherche et les pages sans hôte', () => {
    expect(upsertSite([], 'https://duckduckgo.com/?q=one+piece', 1)).toEqual([]);
    expect(upsertSite([], 'about:blank', 1)).toEqual([]);
  });

  it('limite les récents mais jamais les épinglés', () => {
    let sites: IBrowserSite[] = upsertSite([], 'https://epingle.com/', 0);
    sites = togglePinned(sites, 'epingle.com');
    for (let i = 1; i <= MAX_RECENT_SITES + 3; i += 1) sites = upsertSite(sites, `https://site${i}.com/`, i);
    expect(sites.filter((site) => !site.pinned)).toHaveLength(MAX_RECENT_SITES);
    expect(sites[0]!.host).toBe('epingle.com');
  });

  it('un site épinglé le reste après une nouvelle visite', () => {
    const pinned = togglePinned(upsertSite([], 'https://adn.com/a', 1), 'adn.com');
    expect(upsertSite(pinned, 'https://adn.com/b', 2)[0]).toMatchObject({ pinned: true, url: 'https://adn.com/b' });
  });
});

describe('removeSite / siteHome', () => {
  it('oublie un site et rouvre la racine', () => {
    const sites = upsertSite([], 'https://adn.com/video/1', 1);
    expect(removeSite(sites, 'adn.com')).toEqual([]);
    expect(siteHome(sites[0]!)).toBe('https://adn.com/');
  });
});

describe('mergeLastRead', () => {
  const read = (number: number, at: number) => ({ url: `https://m.com/ch/${number}`, number, host: 'm.com', at });

  it('avance avec la lecture et ne recule pas sur un ancien chapitre', () => {
    const a = mergeLastRead({}, 'manga:1', read(10, 1));
    const b = mergeLastRead(a, 'manga:1', read(5, 2));
    expect(b).toBe(a);
    expect(mergeLastRead(b, 'manga:1', read(11, 3))['manga:1']!.number).toBe(11);
  });

  it('écarte les œuvres les plus anciennes au-delà de la limite', () => {
    let all = {};
    for (let i = 0; i <= MAX_LAST_READS; i += 1) all = mergeLastRead(all, `manga:${i}`, read(1, i));
    expect(Object.keys(all)).toHaveLength(MAX_LAST_READS);
    expect(all).not.toHaveProperty('manga:0');
  });
});

describe('agoLabel', () => {
  const now = Date.UTC(2026, 9, 30, 12);
  it('donne un repère court', () => {
    expect(agoLabel(now - 3_600_000, now)).toBe("aujourd'hui");
    expect(agoLabel(now - 86_400_000, now)).toBe('hier');
    expect(agoLabel(now - 5 * 86_400_000, now)).toBe('il y a 5 j');
    expect(agoLabel(now - 65 * 86_400_000, now)).toBe('il y a 2 mois');
  });
});
