import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Sheen } from '@/components/ui/sheen';
import { Pressable } from '@/components/tap';
import { Poster } from '@/components/poster';
import { ThemedText } from '@/components/themed-text';
import { Colors, Floating, Radius, Spacing } from '@/constants/theme';
import { mediaId, type IMedia, type MediaKind } from '@/lib/api';
import { formatLabel, formatLongDate, mediaTitle, statusTone } from '@/lib/media';
import { MEDIA_STATUS_LABELS } from '@/lib/list-form';

const TONES = {
  success: { color: Colors.success, background: 'rgba(65, 168, 103, 0.15)' },
  warning: { color: Colors.warning, background: 'rgba(211, 144, 69, 0.15)' },
  destructive: { color: Colors.destructive, background: 'rgba(255, 100, 103, 0.15)' },
  neutral: { color: Colors.text, background: 'rgba(255, 255, 255, 0.06)' },
} as const;

export function openMedia(kind: MediaKind, id: string) {
  router.push({ pathname: '/media/[kind]/[id]', params: { kind, id } });
}

interface IMediaRowProps {
  kind: MediaKind;
  media: IMedia;
  /** Ligne secondaire sous le titre (par défaut : année et statut de l'œuvre). */
  subtitle?: string | null;
  right?: React.ReactNode;
}

/** Ligne de résultat : affiche, titre et un résumé ; appui = fiche de l'œuvre. */
export function MediaRow({ kind, media, subtitle, right }: Readonly<IMediaRowProps>) {
  const tone = TONES[statusTone(media.status)];
  const format = formatLabel(media.format);
  const date = formatLongDate(media.date?.start);
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={() => openMedia(kind, mediaId(media))}>
      <Sheen />
      <Poster uri={media.posterUrl} width={72} />
      <View style={styles.body}>
        <ThemedText type="smallBold" numberOfLines={2}>
          {mediaTitle(media)}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {subtitle}
          </ThemedText>
        ) : null}
        {subtitle === undefined ? (
          <View style={styles.pills}>
            {media.status ? (
              <View style={[styles.pill, { backgroundColor: tone.background }]}>
                <ThemedText type="small" style={{ color: tone.color }}>
                  {MEDIA_STATUS_LABELS[media.status] ?? media.status}
                </ThemedText>
              </View>
            ) : null}
            {format ? (
              <View style={[styles.pill, { backgroundColor: 'rgba(255, 255, 255, 0.06)' }]}>
                <ThemedText type="small">{format}</ThemedText>
              </View>
            ) : null}
            {date ? (
              <ThemedText type="small" themeColor="textSecondary">
                {date}
              </ThemedText>
            ) : null}
          </View>
        ) : null}
      </View>
      {right}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two,
    ...Floating,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.8 },
  body: { flex: 1, gap: Spacing.one },
  pills: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.two },
  pill: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: Radius.large },
});
