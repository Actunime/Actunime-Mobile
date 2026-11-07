import { describe, expect, it } from 'vitest';

import type { IListEntry, IMedia } from './api';
import {
  activeFilterCount,
  bandState,
  bumpProgress,
  countByStatus,
  cycleSort,
  filterListEntries,
  groupListEntries,
  matchesListQuery,
  sortListEntries,
} from './list-filter';

const media = (id: string, extra: Partial<IMedia> = {}): IMedia => (({ id, title: { original: id }, ...extra } as never));

const entry = (id: string, over: Partial<IListEntry> = {}, m: Partial<IMedia> = {}): IListEntry => (({
  id: `e-${id}`,
  mediaId: id,
  mediaType: 'Anime',
  status: 'WATCHING',
  episodesWatched: 0,
  media: media(id, m),
  ...over,
} as never));

describe('cycleSort', () => {
  it('passe de décroissant à croissant puis retire le champ', () => {
    const desc = cycleSort({}, 'score');
    expect(desc).toEqual({ score: 'desc' });
    const asc = cycleSort(desc, 'score');
    expect(asc).toEqual({ score: 'asc' });
    expect(cycleSort(asc, 'score')).toEqual({});
  });
});

describe('matchesListQuery', () => {
  it('cherche sans accents ni casse dans le titre', () => {
    const e = entry('Frieren', {}, { title: { original: 'Sōsō no Frieren' } });
    expect(matchesListQuery(e, { search: 'SOSO' })).toBe(true);
    expect(matchesListQuery(e, { search: 'naruto' })).toBe(false);
  });

  it('filtre par format et par genre inclus / exclu', () => {
    const e = entry('a', {}, { format: 'FILM', genres: [1, 2] });
    expect(matchesListQuery(e, { format: 'FILM' })).toBe(true);
    expect(matchesListQuery(e, { format: 'OVA' })).toBe(false);
    expect(matchesListQuery(e, { genres: [2] })).toBe(true);
    expect(matchesListQuery(e, { genres: [1, 3], genresMode: 'all' })).toBe(false);
    expect(matchesListQuery(e, { excludeGenres: [1] })).toBe(false);
  });

  it('refuse une entrée sans fiche quand un filtre porte sur l’œuvre', () => {
    const e = entry('a', { media: null });
    expect(matchesListQuery(e, { format: 'FILM' })).toBe(false);
    expect(matchesListQuery(e, {})).toBe(true);
  });

  it('filtre par année et saison de début', () => {
    const e = entry('a', {}, { date: { start: '2026-07-06T00:00:00.000Z' } } as Partial<IMedia>);
    expect(matchesListQuery(e, { year: 2026, season: 'SUMMER' })).toBe(true);
    expect(matchesListQuery(e, { season: 'WINTER' })).toBe(false);
  });
});

describe('activeFilterCount', () => {
  it('ignore la recherche texte et compte format, statut, saison et facettes', () => {
    expect(activeFilterCount({ search: 'x' })).toBe(0);
    expect(activeFilterCount({ format: 'FILM', status: 'AIRING', year: 2026 })).toBe(3);
    expect(activeFilterCount({ genres: [1, 2], excludeGenres: [3] })).toBe(3);
  });
});

describe('sortListEntries / filterListEntries', () => {
  const a = entry('a', { episodesWatched: 1, score: 5 });
  const b = entry('b', { episodesWatched: 0, score: 9 });
  const c = entry('c', { episodesWatched: 3, score: 7 });
  const aired = (e: IListEntry) => ({ a: 4, b: 2, c: 3 })[e.mediaId as 'a'];

  it('trie par note décroissante puis croissante', () => {
    expect(sortListEntries([a, b, c], { score: 'desc' }).map((e) => e.mediaId)).toEqual(['b', 'c', 'a']);
    expect(sortListEntries([a, b, c], { score: 'asc' }).map((e) => e.mediaId)).toEqual(['a', 'c', 'b']);
  });

  it('trie par épisodes disponibles (sortis non vus)', () => {
    expect(sortListEntries([a, b, c], { progress: 'desc' }, aired).map((e) => e.mediaId)).toEqual(['a', 'b', 'c']);
  });

  it('met les disponibles d’abord en « En cours » sans tri choisi, pas ailleurs', () => {
    expect(filterListEntries([c, b, a], 'WATCHING', undefined, undefined, aired).map((e) => e.mediaId)).toEqual(['a', 'b', 'c']);
    expect(filterListEntries([c, b, a], 'ALL', undefined, undefined, aired).map((e) => e.mediaId)).toEqual(['c', 'b', 'a']);
  });

  it('filtre par statut', () => {
    const done = entry('d', { status: 'COMPLETED' });
    expect(filterListEntries([a, done], 'COMPLETED', undefined, undefined).map((e) => e.mediaId)).toEqual(['d']);
  });
});

describe('groupListEntries', () => {
  const labels = {} as Record<string, string>;
  for (const s of ['WATCHING', 'ON_HOLD', 'COMPLETED', 'DROPPED', 'PLAN_TO_WATCH']) labels[s] = s;
  const entries = [entry('a'), entry('b', { status: 'COMPLETED' }), entry('x', { status: 'IMPORTED' as IListEntry['status'] })];

  it('groupe par statut dans l’ordre du site, les statuts inconnus dans « Autres »', () => {
    const sections = groupListEntries(entries, 'anime', 'ALL', undefined, undefined, labels as never);
    expect(sections?.map((s) => s.key)).toEqual(['WATCHING', 'COMPLETED', 'OTHERS']);
  });

  it('renvoie null avec une recherche, un tri ou un statut choisi', () => {
    expect(groupListEntries(entries, 'anime', 'ALL', { search: 'a' }, undefined, labels as never)).toBeNull();
    expect(groupListEntries(entries, 'anime', 'ALL', undefined, { score: 'desc' }, labels as never)).toBeNull();
    expect(groupListEntries(entries, 'anime', 'WATCHING', undefined, undefined, labels as never)).toBeNull();
  });
});

describe('countByStatus', () => {
  it('compte « ALL » et chaque statut', () => {
    expect(countByStatus([entry('a'), entry('b'), entry('c', { status: 'COMPLETED' })])).toEqual({
      ALL: 3,
      WATCHING: 2,
      COMPLETED: 1,
    });
  });
});

describe('bandState', () => {
  it('affiche « N disponibles » avec un ton selon le retard', () => {
    const e = entry('a', { episodesWatched: 2 });
    expect(bandState(e, 'anime', 12, 3)).toMatchObject({ behind: 1, availableLabel: '1 disponible', availableTone: 'success', pct: 17 });
    expect(bandState(e, 'anime', 12, 6)).toMatchObject({ behind: 4, availableLabel: '4 disponibles', availableTone: 'warning' });
    expect(bandState(e, 'anime', 12, 2)).toMatchObject({ availableLabel: 'À jour', availableTone: 'muted' });
  });

  it('n’affiche rien de disponible hors « En cours » ou sans épisodes sortis connus', () => {
    expect(bandState(entry('a', { status: 'COMPLETED' }), 'anime', 12, 12).availableLabel).toBeNull();
    expect(bandState(entry('a'), 'anime', 12).availableLabel).toBeNull();
  });

  it('remplit la barre à 100 % quand terminé et marque une série sans total', () => {
    expect(bandState(entry('a', { status: 'COMPLETED' }), 'anime', 12).pct).toBe(100);
    expect(bandState(entry('a', { episodesWatched: 4 }), 'anime', undefined, 8)).toMatchObject({ openEnded: true, pct: 50 });
  });
});

describe('bumpProgress', () => {
  it('borne à 0 et au total, et passe à « Terminé » en atteignant le total', () => {
    expect(bumpProgress(0, -1, 12)).toBeNull();
    expect(bumpProgress(12, 1, 12)).toBeNull();
    expect(bumpProgress(5, 1, 12)).toEqual({ progress: 6 });
    expect(bumpProgress(11, 1, 12)).toEqual({ progress: 12, status: 'COMPLETED' });
    expect(bumpProgress(5, 1)).toEqual({ progress: 6 });
  });
});
