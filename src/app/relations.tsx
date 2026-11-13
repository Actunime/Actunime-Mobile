import { useInfiniteQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Building2, Mic, Music, User, type LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { openEntity } from '@/components/entity/open-entity';
import { openMedia } from '@/components/media-row';
import { Screen } from '@/components/screen';
import { EmptyState, ErrorState, Loading } from '@/components/states';
import { Pressable } from '@/components/tap';
import { Txt } from '@/components/tw';
import { Tw, ScreenGutter } from '@/constants/theme';
import { api, mediaId, type EntityKind, type EntityRelation, type IMediaLink, type IRelated, type MediaKind } from '@/lib/api';
import { CHARACTER_ROLE_LABELS, COMPANY_TYPE_LABELS, ENTITY_SECTIONS, MEDIA_RELATION_TITLES, TRACK_TYPE_LABELS, entityId, entityImage, entityName, voicesOfLink, type IVoice } from '@/lib/entity';
import { formatLabel, mediaTitle } from '@/lib/media';
import { useMetadataNames } from '@/lib/queries';

const PAGE_SIZE = 24;

interface IRow {
  key: string;
  /** Identifiant du poste (staff) : son nom est résolu à part, comme sur la fiche. */
  jobId?: number;
  title: string;
  subtitle?: string;
  imageUrl?: string | null;
  icon: LucideIcon;
  /** Doubleurs du personnage dans cette œuvre : chacun mène à sa fiche. */
  voices?: IVoice[];
  onPress: () => void;
}

type MediaWhat = 'characters' | 'staffs' | 'tracks' | 'companies';
const MEDIA_WHAT: MediaWhat[] = ['characters', 'staffs', 'tracks', 'companies'];

/** Lien d'une œuvre (personnage, staff, musique, société) → ligne : nom, rôle ou type, vers la fiche de l'entité. */
function rowOfMediaLink(what: MediaWhat, link: IMediaLink): IRow | null {
  const data = link.data;
  if (!data) return null;
  const kind: EntityKind = what === 'characters' ? 'character' : what === 'staffs' ? 'person' : what === 'tracks' ? 'track' : 'company';
  const subtitle =
    what === 'characters'
      ? link.role !== undefined
        ? (CHARACTER_ROLE_LABELS[link.role] ?? link.role)
        : undefined
      : what === 'tracks'
        ? (TRACK_TYPE_LABELS[data.type ?? ''] ?? data.type)
        : what === 'companies'
          ? (COMPANY_TYPE_LABELS[data.type ?? ''] ?? data.type)
          : undefined;
  return {
    key: link.id ?? data.id,
    title: data.name?.original ?? 'Sans nom',
    subtitle,
    jobId: what === 'staffs' ? link.job : undefined,
    imageUrl: data.avatarUrl ?? data.coverUrl ?? data.logoUrl ?? null,
    icon: what === 'tracks' ? Music : what === 'companies' ? Building2 : User,
    voices: what === 'characters' ? voicesOfLink(link) : undefined,
    onPress: () => openEntity(kind, data.id),
  };
}

/** Élément d'une relation d'entité → ligne : une œuvre ouvre sa fiche, une entité la sienne. */
function rowOfRelated(itemKind: IEntityItemKind, related: IRelated): IRow {
  const id = entityId(related);
  if (itemKind === 'anime' || itemKind === 'manga') {
    return {
      key: id,
      title: mediaTitle(related as never),
      subtitle: formatLabel(related.format) ?? undefined,
      imageUrl: related.posterUrl,
      icon: User,
      onPress: () => openMedia(itemKind, mediaId(related)),
    };
  }
  return {
    key: id,
    title: entityName(related),
    imageUrl: entityImage(related),
    icon: itemKind === 'track' ? Music : itemKind === 'company' ? Building2 : User,
    onPress: () => openEntity(itemKind, id),
  };
}
type IEntityItemKind = 'anime' | 'manga' | EntityKind;

/**
 * Liste complète d'une relation (« Voir tout ») : personnages, staff, musiques, sociétés d'une œuvre, ou œuvres,
 * personnes, personnages, musiques d'une entité. Défilement infini, chaque ligne mène à l'écran de l'app.
 */
export default function RelationsScreen() {
  const { scope, kind, id, what } = useLocalSearchParams<{ scope: 'media' | 'entity'; kind: string; id: string; what: string }>();
  const fromMedia = scope === 'media' && MEDIA_WHAT.includes(what as MediaWhat);
  const section = scope === 'entity' ? ENTITY_SECTIONS[kind as EntityKind]?.find((candidate) => candidate.relation === what) : undefined;
  const valid = fromMedia || !!section;

  const query = useInfiniteQuery({
    queryKey: ['relations', scope, kind, id, what],
    enabled: valid && !!id,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      if (fromMedia) {
        const page = await api.getMediaLinks(kind as MediaKind, id, what as MediaWhat, PAGE_SIZE, pageParam);
        return { rows: page.results.map((link) => rowOfMediaLink(what as MediaWhat, link)).filter((row): row is IRow => row !== null), total: page.total, next: page.hasNextPage ? pageParam + 1 : undefined };
      }
      const page = await api.getEntityRelation(kind as EntityKind, id, what as EntityRelation, pageParam, PAGE_SIZE);
      return { rows: page.results.map((related) => rowOfRelated(section!.itemKind, related)), total: page.total, next: page.hasNextPage ? pageParam + 1 : undefined };
    },
    getNextPageParam: (last) => last.next,
  });

  const allRows = query.data?.pages.flatMap((page) => page.rows) ?? [];
  const jobIds = [...new Set(allRows.map((row) => row.jobId).filter((job): job is number => job !== undefined))].map(String);
  const jobs = useMetadataNames(jobIds);
  const rows = allRows.map((row) =>
    row.jobId === undefined ? row : { ...row, subtitle: jobs.data?.find((meta) => String(meta.id) === String(row.jobId))?.name },
  );
  const total = query.data?.pages[0]?.total;
  const title = fromMedia ? MEDIA_RELATION_TITLES[what as MediaWhat] : (section?.title ?? 'Liste');

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => (router.canGoBack() ? router.back() : router.navigate('/'))} style={styles.back}>
          <ArrowLeft size={16} color={Tw.color.foreground} />
          <Txt size="sm">Retour</Txt>
        </Pressable>
        <Txt size="xl" weight="bold" style={styles.title}>
          {title}
          {total !== undefined ? (
            <Txt size="sm" color={Tw.color.mutedForeground}>
              {'  '}({total})
            </Txt>
          ) : null}
        </Txt>
      </View>

      {!valid ? (
        <EmptyState title="Liste introuvable" />
      ) : query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row) => row.key}
          contentContainerStyle={styles.list}
          onEndReachedThreshold={0.6}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
          }}
          ListEmptyComponent={<EmptyState title="Rien à afficher" />}
          ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator color={Tw.color.primary} style={styles.footer} /> : null}
          renderItem={({ item }) => <Row row={item} />}
        />
      )}
    </Screen>
  );
}

function Row({ row }: Readonly<{ row: IRow }>) {
  const Icon = row.icon;
  return (
    <Pressable accessibilityRole="button" onPress={row.onPress} style={styles.row}>
      <View style={styles.thumb}>
        {row.imageUrl ? <Image source={{ uri: row.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={120} /> : <Icon size={22} color={Tw.color.mutedForeground} />}
      </View>
      <View style={styles.rowText}>
        <Txt size="sm" weight="semibold" numberOfLines={2}>
          {row.title}
        </Txt>
        {row.subtitle ? (
          <Txt size="xs" color={Tw.color.mutedForeground} numberOfLines={1}>
            {row.subtitle}
          </Txt>
        ) : null}
        {row.voices?.length ? (
          <View style={styles.voices}>
            {row.voices.map((voice) => (
              <Pressable
                key={voice.id}
                accessibilityRole="link"
                accessibilityLabel={`Voir ${voice.name}`}
                onPress={() => openEntity('person', voice.id)}
                style={styles.voice}
              >
                <Mic size={12} color={Tw.color.mutedForeground} />
                <Txt size="xs" numberOfLines={1} style={styles.voiceName}>
                  {voice.name}
                </Txt>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: ScreenGutter, paddingTop: 8, paddingBottom: 12, gap: 12 },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: Tw.radius.md,
    backgroundColor: Tw.color.muted,
  },
  title: { flexShrink: 1 },
  list: { paddingHorizontal: ScreenGutter, paddingBottom: 120, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, padding: 8, borderRadius: Tw.radius.lg, backgroundColor: Tw.color.card },
  thumb: { width: 48, height: 48, borderRadius: Tw.radius.md, overflow: 'hidden', backgroundColor: Tw.color.muted, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: 2 },
  voices: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 4 },
  voice: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 28, paddingHorizontal: 8, borderRadius: Tw.radius.md, backgroundColor: Tw.color.muted },
  voiceName: { flexShrink: 1 },
  footer: { paddingVertical: 16 },
});
