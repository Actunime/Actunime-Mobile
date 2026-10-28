import { StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth } from '@/constants/theme';

/** Fond de la charte, zones sûres et colonne centrée de largeur maximale (tablette). */
export function Screen({ children, edges = ['top'] }: Readonly<{ children: React.ReactNode; edges?: Edge[] }>) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container} edges={edges}>
        <View style={styles.page}>{children}</View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  page: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
});
