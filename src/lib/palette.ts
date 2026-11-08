import type { IMemberAppearance } from '@actunime/types';
import type { IMemberAppearanceBody } from '@actunime/validations';

import { Tw } from '@/constants/theme';

/**
 * Thème d'un membre (E132) traduit en palette de l'app, comme `appearanceToCssVars` du site le traduit en variables
 * CSS. Une palette ne contient que ce que les composants de base (`Screen`, `Txt`, `Button`, cartes) lisent : un écran
 * qui écrit encore une couleur en dur garde la charte Actunime.
 */

type IAppearanceLike = IMemberAppearance | IMemberAppearanceBody;

export type IFontKind = 'sans' | 'serif' | 'mono';

export interface IPaletteBackground {
  imageUrl: string;
  blur: number;
  overlay: number;
  overlayColor: string;
  fixed: boolean;
}

export interface IPalette {
  foreground: string;
  background: string;
  card: string;
  cardForeground: string;
  muted: string;
  mutedForeground: string;
  input: string;
  border: string;
  primary: string;
  primaryForeground: string;
  accent: string;
  /** Couleur d'accent du membre (pseudo, liseré) : sert aux effets, jamais de fond de page. */
  memberAccent: string;
  font: IFontKind;
  /** Fond d'image du thème (E135), absent sans image ou hors de sa portée. */
  backgroundImage: IPaletteBackground | null;
  /** Lueur autour des cartes, option du thème. */
  cardGlow: boolean;
  /** Vrai pour la palette d'origine : les composants gardent alors exactement leurs styles d'avant. */
  isDefault: boolean;
}

export const DEFAULT_PALETTE: IPalette = {
  foreground: Tw.color.foreground,
  background: Tw.color.background,
  card: Tw.color.card,
  cardForeground: Tw.color.foreground,
  muted: Tw.color.muted,
  mutedForeground: Tw.color.mutedForeground,
  input: Tw.color.input,
  border: Tw.color.border,
  primary: Tw.color.primary,
  primaryForeground: Tw.color.primaryForeground,
  accent: Tw.color.accent,
  memberAccent: Tw.color.primary,
  font: 'sans',
  backgroundImage: null,
  cardGlow: false,
  isDefault: true,
};

const HEX = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;
const ok = (value: string | undefined | null): value is string => !!value && HEX.test(value);
const rgb = (hex: string): [number, number, number] => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];

/** Mélange `top` (part `amount`) sur `base`, couleurs `#rrggbb` : fond opaque. */
export function mixColors(top: string, base: string, amount: number): string {
  const a = rgb(top);
  const b = rgb(base);
  const channel = (i: number) => Math.round(a[i] * amount + b[i] * (1 - amount));
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
}

const opaque = (hex: string) => hex.slice(0, 7);

/**
 * Palette d'un membre. `context` : `site` = mon thème sur toute l'app (le fond d'image n'y compte que pour la portée
 * `page`) ; `profile` = le profil que visite quelqu'un (le fond `profile` y est permis). Sans couleurs libres, seule
 * la couleur d'accent change : la charte reste.
 */
export function paletteFromAppearance(appearance: IAppearanceLike | null | undefined, context: 'site' | 'profile'): IPalette {
  if (!appearance) return DEFAULT_PALETTE;
  const full = appearance as IMemberAppearanceBody;
  const c = full.colors;
  const bg = full.background;
  const image = bg && (bg.scope === 'page' || context === 'profile') ? { imageUrl: bg.imageUrl, blur: bg.blur, overlay: bg.overlay, overlayColor: ok(bg.overlayColor) ? bg.overlayColor : '#000000', fixed: bg.fixed } : null;
  const font = (appearance.fontFamily ?? 'sans') as IFontKind;
  const accent = ok(appearance.accentColor) ? appearance.accentColor : DEFAULT_PALETTE.memberAccent;
  const glow = appearance.effects?.cardGlow === true;
  if (!c) {
    const touched = font !== 'sans' || glow || !!image;
    return touched ? { ...DEFAULT_PALETTE, memberAccent: accent, font, backgroundImage: image, cardGlow: glow, isDefault: false } : { ...DEFAULT_PALETTE, memberAccent: accent };
  }
  const transparentCards = appearance.effects?.transparentCards === true;
  const card = transparentCards ? 'rgba(0,0,0,0)' : c.card;
  return {
    foreground: c.foreground,
    background: image ? 'rgba(0,0,0,0)' : c.background,
    card,
    cardForeground: c.cardForeground,
    muted: transparentCards ? 'rgba(0,0,0,0)' : opaque(c.card),
    mutedForeground: mixColors(c.foreground, opaque(c.background), 0.72),
    input: mixColors(c.primary, opaque(c.card), 0.28),
    border: c.border,
    primary: c.primary,
    primaryForeground: readableOn(c.primary),
    accent: mixColors(c.primary, opaque(c.card), 0.28),
    memberAccent: accent,
    font,
    backgroundImage: image,
    cardGlow: glow,
    isDefault: false,
  };
}

/** Texte lisible sur une couleur pleine : le plus sombre des deux extrêmes de la charte qui contraste le mieux. */
export function readableOn(hex: string): string {
  const [r, g, b] = rgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // Contraste avec le noir (#000616 ~ 0) contre le blanc : on garde le plus fort.
  return (luminance + 0.05) / 0.05 > 1.05 / (luminance + 0.05) ? '#000616' : '#ffffff';
}

/** Famille de police native d'un choix de thème (Android) ; `sans` garde Outfit, la police de la charte. */
export function nativeFontFamily(font: IFontKind): string | undefined {
  return font === 'serif' ? 'serif' : font === 'mono' ? 'monospace' : undefined;
}

/**
 * Couleur d'un texte ou d'une icône dans la palette en vigueur : les écrans écrivent les jetons de la charte
 * (`Tw.color.mutedForeground`…), cette fonction les remplace par ceux du thème. Toute autre couleur reste telle quelle.
 */
export function themedColor(color: string | undefined, palette: IPalette): string {
  if (palette.isDefault) return color ?? DEFAULT_PALETTE.foreground;
  switch (color) {
    case undefined:
    case Tw.color.foreground:
      return palette.foreground;
    case Tw.color.mutedForeground:
      return palette.mutedForeground;
    case Tw.color.primary:
      return palette.primary;
    case Tw.color.primaryForeground:
      return palette.primaryForeground;
    default:
      return color;
  }
}

/** Style d'une carte dans la palette en vigueur ; `undefined` pour la charte d'origine (la carte garde son style). */
export function cardOverride(palette: IPalette): { backgroundColor: string; shadowColor?: string; shadowOpacity?: number; shadowRadius?: number; elevation?: number; borderWidth?: number; borderColor?: string } | undefined {
  if (palette.isDefault) return undefined;
  const glow = palette.cardGlow ? { shadowColor: palette.memberAccent, shadowOpacity: 0.6, shadowRadius: 12, elevation: 8 } : {};
  const transparent = palette.card === 'rgba(0,0,0,0)';
  return { backgroundColor: palette.card, ...glow, ...(transparent ? { elevation: 0, shadowOpacity: 0, borderWidth: 1, borderColor: palette.border } : {}) };
}
