import { describe, expect, it } from 'vitest';

import { isAlreadyInList, plannedStatus, recommendationBody, recommendationError, recommendationProblem, recommendationSender, recommendationTitle, type IRecommendation } from './recommendations';

const base = { toId: 'f1', mediaId: 'm1', mediaType: 'Anime' as const, reason: 'STORY' as const, message: '' };

describe('recommendationProblem', () => {
  it('exige un ami et un motif, borne le message', () => {
    expect(recommendationProblem({ ...base, toId: '' })).toMatch(/ami/);
    expect(recommendationProblem({ ...base, reason: null })).toMatch(/motif/);
    expect(recommendationProblem({ ...base, message: 'x'.repeat(201) })).toMatch(/200/);
    expect(recommendationProblem(base)).toBeNull();
  });
});

describe('recommendationBody', () => {
  it('rogne le message et l’omet quand il est vide', () => {
    expect(recommendationBody({ ...base, message: '   ' })).toEqual({ toId: 'f1', mediaId: 'm1', mediaType: 'Anime', reason: 'STORY' });
    expect(recommendationBody({ ...base, message: '  à voir  ' })).toMatchObject({ message: 'à voir' });
  });
});

describe('affichage', () => {
  const rec = { id: 'r', media: { id: 'm1', title: { original: 'Orig' } }, from: { id: 'f', username: 'ami', displayName: '' } } as IRecommendation;
  it('titre, expéditeur, statut d’ajout', () => {
    expect(recommendationTitle(rec)).toBe('Orig');
    expect(recommendationSender(rec)).toBe('ami');
    expect(plannedStatus('Anime')).toBe('PLAN_TO_WATCH');
    expect(plannedStatus('Manga')).toBe('PLAN_TO_READ');
  });
  it('reconnaît une œuvre déjà dans la liste', () => {
    expect(isAlreadyInList(new Error('Ce média est déjà dans votre liste'))).toBe(true);
    expect(isAlreadyInList(new Error('HTTP 500'))).toBe(false);
    expect(isAlreadyInList('x')).toBe(false);
  });
  it('garde un message d’API lisible', () => {
    expect(recommendationError(new Error('Quota atteint : 10 par jour'))).toBe('Quota atteint : 10 par jour');
    expect(recommendationError(new Error('HTTP 500'))).toMatch(/pas pu/);
  });
});
