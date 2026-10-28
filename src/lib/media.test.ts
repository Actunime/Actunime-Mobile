import { describe, expect, it } from 'vitest';

import { formatLabel, formatYear, mediaTitle, progressLabel, totalOf } from './media';

describe('media', () => {
  it('affiche le titre original puis le titre normal', () => {
    expect(mediaTitle({ title: { original: 'Frieren', normal: 'frieren' } })).toBe('Frieren');
    expect(mediaTitle({ title: { normal: 'frieren' } })).toBe('frieren');
    expect(mediaTitle(null)).toBe('Sans titre');
  });

  it('ignore un total à zéro (inconnu)', () => {
    expect(totalOf('anime', { episodesInfo: { total: 0 } })).toBeUndefined();
    expect(totalOf('manga', { chaptersInfo: { total: 40 } })).toBe(40);
  });

  it('formate la progression avec ou sans total', () => {
    expect(progressLabel({ status: 'WATCHING', mediaType: 'Anime', episodesWatched: 5 }, { episodesInfo: { total: 12 } })).toBe(
      '5 / 12 ép.',
    );
    expect(progressLabel({ status: 'READING', mediaType: 'Manga', chaptersRead: 8 })).toBe('8 ch.');
    expect(progressLabel({ status: 'PLAN_TO_WATCH', mediaType: 'Anime' })).toBeNull();
  });

  it('extrait l’année de début', () => {
    expect(formatYear({ date: { start: '2026-01-16T00:00:00.000Z' } })).toBe('2026');
    expect(formatYear({})).toBeNull();
  });

  it('rend le format lisible', () => {
    expect(formatLabel('SERIE_COURTE')).toBe('Série courte');
    expect(formatLabel('LIGHT_NOVEL')).toBe('Light novel');
    expect(formatLabel('UNKNOWN')).toBeNull();
  });
});
