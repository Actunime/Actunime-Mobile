import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ReportSheet } from '@/components/report/report-sheet';
import { StatusNote } from '@/components/settings/settings-ui';
import { Txt } from '@/components/tw';
import { Tw } from '@/constants/theme';
import { api } from '@/lib/api';
import { errorMessage } from '@/components/states';

interface IMemberActionsProps {
  memberId: string;
  username: string;
  displayName?: string;
}

/** Actions d'un visiteur sur le profil d'un autre membre (`UserRelationActions` du site) : ami, bloquer, signaler. */
export function MemberActions({ memberId, username, displayName }: Readonly<IMemberActionsProps>) {
  const client = useQueryClient();
  const [reportOpen, setReportOpen] = useState(false);
  const key = ['friendship-status', memberId];
  const status = useQuery({ queryKey: key, queryFn: () => api.friendshipStatus(memberId) });
  const refresh = () => {
    void client.invalidateQueries({ queryKey: key });
    void client.invalidateQueries({ queryKey: ['friendships'] });
  };
  const friend = useMutation({
    mutationFn: async (action: 'request' | 'accept' | 'reject' | 'cancel' | 'remove') => {
      const id = status.data?.friendshipId;
      if (action === 'request') return api.sendFriendRequest(memberId);
      if (action === 'remove') return api.removeFriend(memberId);
      return api.answerFriendRequest(id as string, action);
    },
    onSuccess: refresh,
  });
  const block = useMutation({ mutationFn: () => api.blockMember(memberId), onSuccess: refresh });

  const confirm = (title: string, message: string, label: string, run: () => void) =>
    Alert.alert(title, message, [{ text: 'Annuler', style: 'cancel' }, { text: label, style: 'destructive', onPress: run }]);

  const current = status.data?.status ?? 'NONE';
  const busy = friend.isPending || block.isPending;
  const error = friend.error ?? block.error;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {current === 'NONE' ? <Button label="Ajouter en ami" disabled={busy} onPress={() => friend.mutate('request')} /> : null}
        {current === 'OUTGOING' ? <Button label="Annuler la demande" variant="outline" disabled={busy} onPress={() => friend.mutate('cancel')} /> : null}
        {current === 'INCOMING' ? (
          <>
            <Button label="Accepter" disabled={busy} onPress={() => friend.mutate('accept')} />
            <Button label="Refuser" variant="outline" disabled={busy} onPress={() => friend.mutate('reject')} />
          </>
        ) : null}
        {current === 'FRIENDS' ? (
          <Button label="Retirer des amis" variant="outline" disabled={busy} onPress={() => confirm('Retirer des amis ?', `${displayName ?? username} ne sera plus dans ta liste d’amis.`, 'Retirer', () => friend.mutate('remove'))} />
        ) : null}
        {current === 'COOLDOWN' ? <Txt size="xs" color={Tw.color.mutedForeground}>Une nouvelle demande sera possible plus tard.</Txt> : null}
      </View>
      <View style={styles.row}>
        <Button label="Bloquer" variant="outline" disabled={busy || current === 'BLOCKED'} onPress={() => confirm('Bloquer ce membre ?', 'Le blocage est silencieux : la personne n’en est pas informée.', 'Bloquer', () => block.mutate())} />
        <Button label="Signaler" variant="outline" onPress={() => setReportOpen(true)} />
      </View>
      {block.isSuccess ? <StatusNote tone="success">Membre bloqué.</StatusNote> : null}
      {error ? <StatusNote tone="error">{errorMessage(error)}</StatusNote> : null}
      <ReportSheet open={reportOpen} onClose={() => setReportOpen(false)} targetId={memberId} targetType="Member" targetName={displayName ?? username} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
});
