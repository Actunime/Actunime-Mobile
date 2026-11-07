import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { openMedia } from '@/components/media-row';
import { SettingsCard, SettingsPage } from '@/components/settings/settings-ui';
import { ErrorState, Loading } from '@/components/states';
import { Pressable } from '@/components/tap';
import { Txt } from '@/components/tw';
import { Tw } from '@/constants/theme';
import { api } from '@/lib/api';

type Period = '7d' | '30d' | 'season';
const PERIODS: { id: Period; label: string }[] = [
  { id: '7d', label: '7 jours' },
  { id: '30d', label: '30 jours' },
  { id: 'season', label: 'Saison' },
];

interface IMediaLine {
  mediaId: string;
  mediaType: 'Anime' | 'Manga';
  title: string | null;
  posterUrl?: string | null;
}

function MediaLines({ items, right }: Readonly<{ items: IMediaLine[]; right: (index: number) => string }>) {
  return (
    <View style={styles.lines}>
      {items.map((item, index) => (
        <Pressable key={`${item.mediaType}-${item.mediaId}`} accessibilityRole="button" onPress={() => openMedia(item.mediaType === 'Manga' ? 'manga' : 'anime', item.mediaId)} style={styles.line}>
          <Txt size="sm" weight="bold" color={Tw.color.mutedForeground} style={styles.rank}>
            {index + 1}
          </Txt>
          <View style={styles.thumb}>{item.posterUrl ? <Image source={{ uri: item.posterUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}</View>
          <Txt size="sm" weight="medium" numberOfLines={2} style={styles.flex}>
            {item.title ?? 'Sans titre'}
          </Txt>
          <Txt size="xs" color={Tw.color.mutedForeground}>
            {right(index)}
          </Txt>
        </Pressable>
      ))}
    </View>
  );
}

/** Communauté (`/communaute` du site) : les chiffres de la période, ce qui se regarde en ce moment et les classements. */
export default function CommunityScreen() {
  const [period, setPeriod] = useState<Period>('7d');
  const stats = useQuery({ queryKey: ['community', 'stats', period], queryFn: () => api.getCommunityStats(period), staleTime: 5 * 60_000 });
  const watching = useQuery({ queryKey: ['community', 'watching'], queryFn: () => api.getCommunityNowWatching(8), staleTime: 5 * 60_000 });
  const added = useQuery({ queryKey: ['community', 'rank', 'most-added', period], queryFn: () => api.getCommunityRankings('most-added', period, 8), staleTime: 5 * 60_000 });
  const rising = useQuery({ queryKey: ['community', 'rank', 'rising', period], queryFn: () => api.getCommunityRankings('rising', period, 8), staleTime: 5 * 60_000 });

  return (
    <SettingsPage title="Communauté" description="Ce que les membres suivent en ce moment sur Actunime.">
      <View style={styles.chips}>
        {PERIODS.map((p) => (
          <Pressable key={p.id} accessibilityRole="button" accessibilityState={{ selected: period === p.id }} onPress={() => setPeriod(p.id)} style={[styles.chip, period === p.id && styles.chipOn]}>
            <Txt size="sm" weight="medium" color={period === p.id ? Tw.color.primaryForeground : Tw.color.mutedForeground}>
              {p.label}
            </Txt>
          </Pressable>
        ))}
      </View>

      {stats.isPending ? (
        <Loading />
      ) : stats.isError ? (
        <ErrorState error={stats.error} onRetry={() => void stats.refetch()} />
      ) : (
        <View style={styles.grid}>
          <Counter value={stats.data.week.episodesWatched} label="épisodes vus" />
          <Counter value={stats.data.week.chaptersRead} label="chapitres lus" />
          <Counter value={stats.data.week.listUpdates} label="mises à jour" />
          <Counter value={stats.data.activeMembers} label="membres actifs" />
          <Counter value={stats.data.newMembers} label="nouveaux membres" />
          <Counter value={stats.data.membersOnline} label="en ligne" />
        </View>
      )}

      <Section title={watching.data?.season ? `En ce moment · ${watching.data.season}` : 'En ce moment'} query={watching}>
        {watching.data ? <MediaLines items={watching.data.items} right={(i) => `${watching.data!.items[i]!.membersCount} membres`} /> : null}
      </Section>
      <Section title="Les plus ajoutés" query={added}>
        {added.data ? <MediaLines items={added.data.items} right={(i) => `${added.data!.items[i]!.count} ajouts`} /> : null}
      </Section>
      <Section title="En hausse" query={rising}>
        {rising.data ? <MediaLines items={rising.data.items} right={(i) => `${rising.data!.items[i]!.delta > 0 ? '+' : ''}${rising.data!.items[i]!.delta}`} /> : null}
      </Section>
    </SettingsPage>
  );
}

function Counter({ value, label }: Readonly<{ value: number; label: string }>) {
  return (
    <View style={styles.counter}>
      <Txt size="xl" weight="bold">
        {value.toLocaleString('fr-FR')}
      </Txt>
      <Txt size="xs" color={Tw.color.mutedForeground}>
        {label}
      </Txt>
    </View>
  );
}

function Section({ title, query, children }: Readonly<{ title: string; query: { isPending: boolean; isError: boolean; error: unknown; refetch: () => unknown; data?: { items: unknown[] } }; children: React.ReactNode }>) {
  return (
    <SettingsCard>
      <Txt size="base" weight="medium">
        {title}
      </Txt>
      {query.isPending ? <Loading /> : query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : query.data && query.data.items.length === 0 ? <Txt size="sm" color={Tw.color.mutedForeground}>Rien pour le moment.</Txt> : children}
    </SettingsCard>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { minHeight: 40, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: Tw.color.border, backgroundColor: Tw.color.card },
  chipOn: { backgroundColor: Tw.color.primary, borderColor: Tw.color.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  counter: { width: '47%', flexGrow: 1, padding: 12, borderRadius: Tw.radius.md, backgroundColor: Tw.color.card, borderWidth: 1, borderColor: Tw.color.border, gap: 2 },
  lines: { gap: 6 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56 },
  rank: { width: 20, textAlign: 'center' },
  thumb: { width: 36, height: 50, borderRadius: 6, overflow: 'hidden', backgroundColor: Tw.color.muted },
});
