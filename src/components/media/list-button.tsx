import { Pencil, Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/tw';
import { Tw } from '@/constants/theme';
import type { IListEntry, ListStatus } from '@/lib/api';
import { STATUS_LABELS } from '@/lib/list-form';

/** Point de couleur du bouton quand l'œuvre est dans ma liste (`LIST_STATUS_TRIGGER` de `MediaActionBar`). */
const DOT: Record<ListStatus, string> = {
  WATCHING: Tw.color.primary,
  READING: Tw.color.primary,
  COMPLETED: Tw.color.success,
  ON_HOLD: Tw.color.warning,
  DROPPED: Tw.color.destructive,
  PLAN_TO_WATCH: Tw.color.primary,
  PLAN_TO_READ: Tw.color.primary,
};

/**
 * Bouton « Ajouter à ma liste » / « Terminé ✎ » de la barre d'actions de la fiche : pleine largeur sur téléphone,
 * ouvre le tiroir de gestion de l'entrée.
 */
export function ListEntrySheetTrigger({ entry, loading, onPress }: Readonly<{ entry: IListEntry | null; loading?: boolean; onPress: () => void }>) {
  const label = entry ? STATUS_LABELS[entry.status] : 'Ajouter à ma liste';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={entry ? `Modifier : ${label}` : label}
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [styles.button, (pressed || loading) && { opacity: 0.8 }]}
    >
      {entry ? <View style={[styles.dot, { backgroundColor: DOT[entry.status] }]} /> : <Plus size={16} color={Tw.color.primaryForeground} />}
      <Txt size="sm" weight="medium" color={Tw.color.primaryForeground} numberOfLines={1} style={styles.label}>
        {label}
      </Txt>
      {entry ? <Pencil size={14} color={Tw.color.primaryForeground} style={{ opacity: 0.7 }} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, paddingHorizontal: 12, borderRadius: Tw.radius.lg, backgroundColor: Tw.color.primary },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { flex: 1 },
});
