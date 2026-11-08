import { StyleSheet, type PressableProps } from 'react-native';

import { Pressable } from '@/components/tap';
import { usePalette } from '@/components/theme-context';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';

type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: 'primary' | 'outline';
};

/** Bouton Actunime : plein bleu (`--primary`) ou contour (`--border`) comme dans la maquette. */
export function Button({ label, variant = 'primary', disabled, style, ...rest }: ButtonProps) {
  const primary = variant === 'primary';
  const palette = usePalette();
  const themed = palette.isDefault ? null : { backgroundColor: primary ? palette.primary : palette.input };
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={(state) => [
        styles.base,
        primary ? styles.primary : styles.outline,
        themed,
        disabled && styles.disabled,
        state.pressed && styles.pressed,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      <ThemedText type="smallBold" themeColor={primary ? 'primaryForeground' : 'text'} style={styles.label}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: Colors.primary },
  outline: { backgroundColor: Colors.backgroundElement, borderWidth: 1, borderColor: Colors.border },
  /** Sans `flexShrink`, Android mesurait parfois le libellé trop étroit (« Se » pour « Se déconnecter »). */
  label: { flexShrink: 1, textAlign: 'center' },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.8 },
});
