import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { SettingsCard, SettingsPage } from '@/components/settings/settings-ui';
import { ErrorState, Loading } from '@/components/states';
import { Txt } from '@/components/tw';
import { Tw } from '@/constants/theme';
import { api } from '@/lib/api';
import { sessionName } from '@/lib/sessions';

const lastActive = (value?: string): string => {
  if (!value) return 'Activité inconnue';
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 5) return 'Actif à l’instant';
  if (minutes < 60) return `Actif il y a ${minutes} min`;
  if (minutes < 1440) return `Actif il y a ${Math.round(minutes / 60)} h`;
  return `Actif le ${new Date(value).toLocaleDateString('fr-FR')}`;
};

/** Appareils (`settings/sessions` du site) : où le compte est connecté, avec la possibilité de fermer une session. */
export default function SessionsSettings() {
  const client = useQueryClient();
  const sessions = useQuery({ queryKey: ['auth', 'sessions'], queryFn: () => api.listMySessions() });
  const close = useMutation({
    mutationFn: (id: string) => api.deleteSession(id),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['auth', 'sessions'] }),
  });
  const rows = sessions.data ?? [];

  return (
    <SettingsPage title="Appareils" description="Les sessions ouvertes sur le site avec ton compte. Ferme une session que tu ne reconnais pas.">
      {sessions.isPending ? (
        <Loading />
      ) : sessions.isError ? (
        <ErrorState error={sessions.error} onRetry={() => void sessions.refetch()} />
      ) : (
        <SettingsCard>
          {rows.length === 0 ? (
            <Txt size="sm" color={Tw.color.mutedForeground}>
              Aucune session active.
            </Txt>
          ) : (
            rows.map((session) => (
              <View key={session.id} style={styles.row}>
                <View style={styles.flex}>
                  <Txt size="sm" weight="semibold">
                    {sessionName(session)}
                    {session.current ? ' · cet appareil' : ''}
                  </Txt>
                  <Txt size="xs" color={Tw.color.mutedForeground}>
                    {[session.location, lastActive(session.lastActiveAt)].filter(Boolean).join(' · ')}
                  </Txt>
                </View>
                {session.current ? null : <Button label="Fermer" variant="outline" disabled={close.isPending} onPress={() => close.mutate(session.id)} />}
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
