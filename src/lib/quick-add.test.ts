import { describe, expect, it } from 'vitest';

import { aliasesFor, guessFormat } from './quick-add';

describe('guessFormat', () => {
  it('devine manhwa / manhua depuis l’adresse, manga sinon, série pour un anime', () => {
    expect(guessFormat('manga', 'https://asura.com/webtoon/x/chapter-1')).toBe('MANHWA');
    expect(guessFormat('manga', 'https://site.com/manhua/x')).toBe('MANHUA');
    expect(guessFormat('manga', 'https://comix.to/title/x/1-chapter-1')).toBe('MANGA');
    expect(guessFormat('anime', 'https://adn.com/video/x')).toBe('SERIE');
  });
});

describe('aliasesFor', () => {
  it('garde les autres titres, sans doublon ni titre principal, 5 au plus', () => {
    expect(aliasesFor('God-level Assassin', ['god-level assassin', 'God Level Assassin Im The Shadow', ' ', 'x'])).toEqual([
      'God Level Assassin Im The Shadow',
    ]);
    expect(aliasesFor('T', Array.from({ length: 9 }, (_, i) => `Titre ${i}`))).toHaveLength(5);
  });
});
