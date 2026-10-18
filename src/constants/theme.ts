/**
 * Charte Actunime (`ui/src/theme.css`, thème sombre) convertie en hexadécimal.
 * L'app est sombre uniquement, comme la maquette validée (E56) : pas de thème clair.
 */
export const Colors = {
  text: '#f9fafb', // --foreground
  background: '#000616', // --background
  backgroundElement: '#030a1d', // --card
  backgroundSelected: '#102866', // --muted
  textSecondary: '#bed5ff', // --muted-foreground
  primary: '#0099ff', // --primary
  primaryForeground: '#eff6ff', // --primary-foreground
  border: 'rgba(255, 255, 255, 0.1)', // --border
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

/** Rayon des cartes et boutons (`--radius`: 0.45rem, arrondi pour le tactile). */
export const Radius = { small: 8, medium: 12, large: 16 } as const;
export const MaxContentWidth = 720;
