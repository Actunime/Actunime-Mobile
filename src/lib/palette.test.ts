import { describe, expect, it } from 'vitest';
import { DEFAULT_MEMBER_APPEARANCE, THEME_PRESETS, type IMemberAppearanceBody } from '@actunime/validations';

import { DEFAULT_PALETTE, mixColors, nativeFontFamily, paletteFromAppearance, readableOn } from './palette';

const base = DEFAULT_MEMBER_APPEARANCE as IMemberAppearanceBody;
const forest = THEME_PRESETS.find((p) => p.id === 'foret')!;
const themed = (patch: Partial<IMemberAppearanceBody>): IMemberAppearanceBody => ({ ...base, colors: forest.colors, accentColor: forest.accentColor, ...patch });

describe('paletteFromAppearance', () => {
  it('garde la charte sans thème, ou avec le thème par défaut', () => {
    expect(paletteFromAppearance(null, 'site')).toBe(DEFAULT_PALETTE);
    expect(paletteFromAppearance(base, 'profile').isDefault).toBe(true);
    expect(paletteFromAppearance(base, 'profile').background).toBe(DEFAULT_PALETTE.background);
  });

  it('reprend les couleurs libres du membre', () => {
    const p = paletteFromAppearance(themed({}), 'profile');
    expect(p.isDefault).toBe(false);
    expect(p.background).toBe(forest.colors!.background);
    expect(p.primary).toBe(forest.colors!.primary);
    expect(p.mutedForeground).toMatch(/^rgb\(/);
  });

  it('rend les cartes transparentes à la demande', () => {
    const p = paletteFromAppearance(themed({ effects: { ...base.effects, transparentCards: true } }), 'profile');
    expect(p.card).toBe('rgba(0,0,0,0)');
  });

  it('le fond d’image « profil » ne sort pas du profil, celui de « page » va partout', () => {
    const bg = { imageUrl: 'https://x/y.jpg', blur: 4, overlay: 0.5, fixed: true };
    const profileOnly = themed({ background: { ...bg, scope: 'profile' } });
    expect(paletteFromAppearance(profileOnly, 'site').backgroundImage).toBeNull();
    expect(paletteFromAppearance(profileOnly, 'profile').backgroundImage).toMatchObject({ imageUrl: bg.imageUrl, overlayColor: '#000000' });
    expect(paletteFromAppearance(themed({ background: { ...bg, scope: 'page' } }), 'site').backgroundImage).not.toBeNull();
    expect(paletteFromAppearance(themed({ background: { ...bg, scope: 'page' } }), 'site').background).toBe('rgba(0,0,0,0)');
  });

  it('police et lueur sans couleurs libres', () => {
    const p = paletteFromAppearance({ ...base, fontFamily: 'serif', effects: { ...base.effects, cardGlow: true } }, 'profile');
    expect(p).toMatchObject({ font: 'serif', cardGlow: true, isDefault: false });
    expect(nativeFontFamily('mono')).toBe('monospace');
    expect(nativeFontFamily('sans')).toBeUndefined();
  });
});

describe('couleurs', () => {
  it('mélange et choisit un texte lisible', () => {
    expect(mixColors('#ffffff', '#000000', 0.5)).toBe('rgb(128, 128, 128)');
    expect(readableOn('#ffd98a')).toBe('#000616');
    expect(readableOn('#101040')).toBe('#ffffff');
  });
});
