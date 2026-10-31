import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';

import { SettingsCard, SettingsPage, StatusNote } from '@/components/settings/settings-ui';
import { ErrorState, Loading, errorMessage } from '@/components/states';
import { Pressable } from '@/components/tap';
import { Txt } from '@/components/tw';
import { Tw, alpha } from '@/constants/theme';
import { api, type ProfileVisibility } from '@/lib/api';

const OPTIONS: { value: ProfileVisibility; label: string; description: string }[] = [
  { value: 'PUBLIC', label: 'Public', description: 'Ton profil et toutes ses sections publiques sont visibles par tout le monde.' },
  { value: 'FOLLOWERS_ONLY', label: 'Abonnés seulement', description: 'Seuls les membres qui te suivent voient ton profil, tes listes et tes activités.' },
  { value: 'FRIENDS_ONLY', label: 'Amis seulement', description: 'Seuls tes amis acceptés voient ton profil, tes listes et tes activités.' },
  { value: 'PRIVATE', label: 'Privé', description: 'Ton profil est masqué pour les autres : tes données ne sont visibles que par toi.' },
];

/** Confidentialité (`settings/confidentialite` du site) : qui voit ton profil, tes listes et tes activités. */
export default function PrivacySettings() {
  const client = useQueryClient();
  const privacy = useQuery({ queryKey: ['privacy', 'me'], queryFn: () => api.getMyPrivacy() });
  const change = useMutation({
    mutationFn: (value: ProfileVisibility) => api.setMyPrivacy(value),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['privacy', 'me'] }),
  });
  const current = privacy.data?.profileVisibility ?? 'PUBLIC';

  return (
    <SettingsPage title="Confidentialité" description="Choisis qui peut voir ton profil, tes listes et tes activités. Les niveaux plus restrictifs masquent automatiquement les contenus aux autres.">
      {privacy.isPending ? (
        <Loading />
      ) : privacy.isError ? (
        <ErrorState error={privacy.error} onRetry={() => void privacy.refetch()} />
      ) : (
        <SettingsCard>
          {OPTIONS.map((option) => {
            const selected = current === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                disabled={change.isPending}
                onPress={() => change.mutate(option.value)}
                style={[styles.option, selected && styles.optionSelected]}
              >
                <View style={[styles.radio, selected && styles.radioSelected]} />
                <View style={styles.flex}>
                  <Txt size="sm" weight="semibold">
                    {option.label}
                  </Txt>
                  <Txt size="xs" color={Tw.color.mutedForeground}>
                    {option.description}
                  </Txt>
                </View>
              </Pressable>
            );
          })}
          {change.isError ? <StatusNote tone="error">{errorMessage(change.error)}</StatusNote> : null}
          <StatusNote tone="info">Le changement s’applique tout de suite aux nouvelles activités ; tes activités passées peuvent mettre un peu de temps à suivre.</StatusNote>
        </SettingsCard>
      )}
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  option: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12, minHeight: 64, borderRadius: Tw.radius.lg, borderWidth: 1, borderColor: Tw.color.border },
  optionSelected: { borderColor: Tw.color.primary, backgroundColor: alpha(Tw.color.primary, 0.08) },
  radio: { width: 20, height: 20, marginTop: 2, borderRadius: 10, borderWidth: 2, borderColor: Tw.color.mutedForeground },
  radioSelected: { borderColor: Tw.color.primary, backgroundColor: Tw.color.primary },
});
