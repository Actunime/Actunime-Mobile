import { describe, expect, it } from 'vitest';

import { formatLabel, formatLongDate, formatYear, linkLabel, newsCover, statusTone, mediaTitle, progressLabel, totalOf } from './media';

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

  it('traduit les libellés de liens anglais et garde les noms de services', () => {
    expect(linkLabel({ url: 'https://a.jp', name: 'Official Site' })).toBe('Site officiel');
    expect(linkLabel({ url: 'https://x.com/a', name: 'Twitter' })).toBe('X (Twitter)');
    expect(linkLabel({ url: 'https://www.crunchyroll.com/x', name: 'Crunchyroll' })).toBe('Crunchyroll');
    expect(linkLabel({ url: 'https://www.exemple.fr/page' })).toBe('exemple.fr');
  });

  it('teinte le statut de l’œuvre', () => {
    expect(statusTone('AIRING')).toBe('success');
    expect(statusTone('SOON')).toBe('warning');
    expect(statusTone('ENDED')).toBe('neutral');
  });

  it('formate une date longue en français', () => {
    expect(formatLongDate('2026-01-16T00:00:00.000Z')).toBe('16 janvier 2026');
    expect(formatLongDate(undefined)).toBeNull();
    expect(formatLongDate('nope')).toBeNull();
  });
});

describe('newsCover', () => {
  it('prend la bannière, puis la galerie, puis l’affiche', () => {
    expect(newsCover({ bannerUrl: 'b', visuals: ['v'], posterUrl: 'p' })).toBe('b');
    expect(newsCover({ bannerUrl: null, visuals: ['v'], posterUrl: 'p' })).toBe('v');
    expect(newsCover({ bannerUrl: null, visuals: [], posterUrl: 'p' })).toBe('p');
    expect(newsCover({ posterUrl: null })).toBeNull();
  });
});
