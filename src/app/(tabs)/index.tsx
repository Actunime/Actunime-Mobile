import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { Chip } from '@/components/chip';
import { MediaRail } from '@/components/media-rail';
import { Screen } from '@/components/screen';
import { ErrorState } from '@/components/states';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { mediaId, type IListEntry, type IMedia } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { progressLabel } from '@/lib/media';
import { useMyList, useSeasonAnimes, useTrending } from '@/lib/queries';

function Section({ title, right, children }: Readonly<{ title: string; right?: React.ReactNode; children: React.ReactNode }>) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText type="subtitle">{title}</ThemedText>
        {right}
      </View>
      {children}
    </View>
  );
}

/** Œuvres de mes entrées en cours, avec la progression en légende. */
function useInProgress(entries: IListEntry[] | undefined) {
  return useMemo(() => {
    const medias: IMedia[] = [];
    const captions = new Map<string, string>();
    for (const entry of entries ?? []) {
      if (!entry.media) continue;
      const id = mediaId(entry.media);
      medias.push(entry.media);
      const label = progressLabel(entry, entry.media);
      if (label) captions.set(id, label);
    }
    return { medias, caption: (media: IMedia) => captions.get(mediaId(media)) ?? null };
  }, [entries]);
}

export default function HomeScreen() {
  const { auth } = useAuth();
  const client = useQueryClient();
  const [trendingType, setTrendingType] = useState<'Anime' | 'Manga'>('Anime');
  const [refreshing, setRefreshing] = useState(false);

  const watching = useMyList('Anime', 'WATCHING');
  const reading = useMyList('Manga', 'READING');
  const trending = useTrending(trendingType);
  const season = useSeasonAnimes();

  const watchingItems = useInProgress(watching.data?.pages[0]?.results);
  const readingItems = useInProgress(reading.data?.pages[0]?.results);

  const refresh = async () => {
    setRefreshing(true);
    await client.invalidateQueries();
    setRefreshing(false);
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} />}
      >
        <View style={styles.hello}>
          <Image source={require('../../../assets/images/logo.png')} style={styles.logo} contentFit="contain" />
          <View>
            <ThemedText themeColor="textSecondary" type="small">
              Bonjour
            </ThemedText>
            <ThemedText type="subtitle">{auth?.user.displayName ?? auth?.user.username}</ThemedText>
          </View>
        </View>

        {watchingItems.medias.length > 0 && (
          <Section title="À regarder">
            <MediaRail kind="anime" items={watchingItems.medias} caption={watchingItems.caption} />
          </Section>
        )}
        {readingItems.medias.length > 0 && (
          <Section title="À lire">
            <MediaRail kind="manga" items={readingItems.medias} caption={readingItems.caption} />
          </Section>
        )}

        <Section
          title="Tendances"
          right={
            <View style={styles.chips}>
              <Chip label="Animes" active={trendingType === 'Anime'} tint={Colors.anime} onPress={() => setTrendingType('Anime')} />
              <Chip label="Mangas" active={trendingType === 'Manga'} tint={Colors.manga} onPress={() => setTrendingType('Manga')} />
            </View>
          }
        >
          {trending.isPending ? (
            <ActivityIndicator color={Colors.primary} />
          ) : trending.isError ? (
            <ErrorState error={trending.error} onRetry={() => trending.refetch()} />
          ) : (
            <MediaRail kind={trendingType === 'Manga' ? 'manga' : 'anime'} items={trending.data} />
          )}
        </Section>

        <Section title="Cette saison">
          {season.isPending ? (
            <ActivityIndicator color={Colors.primary} />
          ) : season.isError ? (
            <ErrorState error={season.error} onRetry={() => season.refetch()} />
          ) : (
            <MediaRail kind="anime" items={season.data} />
          )}
        </Section>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: Spacing.three, gap: Spacing.four },
  hello: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three },
  logo: { width: 36, height: 38 },
  section: { gap: Spacing.three },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
  },
  chips: { flexDirection: 'row', gap: Spacing.two },
});
