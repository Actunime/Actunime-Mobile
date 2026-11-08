import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { Sheen } from '@/components/ui/sheen';
import { Pressable } from '@/components/tap';
import { Button } from '@/components/button';
import { EntryCard } from '@/components/cards/entry-card';
import { MediaRow } from '@/components/media-row';
import { ReceivedRecommendations } from '@/components/recommendations/received-recommendations';
import { Screen } from '@/components/screen';
import { ErrorState } from '@/components/states';
import { ThemedText } from '@/components/themed-text';
import { Colors, Floating, Radius, Spacing } from '@/constants/theme';
import { mediaId } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { useAllMyList, useMyEntries } from '@/lib/queries';
import { behindAnimes, dayLabel, headline, listBreakdown, listTotals, shortDay, timeLabel, weekSchedule } from '@/lib/suivi';

const SEGMENT_COLORS = { primary: Colors.primary, success: Colors.success, info: '#0ea5e9', muted: 'rgba(190, 213, 255, 0.4)' } as const;

function Section({ title, hint, children }: Readonly<{ title: string; hint?: string; children: React.ReactNode }>) {
  return (
    <View style={styles.section}>
      <View>
        <ThemedText type="subtitle">{title}</ThemedText>
        {hint ? (
          <ThemedText type="small" themeColor="textSecondary">
            {hint}
          </ThemedText>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function Tile({ value, label, warn }: Readonly<{ value: string | number; label: string; warn?: boolean }>) {
  return (
    <View style={styles.tile}>
      <ThemedText type="title" style={[styles.tileValue, warn ? { color: Colors.warning } : null]}>
        {value}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

/** Mon suivi : page d'ouverture du membre (retard, planning de la semaine, répartition), port de `/suivi` du site. */
export default function SuiviScreen() {
  const { auth } = useAuth();
  const client = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);

  const watching = useAllMyList('Anime', 'WATCHING');
  const planned = useAllMyList('Anime', 'PLAN_TO_WATCH');
  const reading = useAllMyList('Manga', 'READING');
  const animeList = useMyEntries('Anime');
  const mangaList = useMyEntries('Manga');
  const totals = useMemo(() => listTotals([...(animeList.data ?? []), ...(mangaList.data ?? [])]), [animeList.data, mangaList.data]);

  const animeEntries = useMemo(() => [...(watching.data ?? []), ...(planned.data ?? [])], [watching.data, planned.data]);
  const behind = useMemo(() => behindAnimes(watching.data ?? []), [watching.data]);
  const week = useMemo(() => weekSchedule(animeEntries), [animeEntries]);
  const resume = useMemo(
    () =>
      [...(watching.data ?? []), ...(reading.data ?? [])]
        .filter((entry) => ((entry.mediaType === 'Manga' ? entry.chaptersRead : entry.episodesWatched) ?? 0) > 0)
        // un anime déjà dans « À rattraper » n'est pas répété ici
        .filter((entry) => !behind.some((item) => item.entry === entry))
        .sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime())
        .slice(0, 5),
    [watching.data, reading.data, behind],
  );
  const behindTotal = behind.reduce((sum, item) => sum + item.behind, 0);
  const todayCount = week[0]?.items.length ?? 0;
  const inProgress = (watching.data?.length ?? 0) + (reading.data?.length ?? 0);
  const segments = listBreakdown(totals.byStatus);
  const segmentTotal = segments.reduce((sum, segment) => sum + segment.value, 0);

  const loading = watching.isPending || planned.isPending || reading.isPending;
  const error = watching.error ?? planned.error ?? reading.error;
  const empty = animeList.isSuccess && mangaList.isSuccess && totals.total === 0;

  const refresh = async () => {
    setRefreshing(true);
    await client.invalidateQueries();
    setRefreshing(false);
  };


  const day = week[selectedDay];

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} />}
      >
        <ThemedText type="title">Mon suivi</ThemedText>

        <ReceivedRecommendations />
        {loading ? (
          <ActivityIndicator color={Colors.primary} />
        ) : error ? (
          <ErrorState error={error} onRetry={() => void refresh()} />
        ) : empty ? (
          <View style={styles.card}>
            <Sheen />
            <ThemedText type="subtitle">Ta liste est vide</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Ajoute des animes ou des mangas pour retrouver ici ta progression, tes épisodes à rattraper et ton planning de la semaine.
            </ThemedText>
            <Button label="Explorer le catalogue" onPress={() => router.navigate('/search')} />
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Sheen />
              <View>
                <ThemedText type="small" themeColor="textSecondary">
                  {dayLabel(new Date())}
                </ThemedText>
                <ThemedText type="subtitle">{headline(todayCount, behindTotal)}</ThemedText>
              </View>
              <View style={styles.tiles}>
                <Tile value={todayCount} label="Aujourd'hui" />
                <Tile value={behindTotal} label="Ép. de retard" warn={behindTotal > 0} />
                <Tile value={inProgress} label="En cours" />
              </View>
            </View>

            {behind.length > 0 && (
              <Section title="À rattraper" hint={`${behind.length} anime${behind.length > 1 ? 's' : ''} en retard`}>
                {behind.slice(0, 5).map((item) => (
                  <EntryCard
                    key={item.entry.id}
                    kind="anime"
                    entry={item.entry}
                    note={`${item.behind} épisode${item.behind > 1 ? 's' : ''} de retard`}
                  />
                ))}
              </Section>
            )}

            {resume.length > 0 && (
              <Section title="Reprendre">
                {resume.map((entry) => (
                  <EntryCard key={entry.id} kind={entry.mediaType === 'Manga' ? 'manga' : 'anime'} entry={entry} />
                ))}
              </Section>
            )}

            <Section title="Ma semaine" hint="Les animes de ma liste qui sortent cette semaine">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
                {week.map((entry, index) => (
                  <Pressable
                    key={entry.date.toISOString()}
                    accessibilityRole="button"
                    accessibilityState={{ selected: index === selectedDay }}
                    onPress={() => setSelectedDay(index)}
                    style={[styles.day, index === selectedDay && styles.daySelected]}
                  >
                    <ThemedText type="small" themeColor={index === selectedDay ? 'primary' : 'textSecondary'}>
                      {index === 0 ? "Auj." : shortDay(entry.date)}
                    </ThemedText>
                    <ThemedText type="smallBold">{entry.date.getDate()}</ThemedText>
                    <ThemedText type="small" themeColor={entry.items.length ? 'primary' : 'textSecondary'}>
                      {entry.items.length}
                    </ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
              {day && day.items.length > 0 ? (
                day.items.map((item) => (
                  <MediaRow key={mediaId(item.media)} kind="anime" media={item.media} subtitle={`${dayLabel(day.date)} ${timeLabel(item.at)}`} />
                ))
              ) : (
                <ThemedText type="small" themeColor="textSecondary">
                  Aucune sortie ce jour-là dans ta liste.
                </ThemedText>
              )}
            </Section>

            {segments.length > 0 && (
              <Section title="Mes chiffres">
                <View style={styles.card}>
                  <Sheen />
                  <View style={styles.bar}>
                    {segments.map((segment) => (
                      <View key={segment.label} style={{ flexGrow: segment.value, backgroundColor: SEGMENT_COLORS[segment.color] }} />
                    ))}
                  </View>
                  <View style={styles.legend}>
                    {segments.map((segment) => (
                      <View key={segment.label} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: SEGMENT_COLORS[segment.color] }]} />
                        <ThemedText type="small" themeColor="textSecondary">
                          {segment.label} · {segment.value}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">
                    {segmentTotal} entrées · {totals.episodesWatched} épisodes vus · {totals.chaptersRead} chapitres lus
                  </ThemedText>
                </View>
              </Section>
            )}

            <View style={styles.card}>

              <Sheen />
              <ThemedText type="small" themeColor="textSecondary">
                Amis en ligne, activité, série et objectif de la semaine arrivent bientôt dans l’application.
              </ThemedText>
              <Button label="Bientôt disponible" variant="outline" disabled />
            </View>
          </>
        )}
        <ThemedText type="small" themeColor="textSecondary" style={styles.footer}>
          Connecté en tant que {auth?.user.displayName ?? auth?.user.username}
        </ThemedText>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.four, paddingBottom: Spacing.five },
  section: { gap: Spacing.three },
  card: { ...Floating, overflow: 'hidden', padding: Spacing.three, gap: Spacing.three },
  tiles: { flexDirection: 'row', gap: Spacing.two },
  tile: { flex: 1, padding: Spacing.two, borderRadius: Radius.medium, backgroundColor: 'rgba(255, 255, 255, 0.04)' },
  tileValue: { fontSize: 26, lineHeight: 30 },
  days: { gap: Spacing.two },
  day: { width: 56, paddingVertical: Spacing.two, alignItems: 'center', gap: 2, ...Floating, borderRadius: Radius.medium },
  daySelected: { backgroundColor: Colors.input },
  bar: { height: 12, flexDirection: 'row', gap: 2, borderRadius: 6, overflow: 'hidden', backgroundColor: Colors.background },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: Spacing.three, rowGap: Spacing.one },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  footer: { textAlign: 'center' },
});
