import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { AuraAvatar } from '@/components/member/aura-avatar';
import { openMember } from '@/components/member/open-member';
import { EmptyState, ErrorState, Loading } from '@/components/states';
import { Pressable } from '@/components/tap';
import { Txt } from '@/components/tw';
import { Colors, Fonts, Radius, Spacing, Tw } from '@/constants/theme';
import { api } from '@/lib/api';
import { signatureCardTint, signatureNameColor } from '@/lib/signature';

/** Recherche d'un membre par pseudo (annuaire `/membres` du site) : un appui ouvre son profil public, d'où l'on peut l'ajouter en ami. */
export function MemberDirectory() {
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setSearch(text.trim()), 350);
    return () => clearTimeout(timer);
  }, [text]);

  const list = useInfiniteQuery({
    queryKey: ['members', search],
    queryFn: ({ pageParam }) => api.searchMembers(search, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
  });
  // Un membre invisible pour le lecteur arrive anonymisé (pseudo vide) : il n'a pas de profil à ouvrir, on ne le liste pas.
  const items = useMemo(() => (list.data?.pages.flatMap((page) => page.results) ?? []).filter((m) => !!m.username), [list.data]);

  return (
    <View style={styles.root}>
      <TextInput value={text} onChangeText={setText} placeholder="Rechercher un pseudo" placeholderTextColor={Colors.textSecondary} autoCapitalize="none" autoCorrect={false} style={styles.input} />
      {list.isPending ? (
        <Loading />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState title="Aucun membre" hint="Essaie un autre pseudo." />
      ) : (
        <View style={styles.list}>
          {items.map((member) => (
            <Pressable key={member.id} accessibilityRole="button" onPress={() => openMember(member.username)} style={[styles.row, signatureCardTint(member.signature)]}>
              <AuraAvatar uri={member.avatarUrl} name={member.displayName ?? member.username} size={44} signature={member.signature} tier={member.contributionTier} />
              <View style={styles.flex}>
                <Txt size="sm" weight="semibold" numberOfLines={1} color={signatureNameColor(member.signature)}>
                  {member.displayName ?? member.username}
                </Txt>
                <Txt size="xs" color={Tw.color.mutedForeground}>
                  @{member.username}
                </Txt>
              </View>
            </Pressable>
          ))}
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
});
