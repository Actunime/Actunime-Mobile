/**
 * Charte Actunime (`ui/src/theme.css`, thème sombre) convertie en hexadécimal.
 * L'app est sombre uniquement, comme la maquette validée (E56) : pas de thème clair.
 */
export const Colors = {
  text: '#f9fafb', // --foreground
  background: '#000616', // --background
  backgroundElement: '#14244f', // --card
  backgroundSelected: '#102866', // --muted
  textSecondary: '#bed5ff', // --muted-foreground
  primary: '#0099ff', // --primary
  primaryForeground: '#000616', // texte sur fond primary : 6,8:1 (le clair n'en donnait que 2,8:1)
  border: 'rgba(255, 255, 255, 0.16)', // --border
  input: '#2b4587', // --input
  destructive: '#ff6467', // --destructive
  success: '#41a867', // --success
  warning: '#d39045', // --warning
  anime: '#6b9aff', // --c-anime
  manga: '#f072b3', // --c-manga
} as const;

export type ThemeColor = keyof typeof Colors;

/** Outfit, la police du site : une famille par graisse (Android ne gère pas `fontWeight` sur une police personnalisée). */
export const Fonts = {
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semibold: 'Outfit_600SemiBold',
  bold: 'Outfit_700Bold',
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Marge latérale unique de tous les écrans (16 dp) : le contenu ne s'en écarte jamais. */
export const ScreenGutter = 16;

/** Rayon des cartes et boutons (`--radius`: 0.45rem, arrondi pour le tactile). */
export const Radius = { small: 8, medium: 12, large: 16 } as const;
export const MaxContentWidth = 720;

/**
 * Transposition des classes Tailwind du site (`ui/src/theme.css`, thème sombre) : 1 unité = 4 dp.
 * Les écrans portés du site s'écrivent avec ces jetons pour garder les mêmes tailles, rayons et couleurs.
 */
export const Tw = {
  /** `rounded-*` : `--radius` (7,2 dp) et ses dérivés. */
  radius: { sm: 3.2, md: 5.2, lg: 7.2, xl: 11.2, '2xl': 15.2, full: 9999 },
  /** `text-*` : taille et hauteur de ligne par défaut de Tailwind. */
  text: {
    '10': { fontSize: 10, lineHeight: 14 },
    '11': { fontSize: 11, lineHeight: 15 },
    xs: { fontSize: 12, lineHeight: 16 },
    sm: { fontSize: 14, lineHeight: 20 },
    base: { fontSize: 16, lineHeight: 24 },
    lg: { fontSize: 18, lineHeight: 28 },
    xl: { fontSize: 20, lineHeight: 28 },
    '2xl': { fontSize: 24, lineHeight: 32 },
  },
  color: {
    foreground: '#f9fafb',
    background: '#000616',
    card: '#14244f', // proche du bleu des champs (`input`), pour que cartes et champs fassent un seul bleu
    secondary: '#14244f',
    popover: '#0c1945',
    muted: '#102866',
    mutedForeground: '#bed5ff',
    accent: '#174283',
    input: '#2b4587',
    ring: '#3c5aa6',
    border: 'rgba(255, 255, 255, 0.16)',
    primary: '#0099ff',
    /** Fond des boutons et pastilles pleines : texte clair à 5,1:1 (sur `primary`, 2,8:1 seulement). */
      primaryForeground: '#000616',
    success: '#41a867',
    warning: '#d39045',
    destructive: '#ff6467',
    // Palette Tailwind v4 utilisée par les cartes du site.
    blue400: '#51a2ff',
    blue500: '#2b7fff',
    blue600: '#155dfc',
    green400: '#05df72',
    green500: '#00c950',
    green600: '#00a63e',
    yellow400: '#fdc700',
    yellow500: '#f0b100',
    yellow600: '#d08700',
    red400: '#ff6467',
    red500: '#fb2c36',
    red600: '#e7000b',
    purple400: '#c27aff',
    purple500: '#ad46ff',
    purple600: '#9810fa',
    orange400: '#ff8904',
    orange500: '#ff6900',
    orange600: '#f54900',
    amber400: '#ffb900',
    amber500: '#fe9a00',
    amber600: '#e17100',
    emerald500: '#00bc7d',
    gray400: '#99a1af',
    gray500: '#6a7282',
    gray600: '#4a5565',
    rose400: '#ff637e',
    rose500: '#ff2056',
  },
} as const;

/** Couleur avec opacité (`bg-primary/10` → `alpha(Tw.color.primary, 0.1)`), pour une couleur `#rrggbb`. */
export function alpha(hex: string, opacity: number): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
