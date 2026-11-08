import { describe, expect, it } from 'vitest';
import { DEFAULT_MEMBER_APPEARANCE, THEME_PRESETS, type IMemberAppearanceBody } from '@actunime/validations';

import { appearanceIssues, applyPreset, blockedReason, customizesSignature, isDraftDirty, normalizeHex, setThemeColor } from './appearance-edit';

const base = DEFAULT_MEMBER_APPEARANCE as IMemberAppearanceBody;
const noPerks = { signature: false, theme: false, themeAdvanced: false, animatedMedia: false, hideSponsored: false };
const pilier = { ...noPerks, signature: true };
const gardien = { ...pilier, theme: true };
const preset = THEME_PRESETS.find((p) => p.id === 'foret')!;

describe('blockedReason', () => {
  it('sans avantage, rien ne s’enregistre', () => {
    expect(blockedReason(base, noPerks, false)).toMatch(/Pilier/);
  });

  it('une signature simple passe dès le Pilier, un thème libre demande le Gardien', () => {
    expect(blockedReason({ ...base, nameColor: '#ff0000' }, pilier, false)).toBeNull();
    expect(blockedReason(applyPreset(base, preset), pilier, false)).toBeNull();
    expect(blockedReason({ ...base, fontFamily: 'serif' }, pilier, false)).toMatch(/Gardien/);
    expect(blockedReason({ ...base, fontFamily: 'serif' }, gardien, false)).toBeNull();
  });

  it('les auras de Soutien ne se débloquent pas par palier', () => {
    const aura = { ...base, aura: { source: 'theme' as const, profile: true, style: 'ember' as const } };
    expect(blockedReason(aura, { ...gardien, themeAdvanced: true }, false)).toMatch(/Soutien/);
    expect(blockedReason(aura, { ...gardien, themeAdvanced: true }, true)).toBeNull();
  });
});

describe('édition', () => {
  it('détecte les changements et la signature personnalisée', () => {
    expect(isDraftDirty(base, base)).toBe(false);
    expect(isDraftDirty({ ...base, fontFamily: 'mono' }, base)).toBe(true);
    expect(customizesSignature(base)).toBe(false);
    expect(customizesSignature({ ...base, accentColor: '#ff0000' })).toBe(true);
  });

  it('refuse une couleur de texte illisible sur le fond', () => {
    const themed = applyPreset(base, preset);
    expect(appearanceIssues(themed, gardien)).toEqual({});
    expect(Object.keys(appearanceIssues(setThemeColor(themed, 'foreground', '#0a0a0a'), gardien)).length).toBeGreaterThan(0);
  });

  it('normalise une saisie hexadécimale', () => {
    expect(normalizeHex('FFAA00')).toBe('#ffaa00');
    expect(normalizeHex('#abc')).toBe('#aabbcc');
    expect(normalizeHex('zz')).toBeNull();
  });
});
