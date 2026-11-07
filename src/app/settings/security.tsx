import { ChangePasswordFormSchema } from '@actunime/validations';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { Button } from '@/components/button';
import { Field } from '@/components/form-fields';
import { SettingsCard, SettingsPage, StatusNote } from '@/components/settings/settings-ui';
import { ErrorState, Loading, errorMessage } from '@/components/states';
import { Colors, Fonts, Radius, Spacing, Tw } from '@/constants/theme';
import { api } from '@/lib/api';

/** Sécurité (`settings/security` du site) : changer le mot de passe, avec les règles du site (schéma partagé). */
export default function SecuritySettings() {
  const account = useQuery({ queryKey: ['me', 'account'], queryFn: () => api.getAccount() });
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const [confirmNewPassword, setConfirm] = useState('');
  const [problem, setProblem] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => api.changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      setCurrent('');
      setNew('');
      setConfirm('');
    },
  });

  const submit = () => {
    const parsed = ChangePasswordFormSchema.safeParse({ currentPassword, newPassword, confirmNewPassword });
    if (!parsed.success) {
      setProblem(parsed.error.issues[0]?.message ?? 'Mot de passe invalide');
      return;
    }
    setProblem(null);
    save.mutate();
  };

  return (
    <SettingsPage title="Sécurité" description="Change ton mot de passe. Les autres appareils restent connectés ; ferme leurs sessions depuis « Appareils » si besoin.">
      {account.isPending ? (
        <Loading />
      ) : account.isError ? (
        <ErrorState error={account.error} onRetry={() => void account.refetch()} />
      ) : account.data.hasPassword === false ? (
        <SettingsCard>
          <StatusNote tone="info">Ton compte a été créé avec Discord : il n’a pas de mot de passe à changer.</StatusNote>
        </SettingsCard>
      ) : (
        <SettingsCard>
          <Field label="Mot de passe actuel">
            <TextInput value={currentPassword} onChangeText={setCurrent} secureTextEntry autoCapitalize="none" autoComplete="current-password" style={styles.input} />
          </Field>
          <Field label="Nouveau mot de passe">
            <TextInput value={newPassword} onChangeText={setNew} secureTextEntry autoCapitalize="none" autoComplete="new-password" style={styles.input} />
          </Field>
          <Field label="Confirmer le nouveau mot de passe">
            <TextInput value={confirmNewPassword} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" autoComplete="new-password" style={styles.input} placeholderTextColor={Colors.textSecondary} />
          </Field>
          {problem ? <StatusNote tone="error">{problem}</StatusNote> : null}
          {save.isSuccess ? <StatusNote tone="success">Mot de passe modifié.</StatusNote> : null}
          {save.isError ? <StatusNote tone="error">{errorMessage(save.error)}</StatusNote> : null}
          <Button label={save.isPending ? 'Enregistrement…' : 'Changer le mot de passe'} disabled={!currentPassword || !newPassword || save.isPending} onPress={submit} />
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
    backgroundColor: Tw.color.input,
    color: Colors.text,
    fontFamily: Fonts.medium,
    fontSize: 14,
  },
});
