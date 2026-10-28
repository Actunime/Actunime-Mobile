import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { DateField, Field, NumberField, ScoreField } from '@/components/form-fields';
import { Poster } from '@/components/poster';
import { Screen } from '@/components/screen';
import { ErrorState, Loading, errorMessage } from '@/components/states';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import type { ListVisibility, MediaKind } from '@/lib/api';
import {
  PROGRESS_STATUSES,
  RATING_STATUSES,
  REWATCH_STATUSES,
  STATUS_LABELS,
  VISIBILITY_LABELS,
  applyStatus,
  buildFields,
  buildUpdate,
  disabledReason,
  entryToForm,
  statusesFor,
  type IListForm,
} from '@/lib/list-form';
import { mediaTitle, mediaTypeOf, totalOf } from '@/lib/media';
import { useEntryForMedia, useMedia, useRemoveEntry, useSaveEntry } from '@/lib/queries';

const VISIBILITIES: ListVisibility[] = ['PUBLIC', 'FRIENDS_ONLY', 'PRIVATE'];

/** Ajouter une œuvre à ma liste ou modifier mon entrée : mêmes champs que l'`AddToListDialog` du site. */
export default function EditEntryScreen() {
  const { kind, id } = useLocalSearchParams<{ kind: MediaKind; id: string }>();
  const mediaType = mediaTypeOf(kind);
  const media = useMedia(kind, id);
  const entryQuery = useEntryForMedia(id);
  const save = useSaveEntry();
  const remove = useRemoveEntry();

  const entry = entryQuery.data ?? null;
  const [form, setForm] = useState<IListForm | null>(null);

  // Le formulaire part de l'entrée existante une fois qu'elle est chargée (et une seule fois).
  useEffect(() => {
    if (!form && entryQuery.isSuccess) setForm(entryToForm(mediaType, entry));
  }, [form, entryQuery.isSuccess, entry, mediaType]);

  const totalEpisodes = totalOf('anime', media.data);
  const statuses = useMemo(() => statusesFor(mediaType), [mediaType]);

  if (media.isPending || entryQuery.isPending || !form) {
    if (media.isError || entryQuery.isError) return <ErrorState error={media.error ?? entryQuery.error} />;
    return (
      <Screen edges={['top', 'bottom']}>
        <Loading />
      </Screen>
    );
  }
  if (media.isError) return <ErrorState error={media.error} onRetry={() => media.refetch()} />;

  const update = (patch: Partial<IListForm>) => setForm((current) => (current ? { ...current, ...patch } : current));
  const busy = save.isPending || remove.isPending;
  const title = mediaTitle(media.data);
  const error = save.error ?? remove.error;

  const submit = () => {
    save.mutate(
      {
        mediaId: id,
        mediaType,
        entry,
        fields: buildFields(form, mediaType),
        update: buildUpdate(form, mediaType),
      },
      { onSuccess: () => router.back() },
    );
  };

  const confirmRemove = () => {
    if (!entry) return;
    Alert.alert('Retirer de ta liste ?', `« ${title} » sera retiré. Ta progression et ta note seront perdues.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Retirer',
        style: 'destructive',
        onPress: () => remove.mutate({ entry, mediaId: id }, { onSuccess: () => router.back() }),
      },
    ]);
  };

  const dateField = (key: 'startedAt' | 'completedAt' | 'onHoldSince', label: string) => (
    <Field label={label}>
      <DateField value={form[key]} onChange={(value) => update({ [key]: value })} />
    </Field>
  );

  const showProgress = PROGRESS_STATUSES.includes(form.status);

  return (
    <Screen edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.media}>
          <Poster uri={media.data.posterUrl} width={48} />
          <View style={styles.mediaText}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {entry ? 'Modifier mon entrée' : `Ajouter à ma liste ${mediaType === 'Anime' ? 'd’anime' : 'de manga'}`}
            </ThemedText>
            <ThemedText type="subtitle" numberOfLines={2}>
              {title}
            </ThemedText>
          </View>
        </View>

        <Field label="État">
          <View style={styles.grid}>
            {statuses.map((status) => {
              const reason = disabledReason(mediaType, media.data.status, status);
              return (
                <View key={status} style={styles.gridItem}>
                  <Chip
                    label={STATUS_LABELS[status]}
                    active={form.status === status}
                    disabled={reason !== null}
                    onPress={() => setForm(applyStatus(form, status, { mediaType, entry, totalEpisodes }))}
                  />
                </View>
              );
            })}
          </View>
          {statuses.some((s) => disabledReason(mediaType, media.data.status, s)) && (
            <ThemedText type="small" themeColor="textSecondary">
              {disabledReason(mediaType, media.data.status, 'COMPLETED') ?? disabledReason(mediaType, media.data.status, 'WATCHING')}
            </ThemedText>
          )}
        </Field>

        {showProgress && mediaType === 'Anime' && (
          <Field label="Épisodes vus" hint={totalEpisodes ? `sur ${totalEpisodes}` : undefined}>
            <NumberField
              value={form.episodesWatched}
              onChange={(episodesWatched) => update({ episodesWatched })}
              shortcuts={totalEpisodes ? [{ label: `Tous (${totalEpisodes})`, value: totalEpisodes }] : undefined}
            />
          </Field>
        )}
        {showProgress && mediaType === 'Manga' && (
          <>
            <Field label="Chapitres lus" hint={totalOf('manga', media.data) ? `sur ${totalOf('manga', media.data)}` : undefined}>
              <NumberField value={form.chaptersRead} onChange={(chaptersRead) => update({ chaptersRead })} />
            </Field>
            <Field label="Volumes lus" hint={media.data.volumesInfo?.total ? `sur ${media.data.volumesInfo.total}` : undefined}>
              <NumberField value={form.volumesRead} onChange={(volumesRead) => update({ volumesRead })} />
            </Field>
          </>
        )}

        {RATING_STATUSES.includes(form.status) && (
          <Field label="Note" hint={form.status !== 'COMPLETED' ? 'provisoire tant que ce n’est pas terminé' : undefined}>
            <ScoreField value={form.score} onChange={(score) => update({ score })} />
          </Field>
        )}

        {REWATCH_STATUSES.includes(form.status) && (
          <Field label={mediaType === 'Anime' ? 'Nombre de revisionnages' : 'Nombre de relectures'}>
            <NumberField value={form.rewatchCount} onChange={(rewatchCount) => update({ rewatchCount: rewatchCount ?? 0 })} />
          </Field>
        )}

        {form.status !== 'PLAN_TO_WATCH' && form.status !== 'PLAN_TO_READ' && (
          <>
            {dateField('startedAt', 'Commencé le')}
            {form.status === 'COMPLETED' && dateField('completedAt', 'Terminé le')}
            {form.status === 'ON_HOLD' && dateField('onHoldSince', 'En pause depuis le')}
          </>
        )}

        <Field label="Notes personnelles" hint={`${form.notes.length} / 1000`}>
          <TextInput
            value={form.notes}
            onChangeText={(notes) => update({ notes })}
            multiline
            maxLength={1000}
            placeholder="Tes impressions, où tu en es…"
            placeholderTextColor={Colors.textSecondary}
            style={[styles.input, styles.notes]}
          />
          <View style={styles.switchRow}>
            <ThemedText type="small" style={styles.switchLabel}>
              Montrer mes notes aux visiteurs de ma liste
            </ThemedText>
            <Switch
              value={form.notesPublic}
              onValueChange={(notesPublic) => update({ notesPublic })}
              trackColor={{ true: Colors.primary, false: Colors.input }}
            />
          </View>
        </Field>

        <Field label="Visibilité">
          <View style={styles.row}>
            {VISIBILITIES.map((visibility) => (
              <Chip
                key={visibility}
                label={VISIBILITY_LABELS[visibility]}
                active={form.visibility === visibility}
                onPress={() => update({ visibility })}
              />
            ))}
          </View>
        </Field>

        {error ? (
          <ThemedText type="small" themeColor="destructive">
            Impossible d’enregistrer : {errorMessage(error)}
          </ThemedText>
        ) : null}

        <Button label={busy ? 'Enregistrement…' : entry ? 'Enregistrer' : 'Ajouter à ma liste'} onPress={submit} disabled={busy} />
        <View style={styles.row}>
          <View style={styles.flex}>
            <Button label="Annuler" variant="outline" onPress={() => router.back()} disabled={busy} />
          </View>
          {entry && (
            <View style={styles.flex}>
              <Button label="Retirer de ma liste" variant="outline" onPress={confirmRemove} disabled={busy} />
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.four, paddingBottom: Spacing.six },
  media: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  mediaText: { flex: 1, gap: Spacing.half },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  gridItem: { minWidth: '47%', flexGrow: 1 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  flex: { flex: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  switchLabel: { flex: 1 },
  input: {
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Colors.input,
    color: Colors.text,
    fontFamily: Fonts.medium,
    fontSize: 16,
  },
  notes: { minHeight: 96, paddingTop: Spacing.three, textAlignVertical: 'top' },
});
