import { describe, expect, it } from 'vitest';

import type { IListEntry, IMedia } from './api';
import { behindAnimes, estimatedAired, headline, listBreakdown, listTotals, nextBroadcast, weekSchedule } from './suivi';

// mercredi 28 octobre 2026, 12:00 local
const NOW = new Date(2026, 9, 28, 12, 0, 0);

/** Anime diffusé le mercredi à 18:30, première il y a `weeks` semaines. */
const weekly = (weeks: number, extra: Partial<IMedia> = {}): IMedia => {
  const start = new Date(NOW);
  start.setHours(18, 30, 0, 0);
  start.setDate(start.getDate() - weeks * 7);
  return { id: `a${weeks}`, status: 'AIRING', date: { start: start.toISOString() }, episodesInfo: { total: 24 }, ...extra } as IMedia;
};

const entry = (media: IMedia, over: Partial<IListEntry> = {}): IListEntry => (({
  id: `e-${media.id}`,
  mediaType: 'Anime',
  status: 'WATCHING',
  episodesWatched: 0,
  media,
  ...over,
} as never));

describe('estimatedAired', () => {
  it('compte une sortie par semaine depuis la première (l’épisode de ce soir n’est pas encore sorti à midi), bornée au total', () => {
    expect(estimatedAired(weekly(3), NOW)).toBe(3);
    expect(estimatedAired(weekly(40), NOW)).toBe(24);
  });

  it('vaut 0 avant la première diffusion', () => {
    expect(estimatedAired(weekly(-2), NOW)).toBe(0);
  });

  it('se recale sur le compteur du staff quand la diffusion est en pause', () => {
    expect(estimatedAired(weekly(10, { episodesInfo: { total: 24, airing: 6, broadcastPaused: true } }), NOW)).toBe(6);
  });
});

describe('nextBroadcast', () => {
  it('trouve le prochain créneau hebdomadaire', () => {
    const next = nextBroadcast(weekly(3), NOW);

    expect(next?.getDay()).toBe(3);
    expect(next?.getHours()).toBe(18);
  });

  it('ne calcule rien pour un film ni pour une diffusion en pause', () => {
    expect(nextBroadcast(weekly(3, { format: 'FILM' }), NOW)).toBeNull();
    expect(nextBroadcast(weekly(3, { episodesInfo: { broadcastPaused: true } }), NOW)).toBeNull();
  });
});

describe('behindAnimes', () => {
  it('liste les animes en cours en retard, le plus en retard d’abord', () => {
    const entries = [entry(weekly(3), { episodesWatched: 2 }), entry(weekly(5), { episodesWatched: 1 })];

    const behind = behindAnimes(entries, NOW);

    expect(behind.map((b) => b.behind)).toEqual([4, 1]);
  });

  it('ignore les animes à jour et ceux qui ne sont pas en cours', () => {
    const entries = [entry(weekly(3), { episodesWatched: 3 }), entry(weekly(5), { status: 'PLAN_TO_WATCH' })];

    expect(behindAnimes(entries, NOW)).toEqual([]);
  });
});

describe('weekSchedule', () => {
  it('place un anime diffusé le mercredi aujourd’hui, et sept jours plus tard', () => {
    const days = weekSchedule([entry(weekly(3))], NOW);

    expect(days).toHaveLength(7);
    expect(days[0]!.items).toHaveLength(1);
    expect(days.slice(1).every((day) => day.items.length === 0)).toBe(true);
  });

  it('ignore les animes terminés', () => {
    expect(weekSchedule([entry(weekly(3, { status: 'ENDED' }))], NOW)[0]!.items).toEqual([]);
  });
});

describe('bandeau et répartition', () => {
  it('choisit le titre du bandeau', () => {
    expect(headline(2, 5)).toBe("2 épisodes sortent aujourd'hui");
    expect(headline(0, 1)).toBe('1 épisode à rattraper');
    expect(headline(0, 0)).toBe("Rien de prévu aujourd'hui");
  });

  it('regroupe les statuts de la liste', () => {
    const segments = listBreakdown([
      { status: 'WATCHING', count: 2 },
      { status: 'READING', count: 1 },
      { status: 'DROPPED', count: 4 },
      { status: 'ON_HOLD', count: 1 },
    ]);

    expect(segments).toEqual([
      { label: 'En cours', value: 3, color: 'primary' },
      { label: 'En pause / abandonnés', value: 5, color: 'muted' },
    ]);
  });
});

describe('listTotals', () => {
  it('compte par statut, épisodes vus, chapitres lus et moyenne des notes, sans les entrées sans fiche', () => {
    const totals = listTotals([
      entry(weekly(1), { mediaId: 'a', episodesWatched: 5, score: 8 }),
      entry(weekly(2), { mediaId: 'b', episodesWatched: 3, score: 6, status: 'COMPLETED' }),
      entry(weekly(3), { mediaId: 'c', mediaType: 'Manga', chaptersRead: 10, status: 'READING' }),
      entry(weekly(4), { mediaId: undefined, episodesWatched: 99 }),
    ]);
    expect(totals).toMatchObject({ total: 3, animeCount: 2, mangaCount: 1, episodesWatched: 8, chaptersRead: 10, averageScore: 7 });
    expect(totals.byStatus).toHaveLength(3);
  });

  it('laisse la moyenne indéfinie sans aucune note', () => {
    expect(listTotals([entry(weekly(1), { mediaId: 'a' })]).averageScore).toBeUndefined();
  });
});
