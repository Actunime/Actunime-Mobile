import { ContributionTiers } from '@actunime/types';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { openMember } from '@/components/member/open-member';
import { SettingsCard, SettingsPage } from '@/components/settings/settings-ui';
import { EmptyState, ErrorState, Loading } from '@/components/states';
import { Pressable } from '@/components/tap';
import { Txt } from '@/components/tw';
import { Tw } from '@/constants/theme';
import { api } from '@/lib/api';

type Period = 'week' | 'month' | 'all';
const PERIODS: { id: Period; label: string }[] = [
  { id: 'week', label: 'Semaine' },
  { id: 'month', label: 'Mois' },
  { id: 'all', label: 'Tout' },
];

/** Contributeurs (`/communaute/contributeurs` et `/paliers` du site) : le classement de la période et les paliers « Éclaireur ». */
export default function ContributorsScreen() {
  const [period, setPeriod] = useState<Period>('month');
  const board = useQuery({ queryKey: ['contributors', period], queryFn: () => api.getContributorsLeaderboard(period), staleTime: 5 * 60_000 });

  return (
    <SettingsPage title="Contributeurs" description="Les membres qui font grandir Actunime : fiches proposées et validées.">
      <View style={styles.chips}>
        {PERIODS.map((p) => (
          <Pressable key={p.id} accessibilityRole="button" accessibilityState={{ selected: period === p.id }} onPress={() => setPeriod(p.id)} style={[styles.chip, period === p.id && styles.chipOn]}>
            <Txt size="sm" weight="medium" color={period === p.id ? Tw.color.primaryForeground : Tw.color.mutedForeground}>
              {p.label}
            </Txt>
          </Pressable>
        ))}
      </View>

      {board.isPending ? (
        <Loading />
      ) : board.isError ? (
        <ErrorState error={board.error} onRetry={() => void board.refetch()} />
      ) : board.data.results.length === 0 ? (
        <EmptyState title="Personne pour l’instant" hint="Les contributions validées de la période apparaissent ici." />
      ) : (
        <View style={styles.list}>
          {board.data.results.map((entry) => {
            const tier = entry.tier > 0 ? ContributionTiers[entry.tier - 1] : null;
            const name = entry.displayName ?? entry.username ?? 'Membre privé';
            return (
              <Pressable key={entry.authorId} accessibilityRole="button" disabled={!entry.username} onPress={() => entry.username && openMember(entry.username)} style={styles.row}>
                <Txt size="sm" weight="bold" color={Tw.color.mutedForeground} style={styles.rank}>
                  {entry.rank}
                </Txt>
                <View style={styles.avatar}>
                  {entry.avatar ? <Image source={{ uri: entry.avatar }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Txt weight="bold">{name.slice(0, 1).toUpperCase()}</Txt>}
                </View>
                <View style={styles.flex}>
                  <Txt size="sm" weight="semibold" numberOfLines={1}>
                    {name}
                  </Txt>
                  <Txt size="xs" color={tier?.color ?? Tw.color.mutedForeground}>
                    {tier ? `${tier.label} · ` : ''}
                    {entry.approvedCount} validée{entry.approvedCount > 1 ? 's' : ''}
                  </Txt>
                </View>
                <Txt size="sm" weight="bold">
                  {entry.points} pts
                </Txt>
              </Pressable>
            );
          })}
        </View>
      )}

      <SettingsCard>
        <Txt size="base" weight="medium">
          Les paliers
        </Txt>
        {ContributionTiers.map((tier) => (
          <View key={tier.name} style={styles.tier}>
            <View style={[styles.dot, { backgroundColor: tier.color }]} />
            <View style={styles.flex}>
              <Txt size="sm" weight="semibold" color={tier.color}>
                {tier.label}
              </Txt>
              <Txt size="xs" color={Tw.color.mutedForeground}>
                {tier.description}
              </Txt>
            </View>
          </View>
        ))}
      </SettingsCard>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { minHeight: 40, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: Tw.color.border, backgroundColor: Tw.color.card },
  chipOn: { backgroundColor: Tw.color.primary, borderColor: Tw.color.primary },
  list: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 60, padding: 8, borderRadius: Tw.radius.lg, borderWidth: 1, borderColor: Tw.color.border, backgroundColor: Tw.color.card },
  rank: { width: 24, textAlign: 'center' },
  avatar: { width: 40, height: 40, borderRadius: Tw.radius.md, overflow: 'hidden', backgroundColor: Tw.color.muted, alignItems: 'center', justifyContent: 'center' },
  tier: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  dot: { width: 12, height: 12, borderRadius: 6 },
});
