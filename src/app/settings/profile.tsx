import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { Button } from '@/components/button';
import { Field } from '@/components/form-fields';
import { SettingsCard, SettingsPage, StatusNote } from '@/components/settings/settings-ui';
import { ErrorState, Loading } from '@/components/states';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { errorMessage } from '@/components/states';

/** Profil (`settings/profile` du site) : nom affiché et présentation. L'image de profil se change depuis le site. */
export default function ProfileSettings() {
  const client = useQueryClient();
  const profile = useQuery({ queryKey: ['me', 'profile'], queryFn: () => api.getMyProfile() });
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!profile.data) return;
    setDisplayName(profile.data.displayName ?? '');
    setDescription(profile.data.description ?? '');
  }, [profile.data]);

  const save = useMutation({
    mutationFn: () => api.updateMyProfile({ displayName: displayName.trim(), description: description.trim() }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['me'] });
      void client.invalidateQueries({ queryKey: ['member'] });
    },
  });

  const changed = profile.data ? displayName.trim() !== (profile.data.displayName ?? '') || description.trim() !== (profile.data.description ?? '') : false;

  return (
    <SettingsPage title="Profil" description="Ce que les autres membres voient en haut de ton profil.">
      {profile.isPending ? (
        <Loading />
      ) : profile.isError ? (
        <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />
      ) : (
        <SettingsCard>
          <Field label="Nom affiché" hint={`@${profile.data.username}`}>
            <TextInput value={displayName} onChangeText={setDisplayName} maxLength={40} style={styles.input} placeholderTextColor={Colors.textSecondary} />
          </Field>
          <Field label="Présentation" hint={`${description.length} / 300`}>
            <TextInput value={description} onChangeText={setDescription} maxLength={300} multiline style={[styles.input, styles.multiline]} placeholderTextColor={Colors.textSecondary} />
          </Field>
          {save.isSuccess ? <StatusNote tone="success">Profil enregistré.</StatusNote> : null}
          {save.isError ? <StatusNote tone="error">{errorMessage(save.error)}</StatusNote> : null}
          <Button label={save.isPending ? 'Enregistrement…' : 'Enregistrer'} disabled={!changed || !displayName.trim() || save.isPending} onPress={() => save.mutate()} />
        </SettingsCard>
      )}
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.medium,
    backgroundColor: Colors.backgroundElement,
    color: Colors.text,
    fontFamily: Fonts.medium,
    fontSize: 14,
  },
  multiline: { minHeight: 110, textAlignVertical: 'top' },
});
