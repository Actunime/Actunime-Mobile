import { ProposalModeObj, ProposalStatusObj } from '@actunime/types';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { SettingsPage } from '@/components/settings/settings-ui';
import { EmptyState, ErrorState, Loading } from '@/components/states';
import { Pressable } from '@/components/tap';
import { Txt } from '@/components/tw';
import { Tw } from '@/constants/theme';
import { api, type IProposalData } from '@/lib/api';
import { timeAgo } from '@/lib/notifications';

const FILTERS: { id: string | undefined; label: string }[] = [
  { id: undefined, label: 'Toutes' },
  { id: 'PENDING', label: 'En attente' },
  { id: 'APPROVED', label: 'Approuvées' },
  { id: 'REJECTED', label: 'Rejetées' },
];

const STATUS_TONE: Record<string, string> = { PENDING: '#f59e0b', IN_REVIEW: '#3b82f6', APPROVED: '#10b981', REJECTED: '#ef4444', CORRECTION_REQUESTED: '#f59e0b', LINKED: '#8b5cf6' };

/** Propositions (`/propositions` du site) : ce que les membres ont proposé et où ça en est. Lecture seule dans l'app pour l'instant. */
export default function ProposalsScreen() {
  const [status, setStatus] = useState<string | undefined>(undefined);
  const list = useInfiniteQuery({
    queryKey: ['proposals', status ?? 'ALL'],
    queryFn: ({ pageParam }) => api.listProposals(status, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
  });
  const items = useMemo(() => list.data?.pages.flatMap((page) => page.results) ?? [], [list.data]);

  return (
    <SettingsPage title="Propositions" description="Les fiches et corrections proposées par les membres, avec leur avancement.">
      <View style={styles.chips}>
        {FILTERS.map((f) => (
          <Pressable key={f.label} accessibilityRole="button" accessibilityState={{ selected: status === f.id }} onPress={() => setStatus(f.id)} style={[styles.chip, status === f.id && styles.chipOn]}>
            <Txt size="sm" weight="medium" color={status === f.id ? Tw.color.primaryForeground : Tw.color.mutedForeground}>
              {f.label}
            </Txt>
          </Pressable>
        ))}
      </View>
      {list.isPending ? (
        <Loading />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState title="Aucune proposition" />
      ) : (
        <View style={styles.list}>
          {items.map((proposal) => {
            // Une mise à jour ne porte que les champs changés : le titre est celui de la fiche d'origine.
            const data = proposal.mainDependency as IProposalData | undefined;
            const original = (proposal as { originalData?: IProposalData }).originalData;
            const title = data?.title?.original ?? data?.name?.original ?? original?.title?.original ?? original?.name?.original ?? 'Sans titre';
            const tone = STATUS_TONE[proposal.status] ?? Tw.color.mutedForeground;
            return (
              <View key={proposal.id} style={styles.item}>
                <Txt size="sm" weight="semibold" numberOfLines={2}>
                  {title}
                </Txt>
                <Txt size="xs" color={Tw.color.mutedForeground}>
                  {proposal.entityType} · {ProposalModeObj[proposal.mode] ?? proposal.mode} · {proposal.author?.displayName ?? proposal.author?.username ?? 'Membre'} · {timeAgo(proposal.createdAt)}
                </Txt>
                <Txt size="xs" weight="bold" color={tone}>
                  {ProposalStatusObj[proposal.status as keyof typeof ProposalStatusObj] ?? proposal.status}
                </Txt>
              </View>
            );
          })}
          {list.hasNextPage ? <Button label={list.isFetchingNextPage ? 'Chargement…' : 'Voir plus'} variant="outline" disabled={list.isFetchingNextPage} onPress={() => void list.fetchNextPage()} /> : null}
        </View>
      )}
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 40, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: Tw.color.border, backgroundColor: Tw.color.card },
  chipOn: { backgroundColor: Tw.color.primary, borderColor: Tw.color.primary },
  list: { gap: 8 },
  item: { gap: 3, padding: 12, borderRadius: Tw.radius.lg, borderWidth: 1, borderColor: Tw.color.border, backgroundColor: Tw.color.card },
});
