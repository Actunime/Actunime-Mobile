import { describe, expect, it } from 'vitest';

import { pickAutoStrategy, titleAlternatives } from './auto-strategy';
import type { StrategyResult } from './types';

const result = (partial: Partial<StrategyResult>): StrategyResult => ({
  id: 'og',
  label: '',
  description: '',
  confidence: 0,
  ...partial,
});

describe('pickAutoStrategy', () => {
  it('prend le titre de la source la plus fiable, pas la confiance la plus haute', () => {
    const best = pickAutoStrategy([
      result({ id: 'url-tokens', title: 'God Level Assassin Im The Shadow', episode: 1, confidence: 0.7 }),
      result({ id: 'og', title: "God-level Assassin, I'm the Shadow", episode: 1, confidence: 0.65 }),
    ]);
    expect(best?.id).toBe('og');
    expect(best?.title).toBe("God-level Assassin, I'm the Shadow");
  });

  it('ignore un identifiant pris pour un titre (comix.to : « 6225159 »)', () => {
    const best = pickAutoStrategy([
      result({ id: 'url-tokens', title: '6225159', episode: 1, confidence: 0.7 }),
      result({ id: 'document-title', title: "God-level Assassin, I'm the Shadow", episode: 1, confidence: 0.7 }),
    ]);
    expect(best?.id).toBe('document-title');
  });

  it('prend le numéro d’une autre source quand celle du titre n’en a pas', () => {
    const best = pickAutoStrategy([
      result({ id: 'og', title: 'One Piece', confidence: 0.4 }),
      result({ id: 'url-tokens', episode: 1100, confidence: 0.7 }),
    ]);
    expect(best).toMatchObject({ id: 'og', title: 'One Piece', episode: 1100 });
  });

  it('refuse un titre sans numéro (accueil, liste) ou sans source assez sûre', () => {
    expect(pickAutoStrategy([result({ title: 'Mon site', confidence: 0.5 })])).toBeNull();
    expect(pickAutoStrategy([result({ title: 'Titre', episode: 3, confidence: 0.4 })])).toBeNull();
    expect(pickAutoStrategy([])).toBeNull();
  });
});

describe('titleAlternatives', () => {
  it('propose les autres titres, sans doublon ni identifiant', () => {
    const alternatives = titleAlternatives(
      [
        result({ id: 'og', title: "God-level Assassin, I'm the Shadow" }),
        result({ id: 'document-title', title: "God-level Assassin, I'm the Shadow" }),
        result({ id: 'dom-selectors', title: 'God-level Assassin' }),
        result({ id: 'url-tokens', title: '6225159' }),
      ],
      "God-level Assassin, I'm the Shadow",
    );
    expect(alternatives).toEqual([{ strategy: 'dom-selectors', title: 'God-level Assassin' }]);
  });
});
