import * as Haptics from 'expo-haptics';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { ChevronDown, Play, Star } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/tw';
import { Tw, alpha } from '@/constants/theme';
import type { IListEntry, MediaKind } from '@/lib/api';
import { bandState, bumpProgress } from '@/lib/list-filter';
import { LIST_STATUS_BAR, LIST_STATUS_META } from '@/lib/list-status';
import type { IEntryPatch } from '@/lib/queries';

interface IListEntryBandProps {
  entry: IListEntry;
  kind: MediaKind;
  /** Nombre total d'épisodes / chapitres, s'il est connu. */
  total?: number;
  /** Épisodes déjà sortis, pour « 2 disponibles ». */
  available?: number;
  onChange?: (patch: IEntryPatch) => void;
  /** Ouvre le tiroir de gestion : sur ma liste, les puces sont de simples indicateurs (la carte l'ouvre). */
  onEdit?: () => void;
  /** Puces note et statut qui ouvrent le tiroir (cartes de recherche). */
  interactiveChips?: boolean;
}

/**
 * Bande de gestion d'une entrée (`ListEntryBand` du site, téléphone) : barre de progression, « Ép. 3 / 12 »,
 * « N disponibles », note (une fois terminé) et statut, puis l'action du moment : « +1 Ép. N », « Reprendre »
 * ou « Lancer ».
 */
export function ListEntryBand({ entry, kind, total, available, onChange, onEdit, interactiveChips }: Readonly<IListEntryBandProps>) {
  const state = bandState(entry, kind, total, available);
  const unit = kind === 'anime' ? 'Ép.' : 'Chap.';
  const meta = LIST_STATUS_META[entry.status];
  const StatusIcon = meta.icon;
  const activeStatus = kind === 'anime' ? 'WATCHING' : 'READING';
  const tone =
    state.availableTone === 'warning' ? Tw.color.warning : state.availableTone === 'success' ? Tw.color.success : Tw.color.mutedForeground;

  const bump = () => {
    const patch = bumpProgress(state.progress, 1, total);
    if (!patch) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    onChange?.(patch);
  };

  const Chip = interactiveChips && onEdit ? Pressable : View;
  const chipProps = interactiveChips && onEdit ? { onPress: onEdit, accessibilityRole: 'button' as const } : {};

  return (
    <View style={styles.band}>
      <View style={styles.main}>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${state.pct}%`, backgroundColor: LIST_STATUS_BAR[entry.status] }]} />
          {state.openEnded && !state.isDone ? (
            // Fin de barre estompée : la série n'a pas de total, elle continue.
            <Svg style={styles.fade} preserveAspectRatio="none" viewBox="0 0 10 1">
              <Defs>
                <LinearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor={Tw.color.card} stopOpacity={0} />
                  <Stop offset="1" stopColor={Tw.color.card} stopOpacity={1} />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="10" height="1" fill="url(#fade)" />
            </Svg>
          ) : null}
        </View>
        <View style={styles.progressRow}>
          {state.isDone ? (
            <Txt size="xs" weight="semibold">
              Terminé
            </Txt>
          ) : (
            <Txt size="xs" tabular color={Tw.color.mutedForeground}>
              <Txt size="xs" weight="semibold" tabular>
                {unit} {state.progress}
              </Txt>
              {total ? ` / ${total}` : ''}
            </Txt>
          )}
          {state.availableLabel ? (
            <Txt size="xs" weight={state.availableTone === 'muted' ? 'normal' : 'semibold'} tabular color={tone}>
              {state.availableLabel}
            </Txt>
          ) : null}
        </View>
        <View style={styles.chips}>
          {/* On ne note une œuvre qu'une fois terminée ; sur téléphone, pas de puce vide. */}
          {state.isDone && (entry.score || interactiveChips) ? (
            <Chip {...chipProps} accessibilityLabel={entry.score ? `Ma note : ${entry.score} sur 10` : 'Aucune note'} style={styles.chip}>
              <Star size={14} color={entry.score ? Tw.color.amber400 : Tw.color.mutedForeground} fill={entry.score ? Tw.color.amber400 : 'transparent'} />
              <Txt size="xs" weight="medium" tabular>
                {entry.score ?? '–'}
              </Txt>
            </Chip>
          ) : null}
          <Chip {...chipProps} accessibilityLabel={`Statut : ${meta.short}`} style={styles.chip}>
            <StatusIcon size={14} color={meta.color} />
            <Txt size="xs" weight="medium" color={meta.color}>
              {meta.short}
            </Txt>
            {interactiveChips && onEdit ? <ChevronDown size={12} color={Tw.color.mutedForeground} /> : null}
          </Chip>
        </View>
      </View>
      {onChange && state.isActive ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Marquer ${kind === 'anime' ? "l'épisode" : 'le chapitre'} ${state.progress + 1} comme ${kind === 'anime' ? 'vu' : 'lu'}`}
          onPress={bump}
          style={({ pressed }) => [styles.plus, pressed && { transform: [{ scale: 0.95 }] }]}
        >
          <Txt size="lg" weight="bold" color={Tw.color.primaryForeground} leading={1}>
            +1
          </Txt>
          <Txt size="10" weight="medium" color={Tw.color.primaryForeground} style={styles.plusUnit}>
            {unit} {state.progress + 1}
          </Txt>
        </Pressable>
      ) : null}
      {onChange && (entry.status === 'ON_HOLD' || entry.status === 'PLAN_TO_WATCH' || entry.status === 'PLAN_TO_READ') ? (
        <Pressable accessibilityRole="button" onPress={() => onChange({ status: activeStatus })} style={styles.resume}>
          <Play size={14} color={Tw.color.primary} />
          <Txt size="sm" weight="medium" color={Tw.color.primary}>
            {entry.status === 'ON_HOLD' ? 'Reprendre' : 'Lancer'}
          </Txt>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  band: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, paddingTop: 4 },
  main: { flex: 1, minWidth: 0, gap: 6 },
  track: { height: 6, borderRadius: 3, backgroundColor: Tw.color.muted, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  fade: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '15%' },
  progressRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8, rowGap: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: Tw.color.muted },
  plus: { width: 52, height: 52, borderRadius: Tw.radius['2xl'], backgroundColor: Tw.color.primaryFill, alignItems: 'center', justifyContent: 'center' },
  plusUnit: { marginTop: 2, opacity: 0.9 },
  resume: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: 10,
    borderRadius: Tw.radius.lg,
    borderWidth: 1,
    borderColor: Tw.color.input,
    backgroundColor: alpha(Tw.color.input, 0.3),
  },
});
