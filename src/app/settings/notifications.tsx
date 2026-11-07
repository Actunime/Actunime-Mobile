import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { StyleSheet, Switch, View } from 'react-native';

import { SettingsCard, SettingsPage } from '@/components/settings/settings-ui';
import { ErrorState, Loading } from '@/components/states';
import { Txt } from '@/components/tw';
import { Tw } from '@/constants/theme';
import { api } from '@/lib/api';
import { notificationGroups, preferenceValue } from '@/lib/notifications';

const GROUPS = notificationGroups();
const KEY = ['notifications', 'preferences'] as const;

/** Réglages des notifications (`settings/notifications` du site) : par type, dans l'app et sur Discord. L'e-mail n'existe pas encore. */
export default function NotificationSettings() {
  const client = useQueryClient();
  const prefs = useQuery({ queryKey: KEY, queryFn: () => api.getNotificationPreferences() });
  const save = useMutation({
    mutationFn: (change: { type: string; channel: 'IN_APP' | 'DISCORD'; value: boolean }) =>
      api.setNotificationPreferences({ [change.type]: { [change.channel]: change.value } } as never),
    onSuccess: () => void client.invalidateQueries({ queryKey: KEY }),
  });

  return (
    <SettingsPage title="Notifications" description="Choisis, pour chaque type, où tu veux être prévenu : dans l’application ou par message privé Discord.">
      {prefs.isPending ? (
        <Loading />
      ) : prefs.isError ? (
        <ErrorState error={prefs.error} onRetry={() => void prefs.refetch()} />
      ) : (
        GROUPS.map((group) => (
          <SettingsCard key={group.category}>
            <Txt size="xs" weight="bold" color={Tw.color.mutedForeground}>
              {group.label.toUpperCase()}
            </Txt>
            <View style={styles.head}>
              <View style={styles.flex} />
              <Txt size="xs" style={styles.col}>
                App
              </Txt>
              <Txt size="xs" style={styles.col}>
                Discord
              </Txt>
            </View>
            {group.types.map(({ type, label }) => (
              <View key={type} style={styles.row}>
                <Txt size="sm" style={styles.flex}>
                  {label}
                </Txt>
                {(['IN_APP', 'DISCORD'] as const).map((channel) => (
                  <View key={channel} style={styles.col}>
                    <Switch
                      accessibilityLabel={`${label} — ${channel === 'IN_APP' ? 'dans l’application' : 'sur Discord'}`}
                      value={preferenceValue(prefs.data?.preferences, type, channel)}
                      disabled={save.isPending}
                      onValueChange={(value) => save.mutate({ type, channel, value })}
                    />
                  </View>
                ))}
              </View>
            ))}
          </SettingsCard>
        ))
      )}
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: 4 },
  col: { width: 72, alignItems: 'center' },
});
