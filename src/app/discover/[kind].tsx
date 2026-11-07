import { useInfiniteQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { Building2, Music, User } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { openEntity } from '@/components/entity/open-entity';
import { SettingsPage } from '@/components/settings/settings-ui';
import { EmptyState, ErrorState, Loading } from '@/components/states';
import { Pressable } from '@/components/tap';
import { Txt } from '@/components/tw';
import { Colors, Fonts, Radius, Spacing, Tw } from '@/constants/theme';
import { api, type EntityKind } from '@/lib/api';
import { entityBadge, entityImage, entityName } from '@/lib/entity';

const KINDS: Record<string, { kind: EntityKind; title: string; hint: string }> = {
  characters: { kind: 'character', title: 'Personnages', hint: 'Rechercher un personnage' },
  persons: { kind: 'person', title: 'Personnes', hint: 'Rechercher un doubleur, un staff, un artiste' },
  tracks: { kind: 'track', title: 'Musiques', hint: 'Rechercher une musique' },
  companies: { kind: 'company', title: 'Sociétés', hint: 'Rechercher un studio, un éditeur' },
};

/** Annuaire d'un type d'entité (« Découvrir » du site) : recherche et liste paginée, chaque ligne ouvre sa fiche dans l'app. */
export default function DiscoverScreen() {
  const { kind: param } = useLocalSearchParams<{ kind: string }>();
  const config = KINDS[param ?? ''];
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  // Recherche lancée après une courte pause de frappe, pas à chaque lettre.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(text.trim()), 350);
    return () => clearTimeout(timer);
  }, [text]);

  const list = useInfiniteQuery({
    queryKey: ['discover', config?.kind, search],
    queryFn: ({ pageParam }) => api.searchEntities(config!.kind, search, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
    enabled: !!config,
  });
  const items = useMemo(() => list.data?.pages.flatMap((page) => page.results) ?? [], [list.data]);
  const Icon = config?.kind === 'track' ? Music : config?.kind === 'company' ? Building2 : User;

  if (!config) return <SettingsPage title="Annuaire"><EmptyState title="Annuaire inconnu" /></SettingsPage>;

  return (
    <SettingsPage title={config.title}>
      <TextInput value={text} onChangeText={setText} placeholder={config.hint} placeholderTextColor={Colors.textSecondary} autoCapitalize="none" autoCorrect={false} style={styles.input} />
      {list.isPending ? (
        <Loading />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState title="Aucun résultat" hint="Essaie un autre nom." />
      ) : (
        <View style={styles.list}>
          {items.map((entity) => {
            const image = entityImage(entity);
            const badge = entityBadge(config.kind, entity);
            return (
              <Pressable key={entity.id} accessibilityRole="button" onPress={() => openEntity(config.kind, entity.id)} style={styles.row}>
                <View style={styles.thumb}>
                  {image ? <Image source={{ uri: image }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Icon size={20} color={Tw.color.mutedForeground} />}
                </View>
                <View style={styles.flex}>
                  <Txt size="sm" weight="semibold" numberOfLines={2}>
                    {entityName(entity)}
                  </Txt>
                  {badge ? (
                    <Txt size="xs" color={Tw.color.mutedForeground}>
                      {badge}
                    </Txt>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
          {list.hasNextPage ? <Button label={list.isFetchingNextPage ? 'Chargement…' : 'Voir plus'} variant="outline" disabled={list.isFetchingNextPage} onPress={() => void list.fetchNextPage()} /> : null}
        </View>
      )}
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  input: { minHeight: 48, paddingHorizontal: Spacing.three, borderRadius: Radius.medium, backgroundColor: Tw.color.input, color: Colors.text, fontFamily: Fonts.medium, fontSize: 14 },
  list: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, padding: 8, borderRadius: Tw.radius.lg, borderWidth: 1, borderColor: Tw.color.border, backgroundColor: Tw.color.card },
  thumb: { width: 44, height: 44, borderRadius: Tw.radius.md, overflow: 'hidden', backgroundColor: Tw.color.muted, alignItems: 'center', justifyContent: 'center' },
});
