import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Poster } from '@/components/poster';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { mediaId, type IMedia, type MediaKind } from '@/lib/api';
import { formatYear, mediaTitle } from '@/lib/media';
import { MEDIA_STATUS_LABELS } from '@/lib/list-form';

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
  const meta =
    subtitle === undefined
      ? [formatYear(media), media.status ? MEDIA_STATUS_LABELS[media.status] : null].filter(Boolean).join(' · ')
      : subtitle;
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={() => openMedia(kind, mediaId(media))}>
      <Poster uri={media.posterUrl} width={56} />
      <View style={styles.body}>
        <ThemedText type="smallBold" numberOfLines={2}>
          {mediaTitle(media)}
        </ThemedText>
        {meta ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {meta}
          </ThemedText>
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
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
  },
  pressed: { opacity: 0.8 },
  body: { flex: 1, gap: Spacing.half },
});
