import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Pressable } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { hostOf } from '@/lib/browsing';
import { MAX_TABS, type ITab } from '@/lib/tabs';

/** Bouton d'accès aux onglets, avec leur nombre (comme dans un navigateur : un carré et un chiffre). */
export function TabCountButton({ count, onPress }: Readonly<{ count: number; onPress: () => void }>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Onglets (${count})`}
      onPress={onPress}
      hitSlop={8}
      style={styles.countButton}
    >
      <View style={styles.countBox}>
        <ThemedText type="smallBold" style={styles.countText}>
          {count}
        </ThemedText>
      </View>
    </Pressable>
  );
}

interface ITabSwitcherProps {
  open: boolean;
  tabs: ITab[];
  activeId: number | null;
  onClose: () => void;
  onSelect: (id: number) => void;
  onCloseTab: (id: number) => void;
  /** Accueil du navigateur : pour ouvrir un autre site dans un nouvel onglet. */
  onNewTab: () => void;
}

/** Liste des onglets ouverts : en choisir un, en fermer, ou aller à l'accueil pour en ouvrir un nouveau. */
export function TabSwitcher({ open, tabs, activeId, onClose, onSelect, onCloseTab, onNewTab }: Readonly<ITabSwitcherProps>) {
  const full = tabs.length >= MAX_TABS;
  return (
    <BottomSheet open={open} onClose={onClose} title={`Onglets (${tabs.length})`}>
      <View style={styles.list}>
        {tabs.map((tab) => {
          const host = hostOf(tab.url) ?? tab.url;
          const selected = tab.id === activeId;
          return (
            <View key={tab.id} style={[styles.row, selected && styles.rowSelected]}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Onglet ${tab.title || host}`}
                onPress={() => onSelect(tab.id)}
                style={styles.rowMain}
              >
                <Ionicons name="globe-outline" size={22} color={selected ? Colors.primary : Colors.textSecondary} />
                <View style={styles.rowText}>
                  <ThemedText type="smallBold" numberOfLines={1}>
                    {tab.title || host}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {host}
                  </ThemedText>
                </View>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Fermer l’onglet" onPress={() => onCloseTab(tab.id)} style={styles.close}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </Pressable>
            </View>
          );
        })}
        <Pressable accessibilityRole="button" onPress={onNewTab} style={styles.newTab}>
          <Ionicons name="add" size={22} color={Colors.primary} />
          <ThemedText type="smallBold" themeColor="primary">
            Nouvel onglet
          </ThemedText>
        </Pressable>
        {full ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
            {MAX_TABS} onglets au maximum : un nouveau remplace le plus ancien.
          </ThemedText>
        ) : null}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  countButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  countBox: {
    minWidth: 26,
    height: 26,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
    borderWidth: 2,
    borderColor: Colors.text,
  },
  countText: { fontSize: 13, lineHeight: 16 },
  list: { gap: Spacing.one, paddingBottom: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.medium, borderWidth: 1, borderColor: 'transparent' },
  rowSelected: { borderColor: Colors.primary, backgroundColor: Colors.backgroundElement },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 56, paddingHorizontal: Spacing.three },
  rowText: { flex: 1 },
  close: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  newTab: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 48, paddingHorizontal: Spacing.three },
  note: { paddingHorizontal: Spacing.three },
});
