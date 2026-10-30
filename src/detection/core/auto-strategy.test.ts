import { describe, expect, it } from 'vitest';

import { pickAutoStrategy } from './auto-strategy';
import type { StrategyResult } from './types';

const result = (partial: Partial<StrategyResult>): StrategyResult => ({
  id: 'og',
  label: '',
  description: '',
  confidence: 0,
  ...partial,
});

describe('pickAutoStrategy', () => {
  it('prend la plus fiable parmi celles qui trouvent titre et numéro', () => {
    const best = pickAutoStrategy([
      result({ id: 'og', title: 'One Piece', episode: 1100, confidence: 0.65 }),
      result({ id: 'jsonld', title: 'One Piece', episode: 1100, confidence: 0.8 }),
    ]);
    expect(best?.id).toBe('jsonld');
  });

  it('refuse un titre sans numéro (page d’accueil, liste) et une confiance trop faible', () => {
    expect(pickAutoStrategy([result({ title: 'Mon site', confidence: 0.5 })])).toBeNull();
    expect(pickAutoStrategy([result({ title: 'X', episode: 3, confidence: 0.4 })])).toBeNull();
    expect(pickAutoStrategy([])).toBeNull();
  });
});
