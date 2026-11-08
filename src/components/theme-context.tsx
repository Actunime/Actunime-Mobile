import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAuth } from '@/lib/auth-store';
import { billingApi } from '@/lib/billing';
import { alpha } from '@/constants/theme';
import { installColorRemap, remapTable } from '@/lib/color-remap';
import { DEFAULT_PALETTE, paletteFromAppearance, type IPalette } from '@/lib/palette';
import { useThemeState } from '@/lib/theme-store';

const PaletteContext = createContext<IPalette>(DEFAULT_PALETTE);

/** Palette en vigueur : la mienne partout, celle du membre visité sur son profil. */
export const usePalette = (): IPalette => useContext(PaletteContext);

export function PaletteProvider({ palette, children }: Readonly<{ palette: IPalette; children: ReactNode }>) {
  return <PaletteContext.Provider value={palette}>{children}</PaletteContext.Provider>;
}

/** Mon apparence enregistrée, avec les avantages qui la permettent (`GET /billing/appearance`). */
export const useMyAppearance = () => {
  const { auth } = useAuth();
  return useQuery({ queryKey: ['my-appearance'], queryFn: billingApi.appearance, enabled: !!auth, staleTime: 60_000, retry: false });
};

/** Image de fond du thème avec son flou et son voile, posée derrière le contenu (E135). */
export function ThemeBackdrop({ palette }: Readonly<{ palette: IPalette }>) {
  const bg = palette.backgroundImage;
  if (!bg) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image source={{ uri: bg.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={bg.blur} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: alpha(bg.overlayColor, bg.overlay) }]} />
    </View>
  );
}

/**
 * Applique à toute l'app, pour le membre connecté, son propre thème : celui qu'il a enregistré (s'il y a droit et
 * qu'il ne l'a pas coupé), ou son brouillon pendant qu'il l'édite. Le thème d'un profil visité prime sur ce profil.
 */
export function useOwnAppearance() {
  const { data } = useMyAppearance();
  const { applyOwnTheme, draft } = useThemeState();
  const saved = data?.perks.signature && applyOwnTheme ? data.appearance : null;
  return draft ?? saved;
}

const ThemeEpochContext = createContext(0);
const OwnTableContext = createContext<ReadonlyMap<number, number> | null>(null);

/** Table des couleurs de la charte → mon thème enregistré (`null` sans thème) : un profil visité la remplace le temps de son affichage. */
export const useOwnColorTable = (): ReadonlyMap<number, number> | null => useContext(OwnTableContext);

/**
 * Numéro de « génération » du thème enregistré : il change quand le thème appliqué à toute l'app change. Les écrans
 * (`Screen`) se redessinent alors depuis zéro, pour que les couleurs de la charte écrites en dur reprennent le
 * nouveau thème (React Native ne relit pas une couleur dont le style n'a pas changé).
 */
export const useThemeEpoch = (): number => useContext(ThemeEpochContext);

export function OwnThemeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const shown = useOwnAppearance();
  const { data } = useMyAppearance();
  const { applyOwnTheme } = useThemeState();
  // Thème global (couleurs de la charte écrites en dur) : celui qui est ENREGISTRÉ, pas le brouillon de l'éditeur,
  // qui n'habille que les composants branchés sur la palette. Posé avant le rendu des écrans.
  const committed = data?.perks.signature && applyOwnTheme ? data.appearance : null;
  const table = useMemo(() => remapTable(paletteFromAppearance(committed, 'site')), [committed]);
  const epoch = useRef({ key: '', value: 0 });
  const key = table ? [...table].map(([from, to]) => `${from}:${to}`).join(',') : '';
  installColorRemap(table);
  if (epoch.current.key !== key) epoch.current = { key, value: epoch.current.value + 1 };
  const palette = useMemo(() => paletteFromAppearance(shown, 'site'), [shown]);
  return (
    <PaletteContext.Provider value={palette}>
      <ThemeEpochContext.Provider value={epoch.current.value}>
      <OwnTableContext.Provider value={table}>
      <View style={[styles.root, { backgroundColor: palette.isDefault ? DEFAULT_PALETTE.background : palette.backgroundImage ? '#000000' : palette.background }]}>
        <ThemeBackdrop palette={palette} />
        {children}
      </View>
      </OwnTableContext.Provider>
      </ThemeEpochContext.Provider>
    </PaletteContext.Provider>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
