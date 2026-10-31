import { describe, expect, it } from 'vitest';

import { favoriteTarget, memberSince, statusCounts, visibleTabs } from './member';

const everything = { profileVisible: true, listsVisible: true, activityVisible: true };

describe('visibleTabs', () => {
  it('montre tout quand les listes sont visibles', () => {
    expect(visibleTabs(everything, false)).toEqual(['profil', 'animes', 'mangas', 'favoris', 'stats']);
  });

  it('cache listes et favoris d’un membre qui ne les laisse pas voir, sauf au propriétaire', () => {
    const hidden = { ...everything, listsVisible: false };
    expect(visibleTabs(hidden, false)).toEqual(['profil', 'stats']);
    expect(visibleTabs(hidden, true)).toEqual(['profil', 'animes', 'mangas', 'favoris', 'stats']);
  });
});

describe('statusCounts', () => {
  const stats = { total: 10, watching: 3, completed: 4, onHold: 1, dropped: 0, planToWatch: 2, averageScore: 8 };

  it('traduit les statistiques dans les statuts d’un anime ou d’un manga', () => {
    expect(statusCounts(stats, 'anime')).toEqual({ ALL: 10, WATCHING: 3, COMPLETED: 4, ON_HOLD: 1, DROPPED: 0, PLAN_TO_WATCH: 2 });
    expect(statusCounts(stats, 'manga')).toMatchObject({ READING: 3, PLAN_TO_READ: 2 });
    expect(statusCounts(undefined, 'anime')).toEqual({});
  });
});

describe('favoriteTarget', () => {
  it('prend le titre d’une œuvre ou le nom d’une entité, et son visuel', () => {
    expect(favoriteTarget({ targetId: 'a1', targetType: 'Anime', target: { title: { original: 'Overgeared' }, posterUrl: 'p' } })).toEqual({
      kind: 'anime',
      id: 'a1',
      title: 'Overgeared',
      imageUrl: 'p',
    });
    expect(favoriteTarget({ targetId: 'c1', targetType: 'Character', target: { name: { original: 'Doren' }, avatarUrl: 'v' } })).toEqual({
      kind: 'character',
      id: 'c1',
      title: 'Doren',
      imageUrl: 'v',
    });
  });

  it('ignore un favori dont la cible a disparu', () => {
    expect(favoriteTarget({ targetId: 'x', targetType: 'Anime', target: null })).toBeNull();
  });
});

describe('memberSince', () => {
  it('formate le mois et l’année, ou rien', () => {
    expect(memberSince('2026-10-18T20:06:17.001Z')).toMatch(/2026/);
    expect(memberSince(undefined)).toBeNull();
    expect(memberSince('pas une date')).toBeNull();
  });
});
