import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
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

type Direction = 'incoming' | 'outgoing';

/** L'autre membre d'une demande : l'expéditeur pour une demande reçue, le destinataire pour une demande envoyée. */
const otherMember = (request: IFriendRequest, direction: Direction) => {
  // L'API joint les deux membres de l'amitié (`userAMember`, `userBMember`) : `requestedBy` désigne l'expéditeur.
  const senderIsA = request.requestedBy === request.userA;
  const sender = senderIsA ? request.userAMember : request.userBMember;
  const recipient = senderIsA ? request.userBMember : request.userAMember;
  return (direction === 'incoming' ? sender : recipient) ?? null;
};

/** Amis (`settings/amis` du site) : demandes reçues (accepter, refuser) et envoyées (annuler). */
export default function FriendsSettings() {
  const client = useQueryClient();
  const [direction, setDirection] = useState<Direction>('incoming');
  const requests = useQuery({ queryKey: ['friendships', direction], queryFn: () => api.listFriendRequests(direction) });
  const answer = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'accept' | 'reject' | 'cancel' }) => api.answerFriendRequest(id, action),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['friendships'] }),
  });
  const rows = requests.data?.results ?? [];

  return (
    <SettingsPage title="Amis" description="Les demandes d’amis que tu as reçues et celles que tu as envoyées.">
      <View style={styles.tabs}>
        {(['incoming', 'outgoing'] as const).map((value) => (
          <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: direction === value }} onPress={() => setDirection(value)} style={[styles.tab, direction === value && styles.tabSelected]}>
            <Txt size="sm" weight="medium" color={direction === value ? Tw.color.primaryForeground : Tw.color.mutedForeground}>
              {value === 'incoming' ? 'Reçues' : 'Envoyées'}
            </Txt>
          </Pressable>
        ))}
      </View>
      {requests.isPending ? (
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
                    <View style={styles.avatar}>{member?.avatarUrl ? <Image source={{ uri: member.avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Txt weight="bold">{name.slice(0, 1).toUpperCase()}</Txt>}</View>
                    <View style={styles.flex}>
                      <Txt size="sm" weight="semibold" numberOfLines={1}>
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
