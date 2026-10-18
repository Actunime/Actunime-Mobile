import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';

/** Champs que l'utilisateur montre sur la page : une couleur chacun, la même sur la page et dans l'assistant. */
export type PickField = 'title' | 'number';

export function fieldStyle(field: PickField, kind: 'anime' | 'manga') {
  return field === 'title'
    ? { color: Colors.primary, label: 'TITRE', sentence: 'le titre de l’œuvre', example: 'Solo Leveling' }
    : {
        color: Colors.manga,
        label: kind === 'manga' ? 'CHAPITRE' : 'ÉPISODE',
        sentence: kind === 'manga' ? 'le numéro du chapitre' : 'le numéro de l’épisode',
        example: kind === 'manga' ? 'Chapitre 45' : 'Épisode 5',
      };
}

interface IStepperProps {
  labels: string[];
  current: number;
}

/** Étapes numérotées en haut de l'assistant : où j'en suis, combien il en reste. */
export function Stepper({ labels, current }: IStepperProps) {
  return (
    <View style={styles.stepper}>
      {labels.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <View key={label} style={styles.step}>
            <View style={[styles.dot, (done || active) && styles.dotOn, active && styles.dotActive]}>
              {done ? (
                <Ionicons name="checkmark" size={16} color={Colors.primaryForeground} />
              ) : (
                <ThemedText type="smallBold" themeColor={active ? 'primaryForeground' : 'textSecondary'}>
                  {index + 1}
                </ThemedText>
              )}
            </View>
            <ThemedText type="small" themeColor={active ? 'text' : 'textSecondary'} numberOfLines={1}>
              {label}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

interface IFieldChipProps {
  field: PickField;
  kind: 'anime' | 'manga';
  value?: string;
}

/** Pastille colorée « TITRE » ou « CHAPITRE », suivie de la valeur choisie. */
export function FieldChip({ field, kind, value }: IFieldChipProps) {
  const style = fieldStyle(field, kind);
  return (
    <View style={styles.chipRow}>
      <View style={[styles.tag, { backgroundColor: style.color }]}>
        <ThemedText type="smallBold" style={styles.tagText}>
          {style.label}
        </ThemedText>
      </View>
      {value !== undefined && (
        <ThemedText type="smallBold" style={styles.chipValue} numberOfLines={2}>
          {value}
        </ThemedText>
      )}
    </View>
  );
}

interface IIllustrationProps {
  field: PickField;
  kind: 'anime' | 'manga';
}

/**
 * Schéma d'une page de lecture : l'élément à toucher est entouré de la couleur du champ et un doigt le montre.
 * Il dit « quoi toucher » sans avoir à lire.
 */
export function PageIllustration({ field, kind }: IIllustrationProps) {
  const target = fieldStyle(field, kind);
  const titleOn = field === 'title';
  const numberOn = field === 'number';
  return (
    <View style={styles.page}>
      <View style={styles.pageBar}>
        <View style={styles.pageDot} />
        <View style={[styles.line, { width: '40%' }]} />
      </View>
      <View style={styles.pageBody}>
        <View
          style={[
            styles.target,
            titleOn && { borderColor: target.color, backgroundColor: `${target.color}33` },
            { alignSelf: 'flex-start' },
          ]}
        >
          <ThemedText type="smallBold" themeColor={titleOn ? 'text' : 'textSecondary'}>
            Solo Leveling
          </ThemedText>
          {titleOn && <Ionicons name="hand-left" size={26} color={target.color} style={styles.finger} />}
        </View>
        <View
          style={[
            styles.target,
            numberOn && { borderColor: target.color, backgroundColor: `${target.color}33` },
            { alignSelf: 'flex-start' },
          ]}
        >
          <ThemedText type="small" themeColor={numberOn ? 'text' : 'textSecondary'}>
            {kind === 'manga' ? 'Chapitre 45' : 'Épisode 5'}
          </ThemedText>
          {numberOn && <Ionicons name="hand-left" size={26} color={target.color} style={styles.finger} />}
        </View>
        <View style={styles.image} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stepper: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  step: { flex: 1, alignItems: 'center', gap: Spacing.one },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.input,
  },
  dotOn: { backgroundColor: Colors.backgroundSelected, borderColor: Colors.primary },
  dotActive: { backgroundColor: Colors.primary },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  tag: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, borderRadius: Radius.small },
  tagText: { color: '#ffffff' },
  chipValue: { flex: 1 },
  page: {
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    overflow: 'hidden',
  },
  pageBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    backgroundColor: Colors.backgroundElement,
  },
  pageDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.input },
  line: { height: 8, borderRadius: 4, backgroundColor: Colors.input },
  pageBody: { padding: Spacing.three, gap: Spacing.two },
  target: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.small,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  finger: { position: 'absolute', right: -10, bottom: -16 },
  image: { height: 36, borderRadius: Radius.small, backgroundColor: Colors.backgroundSelected },
});
