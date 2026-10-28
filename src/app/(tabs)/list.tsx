import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, View } from 'react-native';

import { Chip } from '@/components/chip';
import { MediaRow } from '@/components/media-row';
import { Screen } from '@/components/screen';
import { EmptyState, ErrorState, Loading } from '@/components/states';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { type IListEntry, type ListStatus } from '@/lib/api';
import { ANIME_STATUSES, MANGA_STATUSES, STATUS_LABELS } from '@/lib/list-form';
import { kindOf, progressLabel } from '@/lib/media';
import { useMyList, usePendingEntries } from '@/lib/queries';

const statusLine = (entry: IListEntry) =>
  [STATUS_LABELS[entry.status], progressLabel(entry, entry.media), entry.score ? `${entry.score}/10` : null]
    .filter(Boolean)
    .join(' · ');

export default function MyListScreen() {
  const [mediaType, setMediaType] = useState<'Anime' | 'Manga'>('Anime');
  const [status, setStatus] = useState<ListStatus | undefined>(undefined);
  const list = useMyList(mediaType, status);
  const pending = usePendingEntries();

  const entries = useMemo(() => list.data?.pages.flatMap((page) => page.results) ?? [], [list.data]);
  // Les entrées en attente de validation n'ont pas d'œuvre : l'API les sert à part.
  const pendingEntries = useMemo(
    () =>
      (pending.data ?? []).filter(
        (entry) => entry.mediaType === mediaType && (!status || entry.status === status),
      ),
    [pending.data, mediaType, status],
  );
  const statuses = mediaType === 'Anime' ? ANIME_STATUSES : MANGA_STATUSES;
  const total = list.data?.pages[0]?.total;

  const switchType = (next: 'Anime' | 'Manga') => {
    setMediaType(next);
    setStatus(undefined);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="title">Ma liste</ThemedText>
        <View style={styles.chips}>
          <Chip label="Animes" active={mediaType === 'Anime'} tint={Colors.anime} onPress={() => switchType('Anime')} />
          <Chip label="Mangas" active={mediaType === 'Manga'} tint={Colors.manga} onPress={() => switchType('Manga')} />
        </View>
      </View>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusChips}>
          <Chip label="Tous" active={!status} onPress={() => setStatus(undefined)} />
          {statuses.map((value) => (
            <Chip key={value} label={STATUS_LABELS[value]} active={status === value} onPress={() => setStatus(value)} />
          ))}
        </ScrollView>
      </View>

      {list.isPending ? (
        <Loading />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(entry) => (entry.id ?? entry._id) as string}
          contentContainerStyle={styles.list}
          onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()}
          onEndReachedThreshold={0.5}
          renderItem={({ item }) =>
            item.media ? (
              <MediaRow kind={kindOf(item.mediaType)} media={item.media} subtitle={statusLine(item)} />
            ) : null
          }
          ListHeaderComponent={
            <>
              {total !== undefined && (
                <ThemedText type="small" themeColor="textSecondary">
                  {total} œuvre{total > 1 ? 's' : ''}
                </ThemedText>
              )}
              {pendingEntries.length > 0 && (
                <View style={styles.pending}>
                  <ThemedText type="smallBold">En attente de validation</ThemedText>
                  {pendingEntries.map((entry) => (
                    <View key={(entry.id ?? entry._id) as string} style={styles.pendingRow}>
                      <ThemedText type="small" numberOfLines={1} style={styles.pendingTitle}>
                        {entry.preview?.title ?? 'Œuvre proposée'}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {statusLine(entry)}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              )}
            </>
          }
          ListEmptyComponent={
            pendingEntries.length > 0 ? null : (
              <EmptyState
                title={status ? 'Rien dans cet état' : 'Ta liste est vide'}
                hint="Ajoute des œuvres depuis leur fiche."
              />
            )
          }
          ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={Colors.primary} /> : null}
        />
      )}
    </Screen>
  );
}


const styles = StyleSheet.create({
  header: { padding: Spacing.three, gap: Spacing.three },
  chips: { flexDirection: 'row', gap: Spacing.two },
  statusChips: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingBottom: Spacing.three },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.four, gap: Spacing.two },
  pending: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.warning,
    backgroundColor: Colors.backgroundElement,
  },
  pendingRow: { gap: Spacing.half },
  pendingTitle: { color: Colors.text },
});
