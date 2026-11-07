import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, StyleSheet, TextInput } from 'react-native';

import { Button } from '@/components/button';
import { Field } from '@/components/form-fields';
import { SettingsCard, SettingsPage, StatusNote } from '@/components/settings/settings-ui';
import { ErrorState, Loading, errorMessage } from '@/components/states';
import { Txt } from '@/components/tw';
import { Colors, Fonts, Radius, Spacing, Tw } from '@/constants/theme';
import { api } from '@/lib/api';

const MIN_REASON = 10;

/** Suppression du compte (`settings/delete-account` du site) : demande avec raison et mot de passe, annulable tant qu'elle est en attente. */
export default function DeleteAccountSettings() {
  const client = useQueryClient();
  const account = useQuery({ queryKey: ['me', 'account'], queryFn: () => api.getAccount() });
  const status = useQuery({ queryKey: ['me', 'deletion'], queryFn: () => api.getAccountDeletionStatus() });
  const [reason, setReason] = useState('');
  const [password, setPassword] = useState('');

  const refresh = () => void client.invalidateQueries({ queryKey: ['me', 'deletion'] });
  const request = useMutation({
    mutationFn: () => api.requestAccountDeletion({ reason: reason.trim(), ...(account.data?.hasPassword ? { confirmPassword: password } : {}) }),
    onSuccess: () => {
      setReason('');
      setPassword('');
      refresh();
    },
  });
  const cancel = useMutation({ mutationFn: () => api.cancelAccountDeletion(), onSuccess: refresh });

  const confirm = () =>
    Alert.alert('Supprimer ton compte ?', 'Ta demande sera traitée après un délai pendant lequel tu pourras l’annuler. Passé ce délai, ton compte et tes données seront supprimés.', [
      { text: 'Garder mon compte', style: 'cancel' },
      { text: 'Demander la suppression', style: 'destructive', onPress: () => request.mutate() },
    ]);

  const pending = status.data && typeof status.data === 'object' ? status.data : null;
  const needsPassword = account.data?.hasPassword !== false;
  const ready = reason.trim().length >= MIN_REASON && (!needsPassword || password.length > 0);

  return (
    <SettingsPage title="Supprimer le compte" description="Cette action est définitive une fois le délai passé : liste, favoris et profil disparaissent.">
      {account.isPending || status.isPending ? (
        <Loading />
      ) : account.isError || status.isError ? (
        <ErrorState error={account.error ?? status.error} onRetry={() => { void account.refetch(); void status.refetch(); }} />
      ) : pending ? (
        <SettingsCard>
          <StatusNote tone="info">Une demande de suppression est en cours. Tu peux encore l’annuler.</StatusNote>
          {cancel.isError ? <StatusNote tone="error">{errorMessage(cancel.error)}</StatusNote> : null}
          <Button label={cancel.isPending ? 'Annulation…' : 'Annuler la demande'} disabled={cancel.isPending} onPress={() => cancel.mutate()} />
        </SettingsCard>
      ) : (
        <SettingsCard>
          <Field label="Pourquoi pars-tu ?" hint={`${reason.trim().length} / ${MIN_REASON} caractères minimum`}>
            <TextInput value={reason} onChangeText={setReason} maxLength={500} multiline style={[styles.input, styles.multiline]} placeholderTextColor={Colors.textSecondary} />
          </Field>
          {needsPassword ? (
            <Field label="Mot de passe">
              <TextInput value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" style={styles.input} />
            </Field>
          ) : (
            <Txt size="xs" color={Tw.color.mutedForeground}>
              Ton compte Discord n’a pas de mot de passe à confirmer.
            </Txt>
          )}
          {request.isError ? <StatusNote tone="error">{errorMessage(request.error)}</StatusNote> : null}
          <Button label={request.isPending ? 'Envoi…' : 'Demander la suppression'} disabled={!ready || request.isPending} onPress={confirm} />
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
  multiline: { minHeight: 110, textAlignVertical: 'top' },
});
