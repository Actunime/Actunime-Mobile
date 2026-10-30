import { useLocalSearchParams } from 'expo-router';
import { Flame } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { CardActionButton, MediaDetailedCard, MediaGridCard, MediaRowCard } from '@/components/cards/media-cards';
import { FilterBar } from '@/components/list/filter-bar';
import { KindSwitch, ListViewSwitcher, type ViewMode } from '@/components/list/list-controls';
import { ManageEntry } from '@/components/list/manage-entry';
import { openMedia } from '@/components/media-row';
import { Screen } from '@/components/screen';
import { ErrorState } from '@/components/states';
import { Txt } from '@/components/tw';
import { Tw, alpha } from '@/constants/theme';
import { useViewMode } from '@/hooks/use-view-mode';
import { mediaId, type IListEntry, type IMedia, type MediaKind } from '@/lib/api';
import { DEFAULT_SEARCH_SORT, SEARCH_SORT_FIELDS, SEARCH_SORT_LABELS, type IListQuery, type IListSort } from '@/lib/list-filter';
import { useCatalogSearch, useMetadataNames, useMyEntries, usePatchEntry, useTrending } from '@/lib/queries';

const COLUMNS: Record<ViewMode, number> = { grid: 2, dense: 3, list: 1, rows: 1 };
const GAP: Record<ViewMode, number> = { grid: 12, dense: 8, list: 12, rows: 8 };
const PERIODS = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7 jours' },
  { value: '30d', label: '30 jours' },
] as const;
type Period = (typeof PERIODS)[number]['value'];

/**
 * Recherche, transposée des pages Animes / Mangas du site (`Actunime-Web/src/routes/animes/index.tsx`) : titre et
 * nombre de résultats, disposition, tendances, barre de filtres (« Trier », « Filtres ») et cartes détaillées
 * avec ma progression quand l'œuvre est dans ma liste.
 */
export default function SearchScreen() {
  const params = useLocalSearchParams<{ kind?: string }>();
  const [kind, setKind] = useState<MediaKind>('anime');
  // L'éventail de navigation ouvre la recherche sur animes ou mangas (`/search?kind=manga`).
  useEffect(() => {
    if (params.kind === 'anime' || params.kind === 'manga') setKind(params.kind);
  }, [params.kind]);
  const [query, setQuery] = useState<IListQuery>({});
  const [sort, setSort] = useState<IListSort>(DEFAULT_SEARCH_SORT);
  const [viewMode, setViewMode] = useViewMode();
  const [trending, setTrending] = useState<Period | null>(null);
  const [manageId, setManageId] = useState<string | null>(null);

  const search = useCatalogSearch(kind, { query, sort, limit: 20, onlyVerified: true });
  const trend = useTrending(kind, trending ?? '7d', trending !== null);
  const mine = useMyEntries(kind === 'anime' ? 'Anime' : 'Manga');
  const patch = usePatchEntry();

  const results = useMemo(
    () => (trending ? (trend.data ?? []) : (search.data?.pages.flatMap((page) => page.results) ?? [])),
    [trending, trend.data, search.data],
  );
  const total = trending ? trend.data?.length : search.data?.pages[0]?.total;
  const loading = trending ? trend.isPending : search.isPending;
  const error = trending ? trend.error : search.error;

  const entryOf = useMemo(() => {
    const byMedia = new Map<string, IListEntry>();
    for (const entry of mine.data ?? []) if (entry.mediaId) byMedia.set(entry.mediaId, entry);
    return (media: IMedia) => byMedia.get(mediaId(media)) ?? null;
  }, [mine.data]);

  const genreIds = useMemo(() => results.flatMap((m) => m.genres ?? []), [results]);
  const genres = useMetadataNames(genreIds);
  const genresOf = (media?: IMedia | null) =>
    (media?.genres ?? [])
      .map((id) => genres.data?.find((g) => String(g.id) === String(id)))
      .filter((g): g is { id: string; name: string } => !!g);

  const rows = useMemo(() => {
    const columns = COLUMNS[viewMode];
    const out: IMedia[][] = [];
    for (let i = 0; i < results.length; i += columns) out.push(results.slice(i, i + columns));
    return out;
  }, [results, viewMode]);

  const switchKind = (next: MediaKind) => {
    setKind(next);
    setQuery({});
    setSort(DEFAULT_SEARCH_SORT);
  };

  const manageMedia = manageId ? results.find((m) => mediaId(m) === manageId) ?? null : null;

  const renderCard = (media: IMedia) => {
    const id = mediaId(media);
    const entry = entryOf(media);
    const open = () => openMedia(kind, id);
    const manage = () => setManageId(id);
    const action = (
      <CardActionButton
        icon={entry ? 'edit' : 'add'}
        label={entry ? 'Modifier dans ma liste' : 'Ajouter à ma liste'}
        variant="secondary"
        onPress={manage}
      />
    );
    if (viewMode === 'grid' || viewMode === 'dense') {
      return <MediaGridCard kind={kind} media={media} entry={entry} onPress={open} dense={viewMode === 'dense'} />;
    }
    if (viewMode === 'rows') return <MediaRowCard kind={kind} media={media} entry={entry} onPress={open} action={action} />;
    return (
      <MediaDetailedCard
        kind={kind}
        media={media}
        entry={entry}
        onPress={open}
        genres={genresOf(media)}
        action={action}
        onListChange={entry ? (p) => patch.mutate({ entry, patch: p }) : undefined}
        onListEdit={entry ? manage : undefined}
      />
    );
  };

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <View style={styles.title}>
          <Txt size="2xl" weight="bold">
            {kind === 'anime' ? 'Animes' : 'Mangas'}
          </Txt>
          {!loading && total ? (
            <Txt size="sm" color={Tw.color.mutedForeground}>
              ({total} {trending ? 'tendances' : 'résultats'})
            </Txt>
          ) : null}
        </View>
        <View style={styles.tools}>
          <ListViewSwitcher value={viewMode} onChange={setViewMode} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tendances"
            accessibilityState={{ selected: trending !== null }}
            onPress={() => setTrending(trending ? null : '7d')}
            style={[styles.trend, trending ? styles.trendOn : styles.trendOff]}
          >
            <Flame size={14} color={trending ? '#fff' : Tw.color.mutedForeground} />
          </Pressable>
        </View>
      </View>
      <KindSwitch
        options={[
          { value: 'anime', label: 'Animes' },
          { value: 'manga', label: 'Mangas' },
        ]}
        value={kind}
        onChange={switchKind}
      />
      {trending ? (
        <View style={styles.periods}>
          {PERIODS.map((period) => {
            const on = trending === period.value;
            return (
              <Pressable key={period.value} onPress={() => setTrending(period.value)} style={[styles.period, on && styles.periodOn]}>
                <Txt size="xs" weight="medium" color={on ? Tw.color.foreground : Tw.color.mutedForeground}>
                  {period.label}
                </Txt>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <FilterBar
          key={kind}
          kind={kind}
          query={query}
          onQueryChange={setQuery}
          sort={sort}
          onSortChange={setSort}
          sortFields={SEARCH_SORT_FIELDS[kind]}
          sortLabels={SEARCH_SORT_LABELS}
        />
      )}
    </View>
  );

  return (
    <Screen>
      <FlatList
        data={loading || error ? [] : rows}
        keyExtractor={(row) => row.map(mediaId).join('-')}
        ListHeaderComponent={header}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={6}
        onEndReached={() => !trending && search.hasNextPage && !search.isFetchingNextPage && search.fetchNextPage()}
        onEndReachedThreshold={0.6}
        renderItem={({ item }) => (
          <View style={[styles.row, { gap: GAP[viewMode], marginBottom: GAP[viewMode] }]}>
            {item.map((media) => (
              <View key={mediaId(media)} style={styles.cell}>
                {renderCard(media)}
              </View>
            ))}
            {Array.from({ length: COLUMNS[viewMode] - item.length }, (_, i) => (
              <View key={`pad-${i}`} style={styles.cell} />
            ))}
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={Tw.color.primary} style={styles.loading} />
          ) : error ? (
            <ErrorState error={error} onRetry={() => (trending ? trend.refetch() : search.refetch())} />
          ) : (
            <Txt size="sm" color={Tw.color.mutedForeground} style={styles.empty}>
              {trending ? 'Aucune tendance pour cette période.' : kind === 'anime' ? 'Aucun anime trouvé' : 'Aucun manga trouvé'}
            </Txt>
          )
        }
        ListFooterComponent={search.isFetchingNextPage ? <ActivityIndicator color={Tw.color.primary} /> : null}
      />
      <ManageEntry
        kind={kind}
        media={manageMedia}
        entry={manageMedia ? entryOf(manageMedia) : null}
        open={!!manageMedia}
        onClose={() => setManageId(null)}
        genres={genresOf(manageMedia).map((g) => g.name)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 8, paddingBottom: 24 },
  header: { gap: 12, paddingVertical: 12, marginBottom: 16, borderBottomWidth: 1, borderColor: Tw.color.border },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 12, flexShrink: 1 },
  tools: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trend: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  trendOn: { backgroundColor: Tw.color.orange500, borderColor: Tw.color.orange500 },
  trendOff: { borderColor: Tw.color.border },
  periods: { flexDirection: 'row', alignSelf: 'flex-start', gap: 4, backgroundColor: alpha(Tw.color.muted, 0.5), borderRadius: Tw.radius.lg, padding: 2 },
  period: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Tw.radius.md },
  periodOn: { backgroundColor: Tw.color.background },
  row: { flexDirection: 'row' },
  cell: { flex: 1, minWidth: 0 },
  loading: { paddingVertical: 48 },
  empty: { paddingVertical: 32, textAlign: 'center' },
});
