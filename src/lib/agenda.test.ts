import { describe, expect, it } from 'vitest';
import type { IMedia as IAnime } from './api';
import { getAnimePlatforms, getOccurrenceOnDay, getOccurrencesOnDay, monthCells, seasonOf, startOfWeek, weekDays } from './agenda';

// Jeudi 2 octobre 2025, 17:30 locale.
const FIRST = new Date(2025, 9, 2, 17, 30);

const make = (over: Partial<IAnime> = {}): IAnime =>
  ({
    id: 'a1',
    title: { normal: 'Anime A' },
    format: 'TV',
    status: 'AIRING',
    date: { start: FIRST.toISOString() },
    episodesInfo: { total: 12 },
    ...over,
  }) as unknown as IAnime;

describe('getOccurrenceOnDay', () => {
  it('numérote les épisodes semaine après semaine', () => {
    expect(getOccurrenceOnDay(make(), new Date(2025, 9, 2))?.episode).toBe(1);
    const third = getOccurrenceOnDay(make(), new Date(2025, 9, 16));
    expect(third?.episode).toBe(3);
    expect(third?.date.getHours()).toBe(17);
    expect(third?.timeUnknown).toBe(false);
  });

  it('ne renvoie rien un autre jour, avant la première ou après le dernier épisode', () => {
    expect(getOccurrenceOnDay(make(), new Date(2025, 9, 3))).toBeNull();
    expect(getOccurrenceOnDay(make(), new Date(2025, 8, 25))).toBeNull();
    expect(getOccurrenceOnDay(make(), new Date(2025, 11, 18))?.episode).toBe(12);
    expect(getOccurrenceOnDay(make(), new Date(2025, 11, 25))).toBeNull();
  });

  it('ignore le total d’une série continue mais borne l’horizon', () => {
    const anime = make({ episodesInfo: { total: 12, continuous: true } });
    const now = new Date(2025, 11, 20);
    expect(getOccurrenceOnDay(anime, new Date(2025, 11, 25), now)?.episode).toBe(13);
    expect(getOccurrenceOnDay(anime, new Date(2026, 0, 15), now)?.episode).toBe(16);
    expect(getOccurrenceOnDay(anime, new Date(2026, 0, 22), now)).toBeNull();
  });

  it('borne à quelques semaines une série sans total, sans toucher au passé', () => {
    const anime = make({ episodesInfo: {} });
    const now = new Date(2025, 11, 20);
    expect(getOccurrenceOnDay(anime, new Date(2025, 9, 9), now)?.episode).toBe(2);
    expect(getOccurrenceOnDay(anime, new Date(2026, 0, 15), now)?.episode).toBe(16);
    expect(getOccurrenceOnDay(anime, new Date(2026, 5, 4), now)).toBeNull();
  });

  it('ne place aucune sortie dans la pause entre le dernier épisode diffusé et la reprise', () => {
    const anime = make({
      episodesInfo: { total: 12, airing: 4, nextAiringDate: new Date(2025, 10, 20, 17, 30).toISOString() },
    });
    const now = new Date(2025, 10, 1);
    expect(getOccurrenceOnDay(anime, new Date(2025, 9, 23), now)?.episode).toBe(4);
    expect(getOccurrenceOnDay(anime, new Date(2025, 9, 30), now)).toBeNull();
    expect(getOccurrenceOnDay(anime, new Date(2025, 10, 13), now)).toBeNull();
    expect(getOccurrenceOnDay(anime, new Date(2025, 10, 20), now)?.episode).toBe(5);
  });

  it('ignore films, pauses sans reprise et dates imprécises', () => {
    expect(getOccurrenceOnDay(make({ format: 'FILM' }), new Date(2025, 9, 2))).toBeNull();
    expect(getOccurrenceOnDay(make({ episodesInfo: { broadcastPaused: true } }), new Date(2025, 9, 9))).toBeNull();
    expect(
      getOccurrenceOnDay(make({ date: { start: FIRST.toISOString(), startPrecision: 'month' } }), new Date(2025, 9, 2))
    ).toBeNull();
  });

  it('repart de la reprise fixée par le staff', () => {
    const anime = make({
      episodesInfo: {
        total: 12,
        airing: 4,
        broadcastPaused: true,
        nextAiringDate: new Date(2025, 10, 6, 17, 30).toISOString(),
      },
    });
    const before = new Date(2025, 10, 1);
    expect(getOccurrenceOnDay(anime, new Date(2025, 10, 6), before)?.episode).toBe(5);
    expect(getOccurrenceOnDay(anime, new Date(2025, 10, 13), before)?.episode).toBe(6);
    expect(getOccurrenceOnDay(anime, new Date(2025, 10, 7), before)).toBeNull();
  });

  it('n’affiche plus une série en pause dont la date de reprise est déjà passée', () => {
    const anime = make({
      episodesInfo: {
        total: 0,
        airing: 4,
        broadcastPaused: true,
        nextAiringDate: new Date(2025, 10, 6, 17, 30).toISOString(),
      },
    });
    const after = new Date(2025, 11, 1);
    expect(getOccurrenceOnDay(anime, new Date(2025, 11, 4), after)).toBeNull();
    expect(getOccurrenceOnDay(anime, new Date(2025, 11, 11), after)).toBeNull();
  });

  it('place une série à date.start imprécise grâce à nextAiringDate, et l’écarte sans elle', () => {
    const start = new Date(Date.UTC(2025, 9, 2)).toISOString();
    const withNext = make({
      date: { start, startPrecision: 'month' },
      episodesInfo: { total: 12, airing: 0, nextAiringDate: new Date(2025, 9, 2, 17, 0).toISOString() },
    });
    const occ = getOccurrenceOnDay(withNext, new Date(2025, 9, 9));
    expect(occ?.episode).toBe(2);
    expect(occ?.date.getHours()).toBe(17);
    expect(getOccurrenceOnDay(withNext, new Date(2025, 8, 25))).toBeNull();
    const withoutNext = make({ date: { start, startPrecision: 'month' } });
    expect(getOccurrenceOnDay(withoutNext, new Date(2025, 9, 9))).toBeNull();
  });

  it('prend l’heure de nextAiringDate même avant la reprise, quand date.start est à minuit UTC', () => {
    const anime = make({
      date: { start: new Date(Date.UTC(2025, 9, 2)).toISOString() },
      episodesInfo: {
        total: 12,
        airing: 0,
        nextAiringDate: new Date(2025, 9, 2, 9, 30).toISOString(),
      },
    });
    const occ = getOccurrenceOnDay(anime, new Date(2025, 9, 9));
    expect(occ?.timeUnknown).toBe(false);
    expect(occ?.date.getHours()).toBe(9);
    expect(occ?.date.getMinutes()).toBe(30);
  });

  it('marque l’heure inconnue quand la date est à minuit UTC', () => {
    const anime = make({ date: { start: new Date(Date.UTC(2025, 9, 2)).toISOString() } });
    const occ = getOccurrenceOnDay(anime, new Date(2025, 9, 9));
    expect(occ?.timeUnknown).toBe(true);
    expect(occ?.date.getHours()).toBe(0);
  });
});

describe('animes « Bientôt »', () => {
  const soon = make({ status: 'SOON', episodesInfo: {}, date: { start: new Date(2026, 0, 8, 18, 0).toISOString() } });
  const now = new Date(2025, 11, 20);

  it('place la première prévue et la marque prévisionnelle', () => {
    const occ = getOccurrenceOnDay(soon, new Date(2026, 0, 8), now);
    expect(occ?.episode).toBe(1);
    expect(occ?.provisional).toBe(true);
    expect(getOccurrenceOnDay(make(), new Date(2025, 9, 2))?.provisional).toBe(false);
  });

  it('borne l’horizon à partir de la première, pas d’aujourd’hui', () => {
    expect(getOccurrenceOnDay(soon, new Date(2026, 1, 5), now)?.episode).toBe(5);
    expect(getOccurrenceOnDay(soon, new Date(2026, 1, 12), now)).toBeNull();
  });
});

describe('getOccurrencesOnDay', () => {
  it('place l’heure inconnue en dernier', () => {
    const late = make({ id: 'late', title: { normal: 'Zeta' } as never });
    const unknown = make({ id: 'unk', date: { start: new Date(Date.UTC(2025, 9, 2)).toISOString() } });
    const early = make({ id: 'early', date: { start: new Date(2025, 9, 2, 9, 0).toISOString() } });
    const ids = getOccurrencesOnDay([unknown, late, early], new Date(2025, 9, 2)).map((o) => o.anime.id);
    expect(ids).toEqual(['early', 'late', 'unk']);
  });
});

describe('getAnimePlatforms', () => {
  it('reconnaît les plateformes par nom ou adresse', () => {
    const anime = make({
      links: [
        { name: 'Crunchyroll', url: 'https://x' },
        { name: 'Voir', url: 'https://www.primevideo.com/y' },
        { name: 'ADN', url: 'https://z' },
      ],
    });
    expect(getAnimePlatforms(anime)).toEqual(['Crunchyroll', 'ADN', 'Prime Video']);
  });
});

describe('startOfWeek', () => {
  it('renvoie le lundi', () => {
    expect(startOfWeek(new Date(2025, 9, 5)).getDate()).toBe(29);
  });
});

describe('seasonOf', () => {
  it('donne la saison en cours et la suivante, avec passage d’année', () => {
    expect(seasonOf(0, new Date(2026, 9, 31))).toEqual({ name: 'fall-2026', label: 'Automne 2026' });
    expect(seasonOf(1, new Date(2026, 9, 31))).toEqual({ name: 'winter-2027', label: 'Hiver 2027' });
    expect(seasonOf(0, new Date(2026, 1, 10)).label).toBe('Hiver 2026');
  });
});

describe('weekDays / monthCells', () => {
  it('liste du lundi au dimanche', () => {
    const days = weekDays(new Date(2026, 9, 31));
    expect(days).toHaveLength(7);
    expect(days[0]!.getDay()).toBe(1);
    expect(days[6]!.getDay()).toBe(0);
  });

  it('complète le début du mois pour aligner les semaines sur le lundi', () => {
    // octobre 2026 commence un jeudi : 3 cases vides avant le 1er
    const cells = monthCells(new Date(2026, 9, 15));
    expect(cells.slice(0, 3)).toEqual([null, null, null]);
    expect(cells[3]!.getDate()).toBe(1);
    expect(cells.filter(Boolean)).toHaveLength(31);
  });
});
