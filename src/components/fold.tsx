import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';

interface IFoldProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

/** Section repliable de la fiche (« Synopsis », « Général »…), comme les sections du site. */
export function Fold({ title, defaultOpen = true, children }: Readonly<IFoldProps>) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={styles.fold}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((v) => !v)} style={styles.header}>
        <ThemedText type="smallBold" style={styles.title}>
          {title}
        </ThemedText>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textSecondary} />
      </Pressable>
      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fold: { borderRadius: Radius.medium, backgroundColor: Colors.backgroundElement, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: Spacing.three, gap: Spacing.two },
  title: { flex: 1 },
  body: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three, gap: Spacing.two },
});
