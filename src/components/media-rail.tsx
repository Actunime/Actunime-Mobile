import { FlatList, StyleSheet, View } from 'react-native';

import { Pressable } from '@/components/tap';
import { openMedia } from '@/components/media-row';
import { Poster } from '@/components/poster';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { mediaId, type IMedia, type MediaKind } from '@/lib/api';
import { mediaTitle } from '@/lib/media';

const WIDTH = 112;

interface IMediaRailProps {
  kind: MediaKind;
  items: IMedia[];
  /** Ligne sous le titre, par œuvre (ex. progression). */
  caption?: (media: IMedia) => string | null;
}

/** Rangée horizontale d'affiches pour l'accueil. */
export function MediaRail({ kind, items, caption }: Readonly<IMediaRailProps>) {
  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={items}
      keyExtractor={(media) => mediaId(media)}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => {
        const text = caption?.(item);
        return (
          <Pressable style={styles.item} onPress={() => openMedia(kind, mediaId(item))}>
            <Poster uri={item.posterUrl} width={WIDTH} />
            <View style={styles.texts}>
              <ThemedText type="small" numberOfLines={2}>
                {mediaTitle(item)}
              </ThemedText>
              {text ? (
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {text}
                </ThemedText>
              ) : null}
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.three, paddingHorizontal: Spacing.three },
  item: { width: WIDTH, gap: Spacing.two },
  texts: { gap: Spacing.half },
});
