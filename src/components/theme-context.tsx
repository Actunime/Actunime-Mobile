import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAuth } from '@/lib/auth-store';
import { billingApi } from '@/lib/billing';
import { alpha } from '@/constants/theme';
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

export function OwnThemeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const shown = useOwnAppearance();
  const palette = useMemo(() => paletteFromAppearance(shown, 'site'), [shown]);
  return (
    <PaletteContext.Provider value={palette}>
      <View style={[styles.root, { backgroundColor: palette.isDefault ? DEFAULT_PALETTE.background : palette.backgroundImage ? '#000000' : palette.background }]}>
        <ThemeBackdrop palette={palette} />
        {children}
      </View>
    </PaletteContext.Provider>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
