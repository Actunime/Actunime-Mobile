import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Activity, BarChart3, PlayCircle } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { SectionCard } from '@/components/media/detail-parts';
import { ErrorState, Loading } from '@/components/states';
import { Pressable } from '@/components/tap';
import { Txt } from '@/components/tw';
import { Tw } from '@/constants/theme';
import { api, type MediaKind } from '@/lib/api';
import { plainDescribe, timeAgo } from '@/lib/notifications';

interface ISectionProps {
  kind: MediaKind;
  id: string;
  onLayout?: (y: number) => void;
}

const LIST_ROWS = [
  { key: 'watching', label: 'En cours', color: '#3b82f6' },
  { key: 'completed', label: 'Terminé', color: '#10b981' },
  { key: 'onHold', label: 'En pause', color: '#f59e0b' },
  { key: 'dropped', label: 'Abandonné', color: '#ef4444' },
  { key: 'planToWatch', label: 'Prévu', color: '#8b5cf6' },
] as const;

/** Statistiques de la fiche : combien de membres l'ont, répartition par statut, note moyenne, favoris. */
export function MediaStatsSection({ kind, id, onLayout }: Readonly<ISectionProps>) {
  const stats = useQuery({ queryKey: ['media-stats', kind, id], queryFn: () => api.getMediaStats(kind, id), staleTime: 5 * 60_000 });
  const list = stats.data?.listStats;
  const total = list?.total ?? 0;
  return (
    <SectionCard title="Statistiques" icon={BarChart3} onLayout={onLayout}>
      {stats.isPending ? (
        <Loading />
      ) : stats.isError ? (
        <ErrorState error={stats.error} onRetry={() => void stats.refetch()} />
      ) : (
        <View style={styles.stack}>
          <View style={styles.counters}>
            <Counter value={String(total)} label="dans une liste" />
            <Counter value={list?.averageScore ? list.averageScore.toFixed(1).replace('.', ',') : '–'} label="note moyenne" />
            <Counter value={String(stats.data?.favoriteCount ?? list?.favoriteCount ?? 0)} label="favoris" />
          </View>
          {total > 0 ? (
            <View style={styles.stack}>
              {LIST_ROWS.map((row) => {
                const n = list?.[row.key] ?? 0;
                return (
                  <View key={row.key} style={styles.barRow}>
                    <Txt size="xs" color={Tw.color.mutedForeground} style={styles.barLabel}>
                      {row.label}
                    </Txt>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${Math.round((n / total) * 100)}%`, backgroundColor: row.color }]} />
                    </View>
                    <Txt size="xs" style={styles.barCount}>
                      {n}
                    </Txt>
                  </View>
                );
              })}
            </View>
          ) : (
            <Txt size="sm" color={Tw.color.mutedForeground}>
              Personne n’a encore cette fiche dans sa liste.
            </Txt>
          )}
        </View>
      )}
    </SectionCard>
  );
}

function Counter({ value, label }: Readonly<{ value: string; label: string }>) {
  return (
    <View style={styles.counter}>
      <Txt size="xl" weight="bold">
        {value}
      </Txt>
      <Txt size="xs" color={Tw.color.mutedForeground}>
        {label}
      </Txt>
    </View>
  );
}

/** Activités récentes autour de la fiche (ajouts à la liste, modifications, vérifications…). */
export function MediaActivitiesSection({ kind, id, onLayout }: Readonly<ISectionProps>) {
  const activities = useInfiniteQuery({
    queryKey: ['media-activities', kind, id],
    queryFn: ({ pageParam }) => api.getMediaActivities(kind, id, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
  });
  const items = useMemo(() => activities.data?.pages.flatMap((page) => page.results) ?? [], [activities.data]);
  return (
    <SectionCard title="Activités récentes" icon={Activity} onLayout={onLayout}>
      {activities.isPending ? (
        <Loading />
      ) : activities.isError ? (
        <ErrorState error={activities.error} onRetry={() => void activities.refetch()} />
      ) : items.length === 0 ? (
        <Txt size="sm" color={Tw.color.mutedForeground}>
          Aucune activité enregistrée pour cette fiche.
        </Txt>
      ) : (
        <View style={styles.stack}>
          {items.map((activity) => (
            <View key={activity.id} style={styles.item}>
              <Txt size="sm">{plainDescribe(activity.describe || activity.action)}</Txt>
              <Txt size="xs" color={Tw.color.mutedForeground}>
                {activity.author?.displayName ? `${activity.author.displayName} · ` : ''}
                {timeAgo(activity.createdAt)}
              </Txt>
            </View>
          ))}
          {activities.hasNextPage ? (
            <Button label={activities.isFetchingNextPage ? 'Chargement…' : 'Voir plus'} variant="outline" disabled={activities.isFetchingNextPage} onPress={() => void activities.fetchNextPage()} />
          ) : null}
        </View>
      )}
    </SectionCard>
  );
}

const openExternal = (url: string) => router.navigate({ pathname: '/reading', params: { url, t: String(Date.now()) } });

/** Épisodes d'un anime diffusés sur Crunchyroll ; un appui ouvre l'épisode dans le navigateur de l'app (suivi automatique). */
export function MediaEpisodesSection({ id, onLayout }: Readonly<Omit<ISectionProps, 'kind'>>) {
  const episodes = useQuery({ queryKey: ['anime-episodes', id], queryFn: () => api.getAnimeEpisodes(id), staleTime: 5 * 60_000 });
  const [all, setAll] = useState(false);
  const sorted = useMemo(() => [...(episodes.data ?? [])].sort((a, b) => b.episodeNumber - a.episodeNumber), [episodes.data]);
  const shown = all ? sorted : sorted.slice(0, 8);
  return (
    <SectionCard title="Épisodes" icon={PlayCircle} count={sorted.length || undefined} onLayout={onLayout}>
      {episodes.isPending ? (
        <Loading />
      ) : episodes.isError ? (
        <ErrorState error={episodes.error} onRetry={() => void episodes.refetch()} />
      ) : sorted.length === 0 ? (
        <Txt size="sm" color={Tw.color.mutedForeground}>
          Aucun épisode référencé pour cet anime.
        </Txt>
      ) : (
        <View style={styles.stack}>
          {shown.map((episode) => (
            <Pressable key={episode.id} accessibilityRole="button" onPress={() => openExternal(episode.link)} style={styles.item}>
              <Txt size="sm" weight="medium">
                Épisode {episode.episodeNumber}
                {episode.episodeTitle ? ` · ${episode.episodeTitle}` : ''}
              </Txt>
              <Txt size="xs" color={Tw.color.mutedForeground}>
                {new Date(episode.pubDate).toLocaleDateString('fr-FR')} · {episode.publisher}
              </Txt>
            </Pressable>
          ))}
          {sorted.length > 8 ? <Button label={all ? 'Réduire' : `Voir les ${sorted.length} épisodes`} variant="outline" onPress={() => setAll((v) => !v)} /> : null}
        </View>
      )}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 10 },
  counters: { flexDirection: 'row', gap: 10 },
  counter: { flex: 1, padding: 12, borderRadius: Tw.radius.md, backgroundColor: Tw.color.muted, gap: 2 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { width: 76 },
  barTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: Tw.color.muted, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  barCount: { width: 32, textAlign: 'right' },
  item: { gap: 3, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Tw.color.border },
});
