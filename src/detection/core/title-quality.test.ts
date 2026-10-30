import { describe, expect, it } from 'vitest';

import { isPlausibleTitle, titleKey } from './title-quality';

describe('isPlausibleTitle', () => {
  it('écarte les identifiants et les titres vides', () => {
    for (const bad of ['6225159', 'z0l20', 'a9f3c1b2', '12-3', 'ab', '', '...']) expect(isPlausibleTitle(bad)).toBe(false);
    expect(isPlausibleTitle(undefined)).toBe(false);
  });

  it('garde de vrais titres, même avec un chiffre', () => {
    for (const good of ['One Piece', "God-level Assassin, I'm the Shadow", '86 Eighty-Six', 'Mob Psycho 100', 'Re:Zero', 'Bleach']) {
      expect(isPlausibleTitle(good)).toBe(true);
    }
  });
});

describe('titleKey', () => {
  it('rend deux écritures du même titre comparables', () => {
    expect(titleKey("God-level Assassin, I'm the Shadow")).toBe(titleKey('god level assassin im the shadow'.replace('im', "i m")));
  });
});
