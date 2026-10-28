import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TextInput, View } from 'react-native';

import { Chip } from '@/components/chip';
import { MediaRow } from '@/components/media-row';
import { Screen } from '@/components/screen';
import { EmptyState, ErrorState, Loading } from '@/components/states';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useDebounced } from '@/hooks/use-debounced';
import { mediaId, type MediaKind } from '@/lib/api';
import { useSearch } from '@/lib/queries';

export default function SearchScreen() {
  const [kind, setKind] = useState<MediaKind>('anime');
  const [text, setText] = useState('');
  const term = useDebounced(text.trim());
  const search = useSearch(kind, term);
  const items = useMemo(() => search.data?.pages.flatMap((page) => page.results) ?? [], [search.data]);
  const searching = term.length >= 2;

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="title">Recherche</ThemedText>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Titre d’un anime ou d’un manga"
          placeholderTextColor={Colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          style={styles.input}
        />
        <View style={styles.chips}>
          <Chip label="Animes" active={kind === 'anime'} tint={Colors.anime} onPress={() => setKind('anime')} />
          <Chip label="Mangas" active={kind === 'manga'} tint={Colors.manga} onPress={() => setKind('manga')} />
        </View>
      </View>

      {!searching ? (
        <EmptyState title="Que cherches-tu ?" hint="Tape au moins deux lettres du titre." />
      ) : search.isPending ? (
        <Loading />
      ) : search.isError ? (
        <ErrorState error={search.error} onRetry={() => search.refetch()} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(media) => mediaId(media)}
          renderItem={({ item }) => <MediaRow kind={kind} media={item} />}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          onEndReached={() => search.hasNextPage && !search.isFetchingNextPage && search.fetchNextPage()}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={<EmptyState title="Aucun résultat" hint="Essaie un autre titre." />}
          ListFooterComponent={search.isFetchingNextPage ? <ActivityIndicator color={Colors.primary} /> : null}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { padding: Spacing.three, gap: Spacing.three },
  chips: { flexDirection: 'row', gap: Spacing.two },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.four, gap: Spacing.two },
  input: {
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.input,
    color: Colors.text,
    fontFamily: Fonts.medium,
    fontSize: 16,
  },
});
