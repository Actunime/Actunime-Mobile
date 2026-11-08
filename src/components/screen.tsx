import { StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { usePalette } from '@/components/theme-context';
import { MaxContentWidth } from '@/constants/theme';

/** Fond de la charte, zones sûres et colonne centrée de largeur maximale (tablette). */
export function Screen({ children, edges = ['top'] }: Readonly<{ children: React.ReactNode; edges?: Edge[] }>) {
  const palette = usePalette();
  // Avec une image de fond, la page est transparente : l'image posée derrière (racine ou profil) se voit.
  return (
    <View style={[styles.container, { backgroundColor: palette.backgroundImage ? 'transparent' : palette.background }]}>
      <SafeAreaView style={styles.container} edges={edges}>
        <View style={styles.page}>{children}</View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  page: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
});
