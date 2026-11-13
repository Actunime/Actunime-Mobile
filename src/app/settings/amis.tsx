import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { openMember } from '@/components/member/open-member';
import { SettingsCard, SettingsPage } from '@/components/settings/settings-ui';
import { ErrorState, Loading } from '@/components/states';
import { Pressable } from '@/components/tap';
import { Txt } from '@/components/tw';
import { Tw } from '@/constants/theme';
import { api, type IFriendRequest } from '@/lib/api';
import { signatureNameColor } from '@/lib/signature';
import { AuraAvatar } from '@/components/member/aura-avatar';

type Direction = 'incoming' | 'outgoing';
type Tab = 'friends' | Direction;

/** L'autre membre d'une demande : l'expéditeur pour une demande reçue, le destinataire pour une demande envoyée. */
const otherMember = (request: IFriendRequest, direction: Direction) => {
  // L'API joint les deux membres de l'amitié (`userAMember`, `userBMember`) : `requestedBy` désigne l'expéditeur.
  const senderIsA = request.requestedBy === request.userA;
  const sender = senderIsA ? request.userAMember : request.userBMember;
  const recipient = senderIsA ? request.userBMember : request.userAMember;
  return (direction === 'incoming' ? sender : recipient) ?? null;
};

/** Mes amis : la liste, les demandes reçues (accepter, refuser) et envoyées (annuler), et la recherche d'un membre à ajouter. */
export default function FriendsSettings() {
  const client = useQueryClient();
  const [tab, setTab] = useState<Tab>('friends');
  const direction: Direction = tab === 'outgoing' ? 'outgoing' : 'incoming';
  const me = useQuery({ queryKey: ['me', 'profile'], queryFn: () => api.getMyProfile(), staleTime: 60_000, retry: false });
  const friends = useQuery({ queryKey: ['friends', 'mine', me.data?.id], queryFn: () => api.getMemberFriends(me.data!.id, 50), enabled: !!me.data?.id });
  // Les demandes reçues sont chargées même sur l'onglet « Mes amis » : leur nombre s'affiche sur l'onglet « Reçues ».
  const requests = useQuery({ queryKey: ['friendships', direction], queryFn: () => api.listFriendRequests(direction) });
  const incomingCount = useQuery({ queryKey: ['friendships', 'incoming'], queryFn: () => api.listFriendRequests('incoming') }).data?.results.length ?? 0;
  const answer = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'accept' | 'reject' | 'cancel' }) => api.answerFriendRequest(id, action),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['friendships'] }),
  });
  const rows = requests.data?.results ?? [];

  return (
    <SettingsPage title="Mes amis" description="Tes amis, les demandes reçues et envoyées, et la recherche d’un membre à ajouter.">
      <View style={styles.tabs}>
        {(['friends', 'incoming', 'outgoing'] as const).map((value) => (
          <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: tab === value }} onPress={() => setTab(value)} style={[styles.tab, tab === value && styles.tabSelected]}>
            <Txt size="sm" weight="medium" color={tab === value ? Tw.color.primaryForeground : Tw.color.mutedForeground}>
              {value === 'friends' ? 'Mes amis' : value === 'incoming' ? `Reçues${incomingCount > 0 ? ` (${incomingCount})` : ''}` : 'Envoyées'}
            </Txt>
          </Pressable>
        ))}
      </View>
      {tab === 'friends' ? (
        friends.isError ? (
          <ErrorState error={friends.error} onRetry={() => void friends.refetch()} />
        ) : me.isPending || friends.isPending ? (
          <Loading />
        ) : (
          <SettingsCard>
            {friends.data?.friends.length ? (
              friends.data.friends.map((friend) => {
                const name = friend.displayName ?? friend.username;
                return (
                  <Pressable key={friend.id} accessibilityRole="button" onPress={() => openMember(friend.username)} style={styles.who}>
                    <AuraAvatar uri={friend.avatarUrl} name={name} size={44} signature={friend.signature} tier={friend.contributionTier} />
                    <View style={styles.flex}>
                      <Txt size="sm" weight="semibold" numberOfLines={1} color={signatureNameColor(friend.signature)}>
                        {name}
                      </Txt>
                      <Txt size="xs" color={Tw.color.mutedForeground}>
                        @{friend.username}
                      </Txt>
                    </View>
                  </Pressable>
                );
              })
            ) : (
              <Txt size="sm" color={Tw.color.mutedForeground}>
                Tu n’as pas encore d’amis.
              </Txt>
            )}
            <Button label="Trouver un membre" variant="outline" onPress={() => router.navigate('/search?kind=member' as Href)} />
          </SettingsCard>
        )
      ) : requests.isPending ? (
        <Loading />
      ) : requests.isError ? (
        <ErrorState error={requests.error} onRetry={() => void requests.refetch()} />
      ) : (
        <SettingsCard>
          {rows.length === 0 ? (
            <Txt size="sm" color={Tw.color.mutedForeground}>
              {direction === 'incoming' ? 'Aucune demande reçue.' : 'Aucune demande envoyée.'}
            </Txt>
          ) : (
            rows.map((request) => {
              const member = otherMember(request, direction);
              const name = member?.displayName ?? member?.username ?? 'Membre';
              return (
                <View key={request.id} style={styles.row}>
                  <Pressable accessibilityRole="button" disabled={!member?.username} onPress={() => member?.username && openMember(member.username)} style={styles.who}>
                    <AuraAvatar uri={member?.avatarUrl} name={name} size={44} signature={member?.signature} tier={member?.contributionTier} />
                    <View style={styles.flex}>
                      <Txt size="sm" weight="semibold" numberOfLines={1} color={signatureNameColor(member?.signature)}>
                        {name}
                      </Txt>
                      {request.message ? (
                        <Txt size="xs" color={Tw.color.mutedForeground} numberOfLines={2}>
                          {request.message}
                        </Txt>
                      ) : null}
                    </View>
                  </Pressable>
                  <View style={styles.actions}>
                    {direction === 'incoming' ? (
                      <>
                        <Button label="Accepter" disabled={answer.isPending} onPress={() => answer.mutate({ id: request.id, action: 'accept' })} />
                        <Button label="Refuser" variant="outline" disabled={answer.isPending} onPress={() => answer.mutate({ id: request.id, action: 'reject' })} />
                      </>
                    ) : (
                      <Button label="Annuler" variant="outline" disabled={answer.isPending} onPress={() => answer.mutate({ id: request.id, action: 'cancel' })} />
                    )}
                  </View>
                </View>
              );
            })
          )}
        </SettingsCard>
      )}
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: { minHeight: 44, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: Tw.color.border, backgroundColor: Tw.color.card },
  tabSelected: { backgroundColor: Tw.color.primary, borderColor: Tw.color.primary },
  row: { gap: 10 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  avatar: { width: 44, height: 44, borderRadius: Tw.radius.md, overflow: 'hidden', backgroundColor: Tw.color.muted, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 8 },
});
