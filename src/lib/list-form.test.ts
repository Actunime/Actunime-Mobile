import { describe, expect, it } from 'vitest';

import {
  applyStatus,
  buildFields,
  buildUpdate,
  clampScore,
  disabledReason,
  entryToForm,
  formatFrenchDate,
  statusesFor,
} from './list-form';

const NOW = new Date('2026-10-28T10:00:00.000Z');

describe('statuts', () => {
  it('propose les statuts du vrai schéma, selon le type', () => {
    expect(statusesFor('Anime')).toEqual(['WATCHING', 'COMPLETED', 'ON_HOLD', 'DROPPED', 'PLAN_TO_WATCH']);
    expect(statusesFor('Manga')).toEqual(['READING', 'COMPLETED', 'ON_HOLD', 'DROPPED', 'PLAN_TO_READ']);
  });

  it('interdit « en cours » ou « terminé » pour une œuvre pas encore sortie', () => {
    expect(disabledReason('Anime', 'SOON', 'WATCHING')).toMatch(/pas encore diffusé/);
    expect(disabledReason('Manga', 'UNKNOWN', 'COMPLETED')).toMatch(/pas encore publié/);
    expect(disabledReason('Anime', 'SOON', 'PLAN_TO_WATCH')).toBeNull();
  });

  it('interdit « terminé » tant que la diffusion est en cours', () => {
    expect(disabledReason('Anime', 'AIRING', 'COMPLETED')).toMatch(/diffusion/);
    expect(disabledReason('Manga', 'AIRING', 'COMPLETED')).toMatch(/publication/);
    expect(disabledReason('Anime', 'AIRING', 'WATCHING')).toBeNull();
  });
});

describe('applyStatus', () => {
  const empty = entryToForm('Anime', null);

  it('« Terminé » pose les dates et tous les épisodes d’un anime', () => {
    const form = applyStatus(empty, 'COMPLETED', { mediaType: 'Anime', totalEpisodes: 12, now: NOW });

    expect(form).toMatchObject({
      status: 'COMPLETED',
      episodesWatched: 12,
      startedAt: NOW.toISOString(),
      completedAt: NOW.toISOString(),
    });
  });

  it('conserve les dates déjà saisies', () => {
    const entry = { status: 'WATCHING', startedAt: '2026-01-01T00:00:00.000Z' } as const;
    const form = applyStatus(entryToForm('Anime', entry as never), 'COMPLETED', { mediaType: 'Anime', entry: entry as never, now: NOW });

    expect(form.startedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(form.completedAt).toBe(NOW.toISOString());
  });

  it('« En cours » pose le début et « En pause » la date de pause', () => {
    expect(applyStatus(empty, 'WATCHING', { mediaType: 'Anime', now: NOW }).startedAt).toBe(NOW.toISOString());
    expect(applyStatus(empty, 'ON_HOLD', { mediaType: 'Anime', now: NOW }).onHoldSince).toBe(NOW.toISOString());
  });

  it('ne touche pas la progression d’un manga terminé', () => {
    const form = applyStatus(entryToForm('Manga', null), 'COMPLETED', { mediaType: 'Manga', now: NOW });

    expect(form.chaptersRead).toBeUndefined();
  });
});

describe('corps envoyé', () => {
  it('n’envoie que la progression du bon type de média', () => {
    const form = { ...entryToForm('Manga', null), chaptersRead: 5, volumesRead: 1, episodesWatched: 9 };

    const fields = buildFields(form, 'Manga');

    expect(fields).toMatchObject({ status: 'PLAN_TO_READ', chaptersRead: 5, volumesRead: 1, visibility: 'PUBLIC' });
    expect(fields).not.toHaveProperty('episodesWatched');
  });

  it('omet des notes vides à la création mais les efface à la mise à jour', () => {
    const form = entryToForm('Anime', ({ status: 'WATCHING', notes: '   ' } as never));

    expect(buildFields(form, 'Anime').notes).toBeUndefined();
    expect(buildUpdate(form, 'Anime').notes).toBe('');
  });
});

describe('note et dates', () => {
  it('borne la note de 0 à 10 par demi-points', () => {
    expect(clampScore(7.3)).toBe(7.5);
    expect(clampScore(11)).toBe(10);
    expect(clampScore(-1)).toBe(0);
  });

  it('formate une date en JJ/MM/AAAA, vide si absente ou invalide', () => {
    expect(formatFrenchDate(new Date(2026, 2, 5, 12).toISOString())).toBe('05/03/2026');
    expect(formatFrenchDate(null)).toBe('');
    expect(formatFrenchDate('pas une date')).toBe('');
  });
});
