import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Poster } from '@/components/poster';
import { Screen } from '@/components/screen';
import { ErrorState, Loading } from '@/components/states';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { IMedia, MediaKind } from '@/lib/api';
import { MEDIA_STATUS_LABELS, STATUS_LABELS, formatScore } from '@/lib/list-form';
import { formatLabel, formatYear, mediaTitle, mediaTypeOf, progressLabel } from '@/lib/media';
import { useEntryForMedia, useGenres, useMedia } from '@/lib/queries';

function Fact({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <View style={styles.fact}>
      <ThemedText type="smallBold">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

function facts(kind: MediaKind, media: IMedia): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  if (kind === 'anime') {
    const total = media.episodesInfo?.total;
    out.push({ label: 'épisodes', value: total ? String(total) : '?' });
    if (media.episodesInfo?.durationMinutes) out.push({ label: 'par épisode', value: `${media.episodesInfo.durationMinutes} min` });
  } else {
    const chapters = media.chaptersInfo?.total;
    out.push({ label: 'chapitres', value: chapters ? String(chapters) : '?' });
    if (media.volumesInfo?.total) out.push({ label: 'volumes', value: String(media.volumesInfo.total) });
  }
  const score = media.communityScore;
  if (score?.average !== undefined) out.push({ label: `${score.count} notes`, value: `${formatScore(score.average)} / 10` });
  return out;
}

/** Ouvre le navigateur de lecture sur une adresse (la même page de lecture peut être rouverte : `t` change). */
const openInBrowser = (url: string) => router.push({ pathname: '/browser', params: { url, t: String(Date.now()) } });

export default function MediaScreen() {
  const { kind, id } = useLocalSearchParams<{ kind: MediaKind; id: string }>();
  const media = useMedia(kind, id);
  const entry = useEntryForMedia(id);
  const genres = useGenres(media.data?.genres);
  const [expanded, setExpanded] = useState(false);

  const back = (
    <Pressable accessibilityRole="button" accessibilityLabel="Retour" hitSlop={10} onPress={() => router.back()} style={styles.back}>
      <Ionicons name="chevron-back" size={24} color={Colors.text} />
    </Pressable>
  );

  if (media.isPending) {
    return (
      <Screen>
        {back}
        <Loading />
      </Screen>
    );
  }
  if (media.isError) {
    return (
      <Screen>
        {back}
        <ErrorState error={media.error} onRetry={() => media.refetch()} />
      </Screen>
    );
  }

  const data = media.data;
  const mediaType = mediaTypeOf(kind);
  const inList = entry.data ?? null;
  const links = (data.links ?? []).filter((link) => /^https?:\/\//.test(link.url));

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.backRow}>{back}</View>
        {data.bannerUrl ? <Image source={{ uri: data.bannerUrl }} style={styles.banner} contentFit="cover" /> : null}

        <View style={styles.hero}>
          <Poster uri={data.posterUrl} width={144} />
          <ThemedText type="subtitle">{mediaTitle(data)}</ThemedText>
          <View style={styles.badges}>
            {[data.status ? MEDIA_STATUS_LABELS[data.status] : null, formatLabel(data.format), formatYear(data)]
              .filter((label): label is string => Boolean(label))
              .map((label) => (
                <View key={label} style={styles.badge}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {label}
                  </ThemedText>
                </View>
              ))}
            {genres.data?.map((genre) => (
              <View key={genre.id} style={[styles.badge, styles.genre]}>
                <ThemedText type="small" themeColor="primary">
                  {genre.name}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.facts}>
          {facts(kind, data).map((fact) => (
            <Fact key={fact.label} {...fact} />
          ))}
        </View>

        <View style={styles.block}>
          {inList ? (
            <View style={styles.inList}>
              <View style={styles.flex}>
                <ThemedText type="smallBold" themeColor="success">
                  Dans ma liste
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {[STATUS_LABELS[inList.status], progressLabel(inList, data), inList.score ? `${formatScore(inList.score)}/10` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </ThemedText>
              </View>
              <Button label="Modifier" variant="outline" onPress={() => router.push({ pathname: '/edit/[kind]/[id]', params: { kind, id } })} />
            </View>
          ) : (
            <Button
              label="Ajouter à ma liste"
              disabled={entry.isPending}
              onPress={() => router.push({ pathname: '/edit/[kind]/[id]', params: { kind, id } })}
            />
          )}
          {entry.isError ? (
            <ThemedText type="small" themeColor="destructive">
              Impossible de lire ton entrée : {entry.error.message}
            </ThemedText>
          ) : null}
        </View>

        {data.synopsis ? (
          <View style={styles.block}>
            <ThemedText type="subtitle">Synopsis</ThemedText>
            <ThemedText themeColor="textSecondary" numberOfLines={expanded ? undefined : 6}>
              {data.synopsis}
            </ThemedText>
            <Pressable onPress={() => setExpanded((value) => !value)}>
              <ThemedText type="link">{expanded ? 'Réduire' : 'Lire la suite'}</ThemedText>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.block}>
          <ThemedText type="subtitle">{mediaType === 'Anime' ? 'Regarder' : 'Lire'}</ThemedText>
          {links.slice(0, 6).map((link) => (
            <Button key={link.url} label={link.name ?? link.url} variant="outline" onPress={() => openInBrowser(link.url)} />
          ))}
          <Button label="Ouvrir le navigateur de lecture" variant="outline" onPress={() => router.navigate('/reading')} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: Spacing.six, gap: Spacing.four },
  flex: { flex: 1 },
  banner: { width: '100%', height: 140, opacity: 0.55 },
  backRow: { paddingHorizontal: Spacing.two },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundElement,
    margin: Spacing.one,
  },
  hero: { gap: Spacing.three, paddingHorizontal: Spacing.three },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.four, paddingHorizontal: Spacing.three },
  fact: { gap: Spacing.half },
  block: { gap: Spacing.three, paddingHorizontal: Spacing.three },
  inList: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.large,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
  },
  badge: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.large,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  genre: { borderColor: Colors.primary, backgroundColor: 'rgba(0, 153, 255, 0.1)' },
});
