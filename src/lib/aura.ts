import { contributionTierOf, type IBadgeMember, type IMemberAuraIntensity, type IMemberAuraStyle, type IMemberSignature } from '@actunime/types';

/**
 * Aura animée de l'avatar, transposée de `AvatarAura` du site (E141) : le palier de contribution règle la forme de
 * l'effet, la signature Supporter (style, couleur, intensité) la remplace. Ici seule la logique de choix : le dessin
 * est dans `components/member/avatar-aura.tsx`.
 */

/** Palier à partir duquel la photo vit : même seuil que l'emblème du badge. */
export const AURA_MIN_TIER = 4;

export type IAuraStyle = Exclude<IMemberAuraStyle, 'tier'>;

/** Couleur propre à chaque style d'aura de Soutien (`SUPPORTER_STYLE_COLORS` de `@actunime/ui`). */
export const STYLE_COLORS: Record<IAuraStyle, string> = {
  ember: '#ff8a3d',
  aurora: '#5eead4',
  sakura: '#ff9fc8',
  stars: '#ffd98a',
};

const TIER_COLORS: Record<number, string> = { 4: '#ff9be8', 5: '#ffd35e', 6: '#b9a6ff', 7: '#ff7ad9', 8: '#fff3c9' };

/** Couleurs des lumières qui tournent, celles de l'emblème de chaque palier (palette `tier`). */
const ORBIT_COLORS: Record<number, readonly string[]> = {
  4: ['#7fd6ff', '#ff9be8'],
  5: ['#ffd98a', '#ffd98a', '#ffffff'],
  6: ['#7fd6ff', '#ff9be8', '#ffd98a'],
  7: ['#ff9be8', '#7fd6ff', '#ffd98a'],
};

const HEX = /^#[0-9a-fA-F]{6}$/;
const safe = (color: string | undefined | null) => (color && HEX.test(color) ? color : undefined);

/** Palier de contribution le plus haut des badges d'un membre (0 si aucun). */
export function tierOfBadges(badges: readonly IBadgeMember[] | null | undefined): number {
  let best = 0;
  for (const entry of badges ?? []) best = Math.max(best, contributionTierOf(entry.badge?.name));
  return best;
}

/** Les effets de la scène, déduits une fois pour toutes : le composant ne fait que les dessiner. */
export interface IAuraSpec {
  /** Couleur principale de l'aura. */
  color: string;
  /** Anneau de halo supplémentaire. */
  halo: boolean;
  /** Disque diffus derrière la photo. */
  disc: boolean;
  /** Cadre lumineux autour de la photo. */
  frame: boolean;
  /** Lueur mouvante d'aurore. */
  aurora: boolean;
  /** Anneau de rayons qui tourne lentement. */
  rays: boolean;
  /** Nombre de lumières en orbite et leurs couleurs (vide = `color`). */
  orbit: number;
  orbitColors: readonly string[];
  /** Comètes : lumières rapides en orbite. */
  comets: number;
  /** Étoiles qui scintillent autour de la photo. */
  twinkles: number;
  /** Particules qui montent (braises, pétales, étincelles) et leur couleur. */
  risers: number;
  riserColor: string;
}

const base = (color: string): IAuraSpec => ({
  color,
  halo: false,
  disc: false,
  frame: false,
  aurora: false,
  rays: false,
  orbit: 0,
  orbitColors: [],
  comets: 0,
  twinkles: 0,
  risers: 0,
  riserColor: color,
});

/** Couleur des effets : celle choisie par le Soutien, sinon l'accent du thème, sinon celle du palier (`memberAuraColor` du site). */
export function auraColor(signature: IMemberSignature | null | undefined, tier: number): string {
  const custom = safe(signature?.auraColor);
  if (custom) return custom;
  const own = TIER_COLORS[Math.min(Math.max(tier, 4), 8)] ?? '#ff9be8';
  const style = signature?.auraStyle;
  if (style && style !== 'tier' && signature?.auraSource === 'tier') return STYLE_COLORS[style];
  if (!signature || signature.auraSource === 'tier') return own;
  return safe(signature.accentColor) ?? safe(signature.primaryColor) ?? own;
}

const level = (intensity: IMemberAuraIntensity | undefined) => (intensity === 'soft' ? 0 : intensity === 'intense' ? 2 : 1);

/** Aura d'un membre, ou `null` quand il n'en a pas (sous le palier Pilier et sans aura de Soutien). */
export function resolveAura(signature: IMemberSignature | null | undefined, tier: number): IAuraSpec | null {
  const style = signature?.auraStyle;
  if (style && style !== 'tier') {
    const lvl = level(signature?.auraIntensity);
    const color = safe(signature?.auraColor) ?? (signature?.auraSource === 'tier' ? STYLE_COLORS[style] : (safe(signature?.accentColor) ?? STYLE_COLORS[style]));
    const spec = base(color);
    const fx = (min: number) => lvl >= min;
    spec.aurora = style === 'aurora';
    spec.disc = (style === 'aurora' && fx(0)) || (style === 'ember' && fx(1)) || (style === 'stars' && fx(2));
    spec.halo = (style === 'ember' && fx(0)) || (style === 'sakura' && fx(1));
    spec.rays = (style === 'aurora' && fx(1)) || (style === 'sakura' && fx(2)) || (style === 'ember' && fx(2)) || (style === 'stars' && fx(1));
    spec.frame = fx(2) && (style === 'aurora' || style === 'stars');
    spec.twinkles = style === 'stars' ? 6 : style === 'sakura' && fx(1) ? 4 : 0;
    spec.risers = style === 'sakura' || style === 'ember' ? 8 : 0;
    spec.riserColor = color;
    spec.orbit = fx(1) ? (style === 'sakura' ? 2 : 3) : 0;
    spec.comets = fx(2) ? (style === 'ember' || style === 'sakura' ? 1 : 2) : 0;
    return spec;
  }
  if (tier < AURA_MIN_TIER) return null;
  const spec = base(auraColor(signature, tier));
  const tierPalette = !signature || signature.auraSource === 'tier';
  spec.aurora = tier === 8;
  spec.rays = tier >= 7;
  spec.disc = tier >= 6;
  spec.halo = tier === 5;
  spec.frame = tier === 8;
  spec.twinkles = tier >= 6 ? 4 : 0;
  spec.risers = tier >= 7 ? 5 : 0;
  spec.orbit = tier === 4 ? 2 : 3;
  spec.orbitColors = tierPalette ? (ORBIT_COLORS[Math.min(tier, 7)] ?? []) : [];
  spec.comets = tier === 8 ? 2 : 0;
  return spec;
}

/**
 * Aura réduite des listes (membres, amis, demandes) : l'anneau qui respire, quelques lumières et étoiles, sans
 * rayons, comètes, particules ni cadre qui déborderaient sur la ligne voisine. Comme sur le site : « ailleurs, l'effet
 * réduit reste ».
 */
export function compactAura(spec: IAuraSpec | null): IAuraSpec | null {
  if (!spec) return null;
  return { ...spec, halo: false, disc: false, frame: false, rays: false, aurora: false, comets: 0, risers: 0, orbit: Math.min(spec.orbit, 2), twinkles: Math.min(spec.twinkles, 2) };
}
