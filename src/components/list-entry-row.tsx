import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { openMedia } from '@/components/media-row';
import { Poster } from '@/components/poster';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { mediaId, type IListEntry, type ListStatus } from '@/lib/api';
import { STATUS_LABELS, formatScore } from '@/lib/list-form';
import { kindOf, mediaTitle, totalOf } from '@/lib/media';

const STATUS_COLOR: Record<ListStatus, string> = {
  WATCHING: Colors.primary,
  READING: Colors.primary,
  PLAN_TO_WATCH: Colors.primary,
  PLAN_TO_READ: Colors.primary,
  COMPLETED: Colors.success,
  ON_HOLD: Colors.warning,
  DROPPED: Colors.destructive,
};

interface IListEntryRowProps {
  entry: IListEntry;
  /** « +1 » : un épisode ou un chapitre de plus ; absent quand l'entrée n'est pas en cours. */
  onIncrement?: () => void;
  incrementing?: boolean;
  /** Mention sous la progression (ex. « 3 épisodes de retard »). */
  note?: string;
}

/** Ligne de Ma liste du site (`ListEntryBand`) : affiche, titre, barre de progression, note, état et bouton « +1 ». */
export function ListEntryRow({ entry, onIncrement, incrementing, note }: Readonly<IListEntryRowProps>) {
  const media = entry.media;
  if (!media) return null;
  const kind = kindOf(entry.mediaType);
  const manga = kind === 'manga';
  const done = (manga ? entry.chaptersRead : entry.episodesWatched) ?? 0;
  const total = totalOf(kind, media);
  const unit = manga ? 'ch.' : 'ép.';
  const color = STATUS_COLOR[entry.status];
  const ratio = entry.status === 'COMPLETED' ? 1 : total ? Math.min(1, done / total) : done > 0 ? 0.08 : 0;
  const finished = total !== undefined && done >= total;

  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={() => openMedia(kind, mediaId(media))}>
      <Poster uri={media.posterUrl} width={64} />
      <View style={styles.body}>
        <ThemedText type="smallBold" numberOfLines={2}>
          {mediaTitle(media)}
        </ThemedText>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(ratio * 100)}%`, backgroundColor: color }]} />
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {entry.status === 'COMPLETED' ? 'Terminé' : `${done}${total ? ` / ${total}` : ''} ${unit}`}
        </ThemedText>
        {note ? (
          <ThemedText type="small" themeColor="warning">
            {note}
          </ThemedText>
        ) : null}
        <View style={styles.chips}>
          <View style={styles.chip}>
            <Ionicons name="star" size={12} color={entry.score ? '#fbbf24' : Colors.textSecondary} />
            <ThemedText type="small">{entry.score ? formatScore(entry.score) : '—'}</ThemedText>
          </View>
          <View style={styles.chip}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <ThemedText type="small">{STATUS_LABELS[entry.status]}</ThemedText>
          </View>
        </View>
      </View>
      {onIncrement && (entry.status === 'WATCHING' || entry.status === 'READING') && !finished ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={manga ? 'Un chapitre lu de plus' : 'Un épisode vu de plus'}
          disabled={incrementing}
          onPress={onIncrement}
          style={({ pressed }) => [styles.plus, (pressed || incrementing) && styles.pressed]}
        >
          <ThemedText type="subtitle" themeColor="primaryForeground">
            +1
          </ThemedText>
          <ThemedText themeColor="primaryForeground" style={styles.plusUnit}>
            {unit}
          </ThemedText>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
  },
  pressed: { opacity: 0.8 },
  body: { flex: 1, gap: Spacing.one },
  track: { height: 6, borderRadius: 3, backgroundColor: Colors.backgroundSelected, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  plus: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary },
  plusUnit: { fontSize: 10, lineHeight: 12, fontFamily: 'Outfit_500Medium' },
});
