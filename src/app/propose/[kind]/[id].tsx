import { MediaStatusObj } from '@actunime/types';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { DateField, Field, NumberField } from '@/components/form-fields';
import { SettingsCard, SettingsPage, StatusNote } from '@/components/settings/settings-ui';
import { ErrorState, Loading, errorMessage } from '@/components/states';
import { Pressable } from '@/components/tap';
import { Txt } from '@/components/tw';
import { Colors, Fonts, Radius, Spacing, Tw } from '@/constants/theme';
import { api, type MediaKind } from '@/lib/api';
import { mediaTitle } from '@/lib/media';
import { buildMediaUpdate, draftOf, type IMediaDraft } from '@/lib/propose';

/** Proposer une modification (`/contribute/<type>` du site, en version courte) : synopsis, total, statut et dates ; la modération vérifie. */
export default function ProposeScreen() {
  const { kind: rawKind, id } = useLocalSearchParams<{ kind: string; id: string }>();
  const kind: MediaKind = rawKind === 'manga' ? 'manga' : 'anime';
  const media = useQuery({ queryKey: ['media', kind, id], queryFn: () => api.getMedia(kind, id), enabled: !!id });
  const original = useMemo(() => (media.data ? draftOf(media.data, kind) : null), [media.data, kind]);
  const [draft, setDraft] = useState<IMediaDraft | null>(null);
  useEffect(() => {
    if (original) setDraft(original);
  }, [original]);

  const changes = original && draft ? buildMediaUpdate(kind, original, draft) : {};
  const changed = Object.keys(changes).length > 0;
  const send = useMutation({ mutationFn: () => api.proposeMediaUpdate(kind, id, changes) });
  const statuses = Object.values(MediaStatusObj);
  const unit = kind === 'manga' ? 'chapitres' : 'épisodes';

  return (
    <SettingsPage title="Proposer une modification" description={media.data ? mediaTitle(media.data) : undefined}>
      {media.isPending || !draft ? (
        media.isError ? <ErrorState error={media.error} onRetry={() => void media.refetch()} /> : <Loading />
      ) : send.isSuccess ? (
        <SettingsCard>
          <StatusNote tone="success">Proposition envoyée. La modération la vérifie ; tu peux suivre son avancement dans « Propositions ».</StatusNote>
        </SettingsCard>
      ) : (
        <SettingsCard>
          <Field label="Synopsis">
            <TextInput value={draft.synopsis} onChangeText={(synopsis) => setDraft({ ...draft, synopsis })} multiline style={[styles.input, styles.multiline]} placeholderTextColor={Colors.textSecondary} />
          </Field>
          <Field label={`Nombre de ${unit}`}>
            <NumberField value={draft.total} onChange={(total) => setDraft({ ...draft, total })} />
          </Field>
          <Field label="Statut">
            <View style={styles.chips}>
              {statuses.map((status) => {
                const selected = draft.status === status.value;
                return (
                  <Pressable key={status.value} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setDraft({ ...draft, status: status.value })} style={[styles.chip, selected && styles.chipOn]}>
                    <Txt size="sm" weight="medium" color={selected ? Tw.color.primaryForeground : Tw.color.mutedForeground}>
                      {status.label}
                    </Txt>
                  </Pressable>
                );
              })}
            </View>
          </Field>
          <Field label="Date de début">
            <DateField allowFuture value={draft.start} onChange={(start) => setDraft({ ...draft, start })} />
          </Field>
          <Field label="Date de fin">
            <DateField allowFuture value={draft.end} onChange={(end) => setDraft({ ...draft, end })} />
          </Field>
          {send.isError ? <StatusNote tone="error">{errorMessage(send.error)}</StatusNote> : null}
          <Button label={send.isPending ? 'Envoi…' : 'Envoyer la proposition'} disabled={!changed || send.isPending} onPress={() => send.mutate()} />
          {!changed ? (
            <Txt size="xs" color={Tw.color.mutedForeground}>
              Modifie au moins un champ pour pouvoir envoyer.
            </Txt>
          ) : null}
        </SettingsCard>
      )}
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  input: { minHeight: 48, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.medium, backgroundColor: Tw.color.input, color: Colors.text, fontFamily: Fonts.medium, fontSize: 14 },
  multiline: { minHeight: 140, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 40, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: Tw.color.border, backgroundColor: Tw.color.card },
  chipOn: { backgroundColor: Tw.color.primary, borderColor: Tw.color.primary },
});
