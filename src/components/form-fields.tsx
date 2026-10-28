import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Chip } from '@/components/chip';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { clampScore, formatFrenchDate, formatScore, parseFrenchDate } from '@/lib/list-form';

export function Field({ label, hint, children }: Readonly<{ label: string; hint?: string; children: React.ReactNode }>) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldHeader}>
        <ThemedText type="smallBold">{label}</ThemedText>
        {hint ? (
          <ThemedText type="small" themeColor="textSecondary">
            {hint}
          </ThemedText>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function StepButton({ label, onPress, disabled }: Readonly<{ label: string; onPress: () => void; disabled?: boolean }>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => [styles.step, disabled && styles.disabled, pressed && styles.pressed]}
    >
      <ThemedText type="subtitle">{label}</ThemedText>
    </Pressable>
  );
}

interface INumberFieldProps {
  value?: number;
  onChange: (value: number | undefined) => void;
  /** Raccourcis (« Tous (12) »). */
  shortcuts?: { label: string; value: number }[];
}

/** Entier positif : −, saisie, +, et raccourcis. */
export function NumberField({ value, onChange, shortcuts }: Readonly<INumberFieldProps>) {
  return (
    <View style={styles.stack}>
      <View style={styles.stepper}>
        <StepButton label="−" onPress={() => onChange(Math.max(0, (value ?? 0) - 1))} disabled={(value ?? 0) <= 0} />
        <TextInput
          value={value === undefined ? '' : String(value)}
          onChangeText={(text) => {
            const digits = text.replace(/\D/g, '');
            onChange(digits ? Number(digits) : undefined);
          }}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={Colors.textSecondary}
          style={[styles.input, styles.numberInput]}
        />
        <StepButton label="+" onPress={() => onChange((value ?? 0) + 1)} />
      </View>
      {shortcuts?.length ? (
        <View style={styles.row}>
          {shortcuts.map((shortcut) => (
            <Chip key={shortcut.label} label={shortcut.label} onPress={() => onChange(shortcut.value)} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Note de 0 à 10 : pastilles 1 à 10, réglage fin au demi-point, effacement. */
export function ScoreField({ value, onChange }: Readonly<{ value?: number; onChange: (value: number | undefined) => void }>) {
  return (
    <View style={styles.stack}>
      <View style={styles.stepper}>
        <StepButton label="−" onPress={() => onChange(clampScore((value ?? 0) - 0.5))} disabled={value === undefined || value <= 0} />
        <View style={styles.scoreValue}>
          <ThemedText type="subtitle">{value === undefined ? 'Pas de note' : `${formatScore(value)} / 10`}</ThemedText>
        </View>
        <StepButton label="+" onPress={() => onChange(clampScore((value ?? 0) + 0.5))} disabled={value !== undefined && value >= 10} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <Chip key={n} label={String(n)} active={value === n} onPress={() => onChange(value === n ? undefined : n)} />
        ))}
      </ScrollView>
      {value !== undefined ? <Chip label="Effacer la note" onPress={() => onChange(undefined)} /> : null}
    </View>
  );
}

interface IDateFieldProps {
  value: string | null;
  /** `valid` est faux tant que le texte n'est pas une date JJ/MM/AAAA (ou vide). */
  onChange: (value: string | null, valid: boolean) => void;
}

export function DateField({ value, onChange }: Readonly<IDateFieldProps>) {
  const [text, setText] = useState(formatFrenchDate(value));
  const [invalid, setInvalid] = useState(false);

  // Une date posée par le formulaire (changement de statut) remplace le texte, sans écraser une saisie en cours.
  useEffect(() => {
    if (parseFrenchDate(text) === undefined) return;
    if (formatFrenchDate(value) !== text.trim()) setText(formatFrenchDate(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <TextInput
      value={text}
      onChangeText={(next) => {
        setText(next);
        const parsed = parseFrenchDate(next);
        setInvalid(parsed === undefined);
        onChange(parsed ?? null, parsed !== undefined);
      }}
      placeholder="JJ/MM/AAAA"
      placeholderTextColor={Colors.textSecondary}
      keyboardType="numbers-and-punctuation"
      maxLength={10}
      style={[styles.input, invalid && styles.invalid]}
    />
  );
}


const styles = StyleSheet.create({
  field: { gap: Spacing.two },
  fieldHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  stack: { gap: Spacing.two },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  step: {
    width: 48,
    height: 48,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: { flex: 1, alignItems: 'center' },
  input: {
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Colors.input,
    color: Colors.text,
    fontFamily: Fonts.medium,
    fontSize: 16,
  },
  numberInput: { flex: 1, textAlign: 'center' },
  invalid: { borderColor: Colors.destructive },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.8 },
});
