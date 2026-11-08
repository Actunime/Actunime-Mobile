import { describe, expect, it } from 'vitest';

import { auraColor, resolveAura, tierOfBadges } from './aura';

const sig = { nameColor: '#ffffff', accentColor: '#38bdf8' };

describe('resolveAura', () => {
  it('pas d’aura sous le palier Pilier, sans style de Soutien', () => {
    expect(resolveAura(null, 0)).toBeNull();
    expect(resolveAura(sig, 3)).toBeNull();
  });

  it('suit le palier : orbite à deux lumières au Pilier, comètes et cadre au Mythique', () => {
    expect(resolveAura(null, 4)).toMatchObject({ orbit: 2, halo: false, comets: 0 });
    expect(resolveAura(null, 5)).toMatchObject({ halo: true, orbit: 3 });
    expect(resolveAura(null, 6)).toMatchObject({ disc: true, twinkles: 4 });
    expect(resolveAura(null, 7)).toMatchObject({ rays: true, risers: 5 });
    expect(resolveAura(null, 8)).toMatchObject({ aurora: true, frame: true, comets: 2 });
  });

  it('un style de Soutien remplace l’aura du palier, dès le palier 0', () => {
    const ember = resolveAura({ ...sig, auraStyle: 'ember' }, 0);
    expect(ember).toMatchObject({ halo: true, risers: 8, comets: 0 });
    expect(resolveAura({ ...sig, auraStyle: 'stars', auraIntensity: 'intense' }, 0)).toMatchObject({ twinkles: 6, frame: true, comets: 2 });
    expect(resolveAura({ ...sig, auraStyle: 'sakura', auraIntensity: 'soft' }, 0)).toMatchObject({ halo: false, orbit: 0 });
  });

  it('le style « tier » laisse l’aura du palier', () => {
    expect(resolveAura({ ...sig, auraStyle: 'tier' }, 4)).toMatchObject({ orbit: 2 });
    expect(resolveAura({ ...sig, auraStyle: 'tier' }, 2)).toBeNull();
  });
});

describe('auraColor', () => {
  it('la couleur libre l’emporte, puis l’accent du thème, puis le palier', () => {
    expect(auraColor({ ...sig, auraColor: '#112233' }, 5)).toBe('#112233');
    expect(auraColor(sig, 5)).toBe('#38bdf8');
    expect(auraColor({ ...sig, auraSource: 'tier' }, 5)).toBe('#ffd35e');
    expect(auraColor(null, 8)).toBe('#fff3c9');
  });

  it('ignore une couleur mal formée', () => {
    expect(auraColor({ ...sig, auraColor: 'rouge' }, 5)).toBe('#38bdf8');
  });
});

describe('tierOfBadges', () => {
  it('garde le palier le plus haut et ignore les badges qui n’en sont pas', () => {
    const badges = [{ badge: { name: 'contributeur-3' } }, { badge: { name: 'staff' } }, { badge: { name: 'contributeur-6' } }] as never;
    expect(tierOfBadges(badges)).toBe(6);
    expect(tierOfBadges(null)).toBe(0);
  });
});

describe('compactAura', () => {
  it('garde l’essentiel et retire ce qui déborde', async () => {
    const { compactAura } = await import('./aura');
    const full = resolveAura(null, 8)!;
    expect(compactAura(full)).toMatchObject({ orbit: 2, comets: 0, risers: 0, frame: false, aurora: false, rays: false, twinkles: 2 });
    expect(compactAura(null)).toBeNull();
  });
});
