import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { SettingsCard, SettingsPage } from '@/components/settings/settings-ui';
import { ErrorState, Loading } from '@/components/states';
import { Txt } from '@/components/tw';
import { Tw } from '@/constants/theme';
import { api } from '@/lib/api';

/** Blocages (`settings/blocages` du site) : les membres bloqués, qu'on peut débloquer. Le blocage reste silencieux. */
export default function BlocksSettings() {
  const client = useQueryClient();
  const blocks = useQuery({ queryKey: ['user-blocks', 'me'], queryFn: () => api.listMyBlocks() });
  const unblock = useMutation({
    mutationFn: (memberId: string) => api.unblockMember(memberId),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['user-blocks', 'me'] }),
  });
  const rows = blocks.data?.results ?? [];

  return (
    <SettingsPage title="Blocages" description="Les membres que tu as bloqués. Le blocage est silencieux : la personne bloquée n’en est jamais informée.">
      {blocks.isPending ? (
        <Loading />
      ) : blocks.isError ? (
        <ErrorState error={blocks.error} onRetry={() => void blocks.refetch()} />
      ) : (
        <SettingsCard>
          {rows.length === 0 ? (
            <Txt size="sm" color={Tw.color.mutedForeground}>
              Aucun membre bloqué.
            </Txt>
          ) : (
            rows.map((block) => (
              <View key={block.id} style={styles.row}>
                <View style={styles.flex}>
                  <Txt size="sm" weight="semibold">
                    {block.blocked?.displayName ?? block.blocked?.username ?? block.blockedId}
                  </Txt>
                  {block.reason ? (
                    <Txt size="xs" color={Tw.color.mutedForeground}>
                      Raison : {block.reason}
                    </Txt>
                  ) : null}
                </View>
                <Button label="Débloquer" variant="outline" disabled={unblock.isPending} onPress={() => unblock.mutate(block.blockedId)} />
              </View>
            ))
          )}
        </SettingsCard>
      )}
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
