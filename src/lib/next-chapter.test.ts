import { describe, expect, it } from 'vitest';

import { nextNumberUrl } from './next-chapter';

describe('nextNumberUrl', () => {
  it('incrémente le numéro après un mot-clé', () => {
    expect(nextNumberUrl('https://site.example/manga/solo/chapitre-45/', 45)).toBe('https://site.example/manga/solo/chapitre-46/');
    expect(nextNumberUrl('https://site.example/solo-leveling/chapter/12', 12)).toBe('https://site.example/solo-leveling/chapter/13');
    expect(nextNumberUrl('https://site.example/watch/one-piece-episode-1000', 1000)).toBe('https://site.example/watch/one-piece-episode-1001');
  });

  it('ne touche pas un autre nombre de l’adresse', () => {
    expect(nextNumberUrl('https://site.example/manga/5332/chapter-9', 9)).toBe('https://site.example/manga/5332/chapter-10');
  });

  it('retombe sur un segment qui est le numéro', () => {
    expect(nextNumberUrl('https://site.example/titre/7/', 7)).toBe('https://site.example/titre/8/');
    expect(nextNumberUrl('https://site.example/titre-123/c-7', 7)).toBe('https://site.example/titre-123/c-8');
  });

  it('renvoie null quand le numéro n’est pas dans l’adresse', () => {
    expect(nextNumberUrl('https://site.example/lire?id=abc', 7)).toBeNull();
    expect(nextNumberUrl('pas une adresse', 7)).toBeNull();
  });
});
