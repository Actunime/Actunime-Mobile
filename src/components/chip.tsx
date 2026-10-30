import { StyleSheet } from 'react-native';

import { Pressable } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';

interface IChipProps {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  /** Teinte de l'état actif (par défaut le bleu principal). */
  tint?: string;
}

/** Pastille de choix (filtre, statut, visibilité). */
export function Chip({ label, active, disabled, onPress, tint = Colors.primary }: Readonly<IChipProps>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.chip, active && { borderColor: tint, backgroundColor: Colors.backgroundSelected }, disabled && styles.disabled]}
    >
      <ThemedText type="small" style={active ? { color: tint } : { color: Colors.textSecondary }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 40,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.large,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
});
