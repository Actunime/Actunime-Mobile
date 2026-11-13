import { router, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Pressable } from '@/components/tap';
import { Txt } from '@/components/tw';
import { Tw, alpha } from '@/constants/theme';
import { SEARCH_TYPES, searchHref, type SearchType } from '@/lib/search-types';
import { LogoIcon } from './logo-icon';

/** Tiroir ouvert par « Recherche » dans la barre du bas : on choisit ce qu'on cherche, la page dédiée s'ouvre. */
export function SearchTypeSheet({ open, current, onClose }: Readonly<{ open: boolean; current: SearchType | null; onClose: () => void }>) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Que cherches-tu ?">
      <View style={styles.list}>
        {SEARCH_TYPES.map((type) => {
          const active = type.value === current;
          return (
            <Pressable
              key={type.value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => {
                onClose();
                router.navigate(searchHref(type.value) as Href);
              }}
              style={[styles.row, active && styles.rowOn]}
            >
              <LogoIcon name={type.icon} size={24} />
              <View style={styles.text}>
                <Txt size="base" weight="semibold">
                  {type.label}
                </Txt>
                <Txt size="xs" color={Tw.color.mutedForeground}>
                  {type.hint}
                </Txt>
              </View>
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  list: { gap: 6, paddingBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56, paddingHorizontal: 12, borderRadius: Tw.radius.lg, borderWidth: 1, borderColor: Tw.color.border },
  rowOn: { borderColor: Tw.color.primary, backgroundColor: alpha(Tw.color.primary, 0.12) },
  text: { flex: 1, gap: 1 },
});
