import { useInfiniteQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Building2, Music, User } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { openEntity } from '@/components/entity/open-entity';
import { EmptyState, ErrorState, Loading } from '@/components/states';
import { Pressable } from '@/components/tap';
import { Txt } from '@/components/tw';
import { Colors, Fonts, Radius, Spacing, Tw } from '@/constants/theme';
import { api, type EntityKind } from '@/lib/api';
import { entityBadge, entityImage, entityName } from '@/lib/entity';

/** Texte d'aide de la barre de recherche, selon ce qu'on cherche. */
export const ENTITY_HINTS: Record<EntityKind, string> = {
  character: 'Rechercher un personnage',
  person: 'Rechercher un doubleur, un staff, un artiste',
  track: 'Rechercher une musique',
  company: 'Rechercher un studio, un éditeur',
};

/** Recherche d'un personnage, d'une personne, d'une musique ou d'une société : liste paginée, chaque ligne ouvre sa fiche dans l'app. */
export function EntityDirectory({ kind }: Readonly<{ kind: EntityKind }>) {
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  // Recherche lancée après une courte pause de frappe, pas à chaque lettre.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(text.trim()), 350);
    return () => clearTimeout(timer);
  }, [text]);

  const list = useInfiniteQuery({
    queryKey: ['discover', kind, search],
    queryFn: ({ pageParam }) => api.searchEntities(kind, search, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
  });
  const items = useMemo(() => list.data?.pages.flatMap((page) => page.results) ?? [], [list.data]);
  const Icon = kind === 'track' ? Music : kind === 'company' ? Building2 : User;

  return (
    <View style={styles.root}>
      <TextInput value={text} onChangeText={setText} placeholder={ENTITY_HINTS[kind]} placeholderTextColor={Colors.textSecondary} autoCapitalize="none" autoCorrect={false} style={styles.input} />
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
            const badge = entityBadge(kind, entity);
            return (
              <Pressable key={entity.id} accessibilityRole="button" onPress={() => openEntity(kind, entity.id)} style={styles.row}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: Spacing.three },
  flex: { flex: 1, gap: 2 },
  input: { minHeight: 48, paddingHorizontal: Spacing.three, borderRadius: Radius.medium, backgroundColor: Tw.color.input, color: Colors.text, fontFamily: Fonts.medium, fontSize: 14 },
  list: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, padding: 8, borderRadius: Tw.radius.lg, borderWidth: 1, borderColor: Tw.color.border, backgroundColor: Tw.color.card },
  thumb: { width: 44, height: 44, borderRadius: Tw.radius.md, overflow: 'hidden', backgroundColor: Tw.color.muted, alignItems: 'center', justifyContent: 'center' },
});
