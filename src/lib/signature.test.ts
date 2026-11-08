import { describe, expect, it } from 'vitest';

import { signatureCardTint, signatureNameColor, signatureRing } from './signature';

const signature = { nameColor: '#ffd98a', accentColor: '#ff9be8' };

describe('signature', () => {
  it('ne change rien pour un membre sans signature', () => {
    expect(signatureNameColor(null)).toBeUndefined();
    expect(signatureRing(undefined)).toBeUndefined();
    expect(signatureCardTint(null)).toBeUndefined();
  });

  it('colore le pseudo et entoure l’avatar à la couleur d’accent', () => {
    expect(signatureNameColor(signature)).toBe('#ffd98a');
    expect(signatureRing(signature)).toEqual({ borderColor: '#ff9be8', borderWidth: 2 });
  });

  it('teinte la carte avec la couleur principale, sinon l’accent', () => {
    expect(signatureCardTint({ ...signature, primaryColor: '#3c7dff' })?.borderColor).toBe('rgba(60, 125, 255, 0.45)');
    expect(signatureCardTint(signature)?.borderColor).toBe('rgba(255, 155, 232, 0.45)');
  });

  it('ignore une couleur mal formée', () => {
    expect(signatureNameColor({ ...signature, nameColor: 'red' })).toBeUndefined();
    expect(signatureRing({ ...signature, accentColor: '#fff' })).toBeUndefined();
  });
});
