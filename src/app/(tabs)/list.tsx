import { CircleX, Clock } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { CardActionButton, MediaDetailedCard, MediaGridCard, MediaRowCard } from '@/components/cards/media-cards';
import { FilterBar } from '@/components/list/filter-bar';
import { KindSwitch, ListStatusStrip, ListViewSwitcher, type ViewMode } from '@/components/list/list-controls';
import { ManageEntry } from '@/components/list/manage-entry';
import { openMedia } from '@/components/media-row';
import { Screen } from '@/components/screen';
import { ErrorState, Loading } from '@/components/states';
import { Txt } from '@/components/tw';
import { Tw, alpha } from '@/constants/theme';
import { useViewMode } from '@/hooks/use-view-mode';
import type { IListEntry, IMedia, MediaKind } from '@/lib/api';
import {
  LIST_SORT_FIELDS,
  LIST_SORT_LABELS,
  countByStatus,
  filterListEntries,
  groupListEntries,
  type IListQuery,
  type IListSort,
  type ListStatusFilter,
} from '@/lib/list-filter';
import { ANIME_STATUSES, MANGA_STATUSES, STATUS_LABELS } from '@/lib/list-form';
import { useMetadataNames, useMyEntries, usePatchEntry } from '@/lib/queries';

const COLUMNS: Record<ViewMode, number> = { grid: 2, dense: 3, list: 1, rows: 1 };
const GAP: Record<ViewMode, number> = { grid: 12, dense: 8, list: 12, rows: 8 };

type Item =
  | { type: 'section'; key: string; label: string; count: number; first: boolean }
  | { type: 'row'; key: string; entries: IListEntry[] };

/** Lignes de la liste : un titre par section puis les cartes, regroupées par colonne en grille. */
function buildItems(sections: { key: string; label: string; entries: IListEntry[] }[] | null, flat: IListEntry[], columns: number): Item[] {
  const items: Item[] = [];
  const pushRows = (entries: IListEntry[], prefix: string) => {
    for (let i = 0; i < entries.length; i += columns) {
      const chunk = entries.slice(i, i + columns);
      items.push({ type: 'row', key: `${prefix}-${chunk.map((e) => e.id ?? e._id).join('-')}`, entries: chunk });
    }
  };
  if (sections) {
    sections.forEach((section, index) => {
      items.push({ type: 'section', key: `s-${section.key}`, label: section.label, count: section.entries.length, first: index === 0 });
      pushRows(section.entries, section.key);
    });
  } else pushRows(flat, 'flat');
  return items;
}

/** Œuvre affichable d'une entrée : la fiche, ou l'aperçu d'une proposition en attente. */
const mediaOf = (entry: IListEntry): IMedia =>
  entry.media ?? { title: { original: entry.preview?.title || 'Titre inconnu' }, posterUrl: entry.preview?.coverImage ?? null };

/**
 * Ma liste, transposée de `Actunime-Web/src/routes/_authenticated/suivi/animes.tsx` et `mangas.tsx` (téléphone) :
 * en-tête et disposition, bande de statuts, barre de filtres, sections par statut, cartes avec bande de gestion,
 * tiroir de modification rapide.
 */
export default function MyListScreen() {
  const [kind, setKind] = useState<MediaKind>('anime');
  const mediaType = kind === 'anime' ? 'Anime' : 'Manga';
  const [status, setStatus] = useState<ListStatusFilter>('ALL');
  const [query, setQuery] = useState<IListQuery>({});
  const [sort, setSort] = useState<IListSort>({});
  const [viewMode, setViewMode] = useViewMode();
  const [sheetId, setSheetId] = useState<string | null>(null);

  const list = useMyEntries(mediaType);
  const patch = usePatchEntry();
  const all = useMemo(() => list.data ?? [], [list.data]);

  const genreIds = useMemo(() => all.flatMap((e) => e.media?.genres ?? []), [all]);
  const genres = useMetadataNames(genreIds);
  const genresOf = (media?: IMedia | null) =>
    (media?.genres ?? []).map((id) => genres.data?.find((g) => String(g.id) === String(id))).filter((g): g is { id: string; name: string } => !!g);

  const counts = useMemo(() => countByStatus(all), [all]);
  const filtered = useMemo(() => filterListEntries(all, status, query, sort), [all, status, query, sort]);
  const sections = useMemo(() => groupListEntries(filtered, kind, status, query, sort, STATUS_LABELS), [filtered, kind, status, query, sort]);
  const items = useMemo(() => buildItems(sections, filtered, COLUMNS[viewMode]), [sections, filtered, viewMode]);
  const hasQuery = Object.keys(query).length > 0;

  const switchKind = (next: MediaKind) => {
    setKind(next);
    setStatus('ALL');
    setQuery({});
    setSort({});
  };

  const sheetEntry = sheetId ? all.find((e) => (e.id ?? e._id) === sheetId) ?? null : null;

  const renderCard = (entry: IListEntry) => {
    const media = mediaOf(entry);
    const pending = !entry.mediaId && !!entry.proposalId;
    const rejected = entry.listEntryStatus === 'REJECTED';
    const manageable = !!entry.media && !!entry.mediaId;
    const id = (entry.id ?? entry._id) as string;
    const open = entry.mediaId ? () => openMedia(kind, entry.mediaId as string) : undefined;
    const edit = () => setSheetId(id);
    const footer = pending ? (
      <View style={[styles.notice, styles.noticePending]}>
        <Clock size={14} color={Tw.color.blue500} />
        <Txt size="xs" weight="medium" color={Tw.color.blue500}>
          En attente de référencement
        </Txt>
      </View>
    ) : rejected ? (
      <View style={[styles.notice, styles.noticeRejected]}>
        <CircleX size={14} color={Tw.color.destructive} />
        <Txt size="xs" weight="medium" color={Tw.color.destructive}>
          Proposition rejetée
        </Txt>
      </View>
    ) : undefined;

    if (viewMode === 'grid' || viewMode === 'dense') {
      return <MediaGridCard kind={kind} media={media} entry={entry} onPress={manageable ? edit : open} dense={viewMode === 'dense'} />;
    }
    if (viewMode === 'rows') {
      return (
        <MediaRowCard
          kind={kind}
          media={media}
          entry={entry}
          onPress={open}
          action={manageable ? <CardActionButton icon="edit" label="Gérer dans ma liste" onPress={edit} /> : undefined}
        />
      );
    }
    return (
      <MediaDetailedCard
        kind={kind}
        media={media}
        entry={entry}
        manage={manageable}
        onPress={manageable ? undefined : open}
        onListChange={manageable ? (p) => patch.mutate({ entry, patch: p }) : undefined}
        onListEdit={manageable ? edit : undefined}
        footer={footer}
      />
    );
  };

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Txt size="lg" weight="semibold">
          Ma liste
        </Txt>
        <ListViewSwitcher value={viewMode} onChange={setViewMode} />
      </View>
      <KindSwitch
        options={[
          { value: 'anime', label: 'Animes' },
          { value: 'manga', label: 'Mangas' },
        ]}
        value={kind}
        onChange={switchKind}
      />
      <ListStatusStrip statuses={kind === 'anime' ? ANIME_STATUSES : MANGA_STATUSES} counts={counts} value={status} onChange={setStatus} />
      <FilterBar
        key={kind}
        kind={kind}
        query={query}
        onQueryChange={setQuery}
        sort={sort}
        onSortChange={setSort}
        sortFields={LIST_SORT_FIELDS[kind]}
        sortLabels={LIST_SORT_LABELS}
      />
    </View>
  );

  return (
    <Screen>
      {list.isPending ? (
        <>
          {header}
          <Loading />
        </>
      ) : list.isError ? (
        <>
          {header}
          <ErrorState error={list.error} onRetry={() => list.refetch()} />
        </>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.key}
          ListHeaderComponent={header}
          contentContainerStyle={styles.content}
          initialNumToRender={8}
          windowSize={7}
          refreshControl={<RefreshControl refreshing={list.isRefetching} onRefresh={() => list.refetch()} tintColor={Tw.color.primary} colors={[Tw.color.primary]} progressBackgroundColor={Tw.color.card} />}
          renderItem={({ item }) =>
            item.type === 'section' ? (
              <View style={[styles.sectionTitle, !item.first && styles.sectionSpacing]}>
                <Txt size="sm" weight="semibold" upper tracking={0.7} color={Tw.color.mutedForeground}>
                  {item.label}
                </Txt>
                <Txt size="xs" color={Tw.color.mutedForeground} style={styles.sectionCount}>
                  ({item.count})
                </Txt>
              </View>
            ) : (
              <View style={[styles.row, { gap: GAP[viewMode], marginBottom: GAP[viewMode] }]}>
                {item.entries.map((entry) => (
                  <View key={(entry.id ?? entry._id) as string} style={styles.cell}>
                    {renderCard(entry)}
                  </View>
                ))}
                {Array.from({ length: COLUMNS[viewMode] - item.entries.length }, (_, i) => (
                  <View key={`pad-${i}`} style={styles.cell} />
                ))}
              </View>
            )
          }
          ListEmptyComponent={
            <Txt size="base" color={Tw.color.mutedForeground} style={styles.empty}>
              {hasQuery ? 'Aucun résultat pour ces filtres.' : `Aucun ${kind} dans cette catégorie.`}
            </Txt>
          }
        />
      )}

      <ManageEntry
        kind={kind}
        media={sheetEntry?.media ?? null}
        entry={sheetEntry}
        open={!!sheetEntry}
        onClose={() => setSheetId(null)}
        genres={genresOf(sheetEntry?.media).map((g) => g.name)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 4, paddingBottom: 24 },
  header: { gap: 12, paddingTop: 8, paddingBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  sectionTitle: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 12 },
  sectionSpacing: { marginTop: 20 },
  sectionCount: { marginLeft: 8, opacity: 0.7 },
  row: { flexDirection: 'row' },
  cell: { flex: 1, minWidth: 0 },
  empty: { paddingVertical: 48, textAlign: 'center' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Tw.radius.sm, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  noticePending: { borderColor: alpha(Tw.color.blue500, 0.4), backgroundColor: alpha(Tw.color.blue500, 0.1) },
  noticeRejected: { borderColor: alpha(Tw.color.destructive, 0.4), backgroundColor: alpha(Tw.color.destructive, 0.1) },
});
