import { describe, expect, it } from 'vitest';
import { DEFAULT_MEMBER_APPEARANCE, THEME_PRESETS, type IMemberAppearanceBody } from '@actunime/validations';

import { applyRemap, remapTable, toRgb } from './color-remap';
import { DEFAULT_PALETTE, paletteFromAppearance } from './palette';

const forest = THEME_PRESETS.find((p) => p.id === 'foret')!;
const themed = paletteFromAppearance({ ...(DEFAULT_MEMBER_APPEARANCE as IMemberAppearanceBody), colors: forest.colors, accentColor: forest.accentColor }, 'site');

describe('toRgb', () => {
  it('lit les formes de couleur courantes', () => {
    expect(toRgb('#14244f')).toBe(0x14244f);
    expect(toRgb('#14244fcc')).toBe(0x14244f);
    expect(toRgb('rgb(20, 36, 79)')).toBe(0x14244f);
    expect(toRgb('rgba(0, 153, 255, 0.1)')).toBe(0x0099ff);
    expect(toRgb('red')).toBeNull();
  });
});

describe('remapTable', () => {
  it('ne change rien sans thème', () => {
    expect(remapTable(DEFAULT_PALETTE)).toBeNull();
  });

  it('remplace les couleurs de la charte par celles du thème', () => {
    const table = remapTable(themed)!;
    expect(table.get(0x000616)).toBe(toRgb(forest.colors!.background));
    expect(table.get(0x0099ff)).toBe(toRgb(forest.colors!.primary));
    expect(table.get(0x14244f)).toBe(toRgb(forest.colors!.card));
  });

  it('garde l’alpha et laisse intacte une couleur hors charte', () => {
    const table = remapTable(themed)!;
    const primary = toRgb(forest.colors!.primary)!;
    expect(applyRemap(0x0099ff29, table)).toBe(((primary << 8) | 0x29) >>> 0);
    expect(applyRemap(0xff0000ff, table)).toBe(0xff0000ff);
  });
});
