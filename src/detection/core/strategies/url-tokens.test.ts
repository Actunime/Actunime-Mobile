import { afterEach, describe, expect, it } from 'vitest';

import { runUrlTokensStrategy } from './url-tokens';

const at = (path: string) => window.history.replaceState({}, '', path);
afterEach(() => at('/'));

describe('runUrlTokensStrategy', () => {
  it('lit le titre dans le segment d’avant, pas dans l’identifiant du chapitre', () => {
    at('/title/z0l20-god-level-assassin-im-the-shadow/6225159-chapter-1');
    const result = runUrlTokensStrategy();
    expect(result.title).toBe('God Level Assassin Im The Shadow');
    expect(result.episode).toBe(1);
  });

  it('ne renvoie aucun titre plutôt qu’un identifiant', () => {
    at('/6225159-chapter-1');
    expect(runUrlTokensStrategy().title).toBeUndefined();
  });

  it('garde les adresses classiques', () => {
    at('/anime/one-piece/episode-1100');
    expect(runUrlTokensStrategy()).toMatchObject({ title: 'One Piece', episode: 1100 });
  });
});
