import { describe, expect, it } from 'vitest';

import { dataUrlBytes, imageProblem, toDataUrl } from './image-data';

describe('image-data', () => {
  it('construit une data URL, jpeg par défaut', () => {
    expect(toDataUrl('AAAA', 'image/png')).toBe('data:image/png;base64,AAAA');
    expect(toDataUrl('AAAA', null)).toBe('data:image/jpeg;base64,AAAA');
    expect(toDataUrl('AAAA', 'application/pdf')).toBe('data:image/jpeg;base64,AAAA');
  });

  it('compte les octets sans décoder', () => {
    expect(dataUrlBytes('data:image/png;base64,AAAA')).toBe(3);
    expect(dataUrlBytes('data:image/png;base64,AAA=')).toBe(2);
    expect(dataUrlBytes('data:image/png;base64,AA==')).toBe(1);
  });

  it('refuse une image trop lourde ou d’un format non pris en charge', () => {
    expect(imageProblem('data:image/jpeg;base64,AAAA', 'AVATAR')).toBeNull();
    expect(imageProblem('pas une image', 'AVATAR')).toMatch(/invalide/);
    expect(imageProblem('data:image/gif;base64,AAAA', 'BACKGROUND')).toMatch(/Format/);
    expect(imageProblem('data:image/gif;base64,AAAA', 'AVATAR')).toBeNull();
    const big = `data:image/jpeg;base64,${'A'.repeat(14_000_000)}`;
    expect(imageProblem(big, 'BACKGROUND')).toMatch(/10 Mo/);
    expect(imageProblem(big, 'AVATAR')).toBeNull();
  });
});
