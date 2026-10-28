import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Fold } from '@/components/fold';
import { Poster } from '@/components/poster';
import { Screen } from '@/components/screen';
import { ErrorState, Loading } from '@/components/states';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { IListEntry, IMedia, MediaKind } from '@/lib/api';
import { MEDIA_STATUS_LABELS, STATUS_LABELS, formatScore } from '@/lib/list-form';
import { formatLabel, formatLongDate, formatYear, linkLabel, mediaTitle, mediaTypeOf, progressLabel, statusTone } from '@/lib/media';
import { useEntryForMedia, useGenres, useMedia } from '@/lib/queries';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TONES = {
  success: { color: Colors.success, background: 'rgba(65, 168, 103, 0.15)' },
  warning: { color: Colors.warning, background: 'rgba(211, 144, 69, 0.15)' },
  destructive: { color: Colors.destructive, background: 'rgba(255, 100, 103, 0.15)' },
  neutral: { color: Colors.text, background: 'rgba(255, 255, 255, 0.06)' },
  primary: { color: Colors.primary, background: 'rgba(0, 153, 255, 0.1)' },
  muted: { color: Colors.textSecondary, background: 'rgba(255, 255, 255, 0.06)' },
} as const;

/** Pastille de la fiche (statut, format, épisodes, genre) : même famille que celles du site. */
function Pill({ label, icon, tone = 'muted' }: Readonly<{ label: string; icon?: IconName; tone?: keyof typeof TONES }>) {
  const { color, background } = TONES[tone];
  return (
    <View style={[styles.pill, { backgroundColor: background, borderColor: tone === 'primary' ? 'rgba(0, 153, 255, 0.3)' : Colors.border }]}>
      {icon ? <Ionicons name={icon} size={12} color={color} /> : null}
      <ThemedText type="small" style={{ color }}>
        {label}
      </ThemedText>
    </View>
  );
}

const LIST_DOT: Record<string, string> = {
  COMPLETED: Colors.success,
  ON_HOLD: Colors.warning,
  DROPPED: Colors.destructive,
};

function InfoRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <View style={styles.infoRow}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.infoLabel}>
        {label}
      </ThemedText>
      <ThemedText type="small" style={styles.infoValue}>
        {value}
      </ThemedText>
    </View>
  );
}

function generalInfo(kind: MediaKind, media: IMedia): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  const format = formatLabel(media.format);
  if (format) rows.push({ label: 'Format', value: format });
  if (media.status) rows.push({ label: 'Statut', value: MEDIA_STATUS_LABELS[media.status] ?? media.status });
  const start = formatLongDate(media.date?.start);
  if (start) rows.push({ label: kind === 'anime' ? 'Début de diffusion' : 'Début de publication', value: start });
  const end = formatLongDate(media.date?.end);
  if (end) rows.push({ label: 'Fin', value: end });
  if (kind === 'anime') {
    if (media.episodesInfo?.total) rows.push({ label: 'Épisodes', value: String(media.episodesInfo.total) });
    if (media.episodesInfo?.durationMinutes) rows.push({ label: 'Durée', value: `${media.episodesInfo.durationMinutes} min par épisode` });
  } else {
    if (media.chaptersInfo?.total) rows.push({ label: 'Chapitres', value: String(media.chaptersInfo.total) });
    if (media.volumesInfo?.total) rows.push({ label: 'Volumes', value: String(media.volumesInfo.total) });
  }
  return rows;
}

/** Ouvre le navigateur de lecture sur une adresse (la même page peut être rouverte : `t` change). */
const openInBrowser = (url: string) => router.push({ pathname: '/browser', params: { url, t: String(Date.now()) } });

function ListButton({ entry, loading, onPress }: Readonly<{ entry: IListEntry | null; loading: boolean; onPress: () => void }>) {
  return (
    <Pressable accessibilityRole="button" disabled={loading} onPress={onPress} style={({ pressed }) => [styles.listButton, loading && styles.dim, pressed && styles.pressed]}>
      {entry ? (
        <View style={[styles.dot, { backgroundColor: LIST_DOT[entry.status] ?? Colors.primary }]} />
      ) : (
        <Ionicons name="add" size={20} color={Colors.primaryForeground} />
      )}
      <ThemedText type="smallBold" themeColor="primaryForeground" style={styles.listLabel} numberOfLines={1}>
        {entry ? STATUS_LABELS[entry.status] : 'Ajouter à ma liste'}
      </ThemedText>
      {entry ? <Ionicons name="pencil" size={15} color={Colors.primaryForeground} /> : null}
    </Pressable>
  );
}

export default function MediaScreen() {
  const { kind, id } = useLocalSearchParams<{ kind: MediaKind; id: string }>();
  const media = useMedia(kind, id);
  const entry = useEntryForMedia(id);
  const genres = useGenres(media.data?.genres);
  const [expanded, setExpanded] = useState(false);

  const back = (
    <Pressable accessibilityRole="button" accessibilityLabel="Retour" hitSlop={10} onPress={() => router.back()} style={styles.back}>
      <Ionicons name="chevron-back" size={24} color={Colors.text} />
    </Pressable>
  );

  if (media.isPending) {
    return (
      <Screen>
        {back}
        <Loading />
      </Screen>
    );
  }
  if (media.isError) {
    return (
      <Screen>
        {back}
        <ErrorState error={media.error} onRetry={() => media.refetch()} />
      </Screen>
    );
  }

  const data = media.data;
  const mediaType = mediaTypeOf(kind);
  const inList = entry.data ?? null;
  const links = (data.links ?? []).filter((link) => /^https?:\/\//.test(link.url));
  const aliases = data.title?.alias?.slice(0, 3).join(' / ');
  const info = generalInfo(kind, data);
  const total = kind === 'anime' ? data.episodesInfo?.total : data.chaptersInfo?.total;
  const duration = data.episodesInfo?.durationMinutes;
  const edit = () => router.push({ pathname: '/edit/[kind]/[id]', params: { kind, id } });

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.backRow}>{back}</View>
        {data.bannerUrl ? <Image source={{ uri: data.bannerUrl }} style={styles.banner} contentFit="cover" /> : null}

        <View style={styles.block}>
          <Poster uri={data.posterUrl} width={144} />
          <View style={styles.titleBlock}>
            <ThemedText type="subtitle" style={styles.title}>
              {mediaTitle(data)}
            </ThemedText>
            {aliases ? (
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                {aliases}
              </ThemedText>
            ) : null}
          </View>
          <View style={styles.pills}>
            {data.status ? <Pill label={MEDIA_STATUS_LABELS[data.status] ?? data.status} icon="play" tone={statusTone(data.status)} /> : null}
            {formatLabel(data.format) ? <Pill label={formatLabel(data.format) as string} icon={kind === 'anime' ? 'tv-outline' : 'book-outline'} tone="neutral" /> : null}
            {data.communityScore?.average !== undefined ? (
              <Pill label={`${formatScore(data.communityScore.average)} / 10`} icon="star" tone="warning" />
            ) : null}
            {total ? <Pill label={`${total} ${kind === 'anime' ? 'épisodes' : 'chapitres'}`} icon="play-outline" /> : null}
            {duration ? <Pill label={`${duration} min`} icon="time-outline" /> : null}
            {formatYear(data) ? <Pill label={formatYear(data) as string} icon="calendar-outline" /> : null}
            {genres.data?.map((genre) => (
              <Pill key={genre.id} label={genre.name} tone="primary" />
            ))}
          </View>
        </View>

        <View style={styles.actionBar}>
          <ListButton entry={inList} loading={entry.isPending} onPress={edit} />
          {inList && progressLabel(inList, data) ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
              {[progressLabel(inList, data), inList.score ? `${formatScore(inList.score)}/10` : null].filter(Boolean).join(' · ')}
            </ThemedText>
          ) : null}
          {entry.isError ? (
            <ThemedText type="small" themeColor="destructive">
              Impossible de lire ton entrée : {entry.error.message}
            </ThemedText>
          ) : null}
        </View>

        <View style={styles.sections}>
          {data.synopsis ? (
            <Fold title="Synopsis">
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={expanded ? undefined : 6}>
                {data.synopsis}
              </ThemedText>
              <Pressable onPress={() => setExpanded((value) => !value)}>
                <ThemedText type="link">{expanded ? 'Réduire' : 'Lire la suite'}</ThemedText>
              </Pressable>
            </Fold>
          ) : null}
          {info.length > 0 ? (
            <Fold title="Informations">
              {info.map((row) => (
                <InfoRow key={row.label} {...row} />
              ))}
            </Fold>
          ) : null}
          <Fold title="Liens externes">
            {links.slice(0, 6).map((link) => (
              <Button key={link.url} label={linkLabel(link)} variant="outline" onPress={() => openInBrowser(link.url)} />
            ))}
            <Button label="Ouvrir le navigateur de lecture" variant="outline" onPress={() => router.navigate('/reading')} />
          </Fold>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: Spacing.six, gap: Spacing.three },
  centered: { textAlign: 'center' },
  banner: { width: '100%', height: 120, opacity: 0.5 },
  backRow: { paddingHorizontal: Spacing.two },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundElement,
    margin: Spacing.one,
  },
  block: { gap: Spacing.three, paddingHorizontal: Spacing.three },
  titleBlock: { gap: Spacing.one },
  title: { fontSize: 22, lineHeight: 28 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.large, borderWidth: 1 },
  actionBar: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.border },
  listButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 48, paddingHorizontal: Spacing.three, borderRadius: Radius.medium, backgroundColor: Colors.primary },
  listLabel: { flex: 1 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  dim: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
  sections: { gap: Spacing.two, paddingHorizontal: Spacing.three },
  infoRow: { flexDirection: 'row', gap: Spacing.three },
  infoLabel: { width: 130 },
  infoValue: { flex: 1 },
});
