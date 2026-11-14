import { describe, expect, it } from 'vitest';
import { SEQUEL_SYNOPSIS, displaySynopsis, isSequel } from './sequel-synopsis';

describe('sequel-synopsis (E182)', () => {
  it('garde le synopsis de la fiche quand il existe, même pour une suite', () => {
    expect(displaySynopsis({ synopsis: 'Un vrai texte.', season: { number: 2 } })).toEqual({
      text: 'Un vrai texte.',
      automatic: false,
    });
  });
  it('affiche le texte de suite pour une saison 2 ou plus sans synopsis', () => {
    expect(displaySynopsis({ synopsis: '', season: { number: 3 } })).toEqual({
      text: SEQUEL_SYNOPSIS,
      automatic: true,
    });
  });
  it('ne montre rien pour une première saison ou une œuvre sans saison', () => {
    expect(displaySynopsis({ synopsis: undefined, season: { number: 1 } })).toBeNull();
    expect(displaySynopsis({ synopsis: '  ' })).toBeNull();
    expect(isSequel({})).toBe(false);
  });
});
