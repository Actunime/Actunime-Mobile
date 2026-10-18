import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';

type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: 'primary' | 'outline';
};

/** Bouton Actunime : plein bleu (`--primary`) ou contour (`--border`) comme dans la maquette. */
export function Button({ label, variant = 'primary', disabled, style, ...rest }: ButtonProps) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={(state) => [
        styles.base,
        primary ? styles.primary : styles.outline,
        disabled && styles.disabled,
        state.pressed && styles.pressed,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      <ThemedText type="smallBold" themeColor={primary ? 'primaryForeground' : 'text'}>
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
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.8 },
});
