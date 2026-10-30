import {
  ArrowLeft,
  ArrowUpDown,
  Ban,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Txt } from '@/components/tw';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Fonts, Tw, alpha } from '@/constants/theme';
import { useDebounced } from '@/hooks/use-debounced';
import type { MediaKind } from '@/lib/api';
import {
  FACETS,
  MEDIA_SEASONS,
  SEASON_LABELS,
  activeFilterCount,
  activeSortCount,
  cleanQuery,
  cycleFacet,
  cycleSort,
  facetToQueryPatch,
  readFacet,
  seasonOfDate,
  type FacetKey,
  type IListQuery,
  type IListSort,
  type MediaSeason,
} from '@/lib/list-filter';
import { MEDIA_STATUS_LABELS } from '@/lib/list-form';
import { ANIME_FORMAT_LABELS, MANGA_FORMAT_LABELS } from '@/lib/media';
import { useMetadataList } from '@/lib/queries';

interface IFilterBarProps {
  kind: MediaKind;
  query: IListQuery;
  onQueryChange: (query: IListQuery) => void;
  sort: IListSort;
  onSortChange: (sort: IListSort) => void;
  sortFields: string[];
  sortLabels: Record<string, string>;
}

const FIRST_YEAR = 1960;

/**
 * Barre de filtres du téléphone (`FilterBarBase` + `FilterBarMedia` du site) : recherche « par titre et surnom »,
 * « Trier » et « Filtres » côte à côte, puces des filtres actifs retirables. Les deux boutons ouvrent un tiroir.
 */
export function FilterBar({ kind, query, onQueryChange, sort, onSortChange, sortFields, sortLabels }: Readonly<IFilterBarProps>) {
  const [text, setText] = useState(typeof query.search === 'string' ? query.search : '');
  const search = useDebounced(text.trim(), 400);
  const [sortOpen, setSortOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    if ((query.search ?? '') !== search) onQueryChange(cleanQuery({ ...query, search }));
    // `query` suit la saisie : seule la recherche différée déclenche la mise à jour.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const setFields = (patch: IListQuery) => onQueryChange(cleanQuery({ ...query, ...patch }));
  const filterCount = activeFilterCount(query);
  const sortCount = activeSortCount(sort);
  const badges = useActiveBadges(kind, query, setFields);
  const reset = () => {
    setText('');
    onQueryChange({});
  };

  return (
    <View style={styles.bar}>
      <View style={styles.searchBox}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Rechercher par titre et surnom"
          placeholderTextColor={Tw.color.mutedForeground}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          style={styles.searchInput}
        />
        {text ? (
          <Pressable accessibilityLabel="Effacer la recherche" hitSlop={8} onPress={() => setText('')}>
            <X size={16} color={Tw.color.mutedForeground} />
          </Pressable>
        ) : (
          <Search size={16} color={Tw.color.mutedForeground} />
        )}
      </View>
      <View style={styles.row}>
        <Pressable accessibilityRole="button" onPress={() => setSortOpen(true)} style={[styles.button, styles.sortButton]}>
          <ArrowUpDown size={16} color={Tw.color.foreground} />
          <Txt size="sm" weight="medium">
            Trier
          </Txt>
          {sortCount > 0 ? <CountBubble value={sortCount} /> : null}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => setFiltersOpen(true)}
          style={[styles.button, styles.filterButton, filterCount > 0 && styles.filterButtonActive]}
        >
          <SlidersHorizontal size={16} color={filterCount > 0 ? Tw.color.primary : Tw.color.foreground} />
          <Txt size="sm" weight="medium" color={filterCount > 0 ? Tw.color.primary : Tw.color.foreground}>
            Filtres
          </Txt>
          {filterCount > 0 ? <CountBubble value={filterCount} /> : null}
        </Pressable>
        {badges.length > 0 || filterCount > 0 ? (
          <Pressable accessibilityLabel="Réinitialiser les filtres" onPress={reset} style={styles.iconButton}>
            <RotateCcw size={16} color={Tw.color.foreground} />
          </Pressable>
        ) : null}
      </View>
      {badges.length > 0 ? (
        <View style={styles.badges}>
          {badges.map((badge) => (
            <View
              key={badge.id}
              style={[styles.badge, badge.exclude ? styles.badgeExclude : styles.badgeInclude]}
            >
              <Txt size="xs" weight="medium" numberOfLines={1} color={badge.exclude ? Tw.color.destructive : Tw.color.primary} style={styles.badgeLabel}>
                {badge.label}
              </Txt>
              <Pressable accessibilityLabel={`Retirer ${badge.label}`} hitSlop={8} onPress={badge.onRemove}>
                <X size={12} color={badge.exclude ? Tw.color.destructive : Tw.color.primary} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <SortSheet
        open={sortOpen}
        onClose={() => setSortOpen(false)}
        sort={sort}
        onSortChange={onSortChange}
        fields={sortFields}
        labels={sortLabels}
      />
      <FiltersSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        kind={kind}
        query={query}
        setFields={setFields}
        onReset={() => onQueryChange(cleanQuery({ search: query.search }))}
      />
    </View>
  );
}

function CountBubble({ value }: Readonly<{ value: number }>) {
  return (
    <View style={styles.bubble}>
      <Txt size="xs" weight="semibold" color={Tw.color.primaryForeground} style={styles.bubbleText}>
        {value}
      </Txt>
    </View>
  );
}

const formatLabels = (kind: MediaKind) => (kind === 'anime' ? ANIME_FORMAT_LABELS : MANGA_FORMAT_LABELS);

interface IBadge {
  id: string;
  label: string;
  exclude?: boolean;
  onRemove: () => void;
}

/** Puces des filtres actifs (format, saison, statut, facettes), retirables d'un appui. */
function useActiveBadges(kind: MediaKind, query: IListQuery, setFields: (patch: IListQuery) => void): IBadge[] {
  const genres = useMetadataList('GENRE');
  const themes = useMetadataList('THEME');
  const demographics = useMetadataList('DEMOGRAPHIC');
  const tags = useMetadataList('TAG');
  const names: Record<FacetKey, { id: string; name: string }[] | undefined> = {
    genres: genres.data,
    themes: themes.data,
    demographics: demographics.data,
    tags: tags.data,
  };
  const badges: IBadge[] = [];
  if (query.format) {
    badges.push({ id: 'format', label: formatLabels(kind)[String(query.format)] ?? String(query.format), onRemove: () => setFields({ format: undefined }) });
  }
  if (query.season || query.year) {
    const season = query.season ? SEASON_LABELS[query.season as MediaSeason] : null;
    badges.push({
      id: 'season',
      label: season && query.year ? `${season} ${query.year}` : season ? `${season} (toutes années)` : String(query.year),
      onRemove: () => setFields({ season: undefined, year: undefined }),
    });
  }
  if (query.status) {
    badges.push({ id: 'status', label: MEDIA_STATUS_LABELS[String(query.status)] ?? String(query.status), onRemove: () => setFields({ status: undefined }) });
  }
  for (const facet of FACETS) {
    const value = readFacet(query, facet.key);
    const labelOf = (id: string) => names[facet.key]?.find((m) => String(m.id) === id)?.name ?? id;
    const and = value.mode === 'all' && value.include.length > 1 ? ' (ET)' : '';
    for (const id of value.include) {
      badges.push({
        id: `${facet.key}:${id}`,
        label: `${labelOf(id)}${and}`,
        onRemove: () => setFields(facetToQueryPatch(facet.key, { ...value, include: value.include.filter((v) => v !== id) })),
      });
    }
    for (const id of value.exclude) {
      badges.push({
        id: `${facet.key}:exclude:${id}`,
        label: `Sans ${labelOf(id)}`,
        exclude: true,
        onRemove: () => setFields(facetToQueryPatch(facet.key, { ...value, exclude: value.exclude.filter((v) => v !== id) })),
      });
    }
  }
  return badges;
}

/** Tiroir « Trier par » (`SortPopover` en mode téléphone) : un appui = décroissant, croissant, retiré. */
function SortSheet({
  open,
  onClose,
  sort,
  onSortChange,
  fields,
  labels,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  sort: IListSort;
  onSortChange: (sort: IListSort) => void;
  fields: string[];
  labels: Record<string, string>;
}>) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Trier par"
      footer={<PrimaryButton label="Fermer" onPress={onClose} />}
    >
      <View style={styles.sortList}>
        {fields.map((field) => {
          const dir = sort[field];
          return (
            <Pressable
              key={field}
              accessibilityRole="button"
              accessibilityLabel={`${labels[field]}${dir ? (dir === 'asc' ? ', croissant' : ', décroissant') : ''}`}
              onPress={() => onSortChange(cycleSort(sort, field))}
              style={({ pressed }) => [styles.sortItem, pressed && { backgroundColor: alpha(Tw.color.muted, 0.5) }]}
            >
              <Txt size="sm" weight={dir ? 'medium' : 'medium'} color={dir ? Tw.color.foreground : Tw.color.mutedForeground}>
                {labels[field]}
              </Txt>
              <View style={styles.sortDir}>
                <ChevronUp size={14} color={Tw.color.foreground} style={{ opacity: dir === 'asc' ? 1 : 0 }} />
                <View style={[styles.sortDot, { backgroundColor: !dir ? Tw.color.foreground : alpha(Tw.color.mutedForeground, 0.25) }]} />
                <ChevronDown size={14} color={Tw.color.foreground} style={{ opacity: dir === 'desc' ? 1 : 0 }} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}

function PrimaryButton({ label, onPress, outline, disabled }: Readonly<{ label: string; onPress: () => void; outline?: boolean; disabled?: boolean }>) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.footerButton, outline ? styles.footerOutline : styles.footerPrimary, disabled && { opacity: 0.5 }]}
    >
      <Txt size="sm" weight="medium" color={outline ? Tw.color.foreground : Tw.color.primaryForeground}>
        {label}
      </Txt>
    </Pressable>
  );
}

type PanelId = 'format' | FacetKey | 'season' | 'status';

/**
 * Tiroir « Filtres » (`FilterBarBase`, téléphone) : la liste des filtres, puis le détail de celui qu'on touche,
 * avec « Valider » / « Voir les résultats (N) ».
 */
function FiltersSheet({
  open,
  onClose,
  kind,
  query,
  setFields,
  onReset,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  kind: MediaKind;
  query: IListQuery;
  setFields: (patch: IListQuery) => void;
  onReset: () => void;
}>) {
  const [panel, setPanel] = useState<PanelId | null>(null);
  const total = activeFilterCount(query);
  const close = () => {
    setPanel(null);
    onClose();
  };

  const chips: { id: PanelId; label: string; count: number }[] = [
    { id: 'format', label: 'Format', count: query.format ? 1 : 0 },
    ...FACETS.map((facet) => {
      const value = readFacet(query, facet.key);
      return { id: facet.key as PanelId, label: facet.label, count: value.include.length + value.exclude.length };
    }),
    ...(kind === 'anime' ? [{ id: 'season' as PanelId, label: 'Saison', count: query.season || query.year ? 1 : 0 }] : []),
    { id: 'status', label: 'Statut', count: query.status ? 1 : 0 },
  ];
  const active = chips.find((chip) => chip.id === panel);

  return (
    <BottomSheet
      open={open}
      onClose={close}
      minHeight={0.55}
      maxHeight={0.85}
      header={
        <View style={styles.filtersHeader}>
          {active ? (
            <Pressable accessibilityLabel="Retour aux filtres" onPress={() => setPanel(null)} style={styles.iconButton}>
              <ArrowLeft size={16} color={Tw.color.foreground} />
            </Pressable>
          ) : null}
          <Txt size="base" weight="medium" style={styles.flex}>
            {active ? active.label : 'Filtres'}
          </Txt>
        </View>
      }
      footer={
        <>
          {!active ? <PrimaryButton label="Réinitialiser" outline disabled={total === 0} onPress={onReset} /> : null}
          <PrimaryButton
            label={active ? 'Valider' : total > 0 ? `Voir les résultats (${total})` : 'Fermer'}
            onPress={() => (active ? setPanel(null) : close())}
          />
        </>
      }
    >
      <ScrollView contentContainerStyle={styles.panel} keyboardShouldPersistTaps="handled">
        {!active ? (
          chips.map((chip) => (
            <Pressable
              key={chip.id}
              accessibilityRole="button"
              onPress={() => setPanel(chip.id)}
              style={({ pressed }) => [styles.chipRow, pressed && { backgroundColor: alpha(Tw.color.muted, 0.5) }]}
            >
              <Txt size="sm" weight="medium" style={styles.flex}>
                {chip.label}
              </Txt>
              {chip.count > 0 ? <CountBubble value={chip.count} /> : null}
              <ChevronRight size={16} color={Tw.color.mutedForeground} />
            </Pressable>
          ))
        ) : panel === 'format' ? (
          <OptionList
            options={Object.entries(formatLabels(kind)).map(([value, label]) => ({ value, label }))}
            value={query.format ? String(query.format) : undefined}
            onChange={(format) => setFields({ format })}
          />
        ) : panel === 'status' ? (
          <OptionList
            options={Object.entries(MEDIA_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
            value={query.status ? String(query.status) : undefined}
            onChange={(status) => setFields({ status })}
          />
        ) : panel === 'season' ? (
          <SeasonPanel query={query} setFields={setFields} />
        ) : panel ? (
          <FacetPanel facet={panel} query={query} setFields={setFields} />
        ) : null}
      </ScrollView>
    </BottomSheet>
  );
}

/** Liste à choix unique avec recherche (`FormCombobox listOnly`). */
function OptionList({
  options,
  value,
  onChange,
}: Readonly<{ options: { value: string; label: string }[]; value?: string; onChange: (value: string | undefined) => void }>) {
  const [filter, setFilter] = useState('');
  const shown = options.filter((o) => o.label.toLowerCase().includes(filter.trim().toLowerCase()));
  return (
    <View style={styles.optionList}>
      <SearchField value={filter} onChange={setFilter} />
      {shown.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => onChange(selected ? undefined : option.value)}
            style={({ pressed }) => [styles.option, pressed && { backgroundColor: alpha(Tw.color.muted, 0.5) }]}
          >
            <Txt size="sm" style={styles.flex}>
              {option.label}
            </Txt>
            {selected ? <Check size={16} color={Tw.color.primary} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function SearchField({ value, onChange, placeholder = 'Rechercher...' }: Readonly<{ value: string; onChange: (v: string) => void; placeholder?: string }>) {
  return (
    <View style={styles.commandInput}>
      <Search size={16} color={Tw.color.mutedForeground} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Tw.color.mutedForeground}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.commandText}
      />
    </View>
  );
}

const FACET_TYPES: Record<FacetKey, string> = { genres: 'GENRE', themes: 'THEME', demographics: 'DEMOGRAPHIC', tags: 'TAG' };
const FACET_PLACEHOLDER: Record<FacetKey, string> = {
  genres: 'Rechercher un genre...',
  themes: 'Rechercher un thème...',
  demographics: 'Rechercher une démographique...',
  tags: 'Rechercher un tag...',
};

/** Facette (`FacetFilter listOnly`) : OU / ET, puis chaque valeur passe de neutre à retenue, exclue, neutre. */
function FacetPanel({ facet, query, setFields }: Readonly<{ facet: FacetKey; query: IListQuery; setFields: (patch: IListQuery) => void }>) {
  const list = useMetadataList(FACET_TYPES[facet]);
  const value = readFacet(query, facet);
  const [filter, setFilter] = useState('');
  const items = useMemo(
    () => (list.data ?? []).filter((m) => m.name.toLowerCase().includes(filter.trim().toLowerCase())),
    [list.data, filter],
  );
  const set = (next: typeof value) => setFields(facetToQueryPatch(facet, next));
  return (
    <View style={styles.optionList}>
      <View style={styles.facetModeRow}>
        <View style={styles.facetModes}>
          {(['any', 'all'] as const).map((mode) => {
            const selected = value.mode === mode;
            return (
              <Pressable
                key={mode}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => set({ ...value, mode })}
                style={[styles.facetMode, selected && styles.facetModeActive]}
              >
                <Txt size="xs" weight="medium" color={selected ? Tw.color.foreground : Tw.color.mutedForeground}>
                  {mode === 'any' ? 'Au moins un' : 'Tous'}{' '}
                  <Txt size="xs" weight="medium" color={selected ? Tw.color.foreground : Tw.color.mutedForeground} style={{ opacity: 0.6 }}>
                    ({mode === 'any' ? 'OU' : 'ET'})
                  </Txt>
                </Txt>
              </Pressable>
            );
          })}
        </View>
        {value.include.length + value.exclude.length > 0 ? (
          <Pressable accessibilityLabel="Effacer" onPress={() => set({ include: [], exclude: [], mode: value.mode })} style={styles.iconButton}>
            <Trash2 size={16} color={Tw.color.foreground} />
          </Pressable>
        ) : null}
      </View>
      <Txt size="xs" color={Tw.color.mutedForeground} style={styles.facetHint}>
        Plusieurs appuis pour ajouter, exclure et annuler
      </Txt>
      <SearchField value={filter} onChange={setFilter} placeholder={FACET_PLACEHOLDER[facet]} />
      {items.map((item) => {
        const id = String(item.id);
        const included = value.include.includes(id);
        const excluded = value.exclude.includes(id);
        return (
          <Pressable
            key={id}
            accessibilityLabel={`${item.name} : ${included ? 'retenu' : excluded ? 'exclu' : 'neutre'}`}
            onPress={() => set(cycleFacet(value, id))}
            style={({ pressed }) => [styles.option, pressed && { backgroundColor: alpha(Tw.color.muted, 0.5) }]}
          >
            <Txt
              size="sm"
              color={excluded ? Tw.color.destructive : Tw.color.foreground}
              style={[styles.flex, excluded && { textDecorationLine: 'line-through' }]}
            >
              {item.name}
            </Txt>
            {included ? <Check size={16} color={Tw.color.primary} /> : null}
            {excluded ? <Ban size={16} color={Tw.color.destructive} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Saison + année (`SeasonYearFilter listOnly`) : raccourcis, quatre saisons, année. */
function SeasonPanel({ query, setFields }: Readonly<{ query: IListQuery; setFields: (patch: IListQuery) => void }>) {
  const today = new Date();
  const current = { season: seasonOfDate(today), year: today.getFullYear() };
  const shift = (offset: number) => {
    const index = MEDIA_SEASONS.indexOf(current.season) + current.year * 4 + offset;
    return { season: MEDIA_SEASONS[((index % 4) + 4) % 4]!, year: Math.floor(index / 4) };
  };
  const presets = [
    { label: 'Saison précédente', value: shift(-1) },
    { label: 'Saison en cours', value: current },
    { label: 'Prochaine saison', value: shift(1) },
  ];
  const season = query.season as MediaSeason | undefined;
  const year = query.year ? Number(query.year) : undefined;
  const isActive = (p: { season: MediaSeason; year: number }) => season === p.season && year === p.year;
  const years = Array.from({ length: today.getFullYear() + 2 - FIRST_YEAR }, (_, i) => today.getFullYear() + 1 - i);

  return (
    <View style={styles.seasonPanel}>
      <View style={styles.wrap}>
        {presets.map((preset) => {
          const on = isActive(preset.value);
          return (
            <Pressable
              key={preset.label}
              onPress={() => setFields(on ? { season: undefined, year: undefined } : { season: preset.value.season, year: preset.value.year })}
              style={[styles.smallButton, on ? styles.smallButtonOn : styles.smallButtonOff]}
            >
              <Txt size="xs" weight="medium" color={on ? Tw.color.primaryForeground : Tw.color.foreground}>
                {preset.label}
              </Txt>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.seasonGrid}>
        {MEDIA_SEASONS.map((value) => {
          const on = season === value;
          return (
            <Pressable
              key={value}
              accessibilityState={{ selected: on }}
              onPress={() => setFields({ season: on ? undefined : value })}
              style={[styles.seasonCell, on ? styles.seasonOn : styles.seasonOff]}
            >
              <Txt size="sm" weight="medium" color={on ? Tw.color.primary : Tw.color.mutedForeground}>
                {SEASON_LABELS[value]}
              </Txt>
            </Pressable>
          );
        })}
      </View>
      <Txt size="sm" color={Tw.color.mutedForeground}>
        Année
      </Txt>
      <View style={styles.yearGrid}>
        {[undefined, ...years].map((value) => {
          const on = year === value;
          return (
            <Pressable
              key={value ?? 'all'}
              onPress={() => setFields({ year: value })}
              style={[styles.yearCell, on ? styles.seasonOn : styles.seasonOff]}
            >
              <Txt size="sm" weight="medium" tabular color={on ? Tw.color.primary : Tw.color.mutedForeground}>
                {value ?? 'Toutes'}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bar: { gap: 8, padding: 8, backgroundColor: Tw.color.secondary, borderRadius: Tw.radius.lg },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingRight: 8,
    gap: 8,
    backgroundColor: Tw.color.input,
    borderRadius: Tw.radius.lg,
    borderWidth: 1,
    borderColor: Tw.color.input,
  },
  searchInput: { flex: 1, height: 44, paddingVertical: 0, paddingHorizontal: 10, color: Tw.color.foreground, fontFamily: Fonts.regular, fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  button: { flex: 1, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12 },
  sortButton: { backgroundColor: Tw.color.input, borderRadius: Tw.radius.lg },
  filterButton: { borderRadius: Tw.radius.md, borderWidth: 1, borderColor: Tw.color.input, backgroundColor: Tw.color.background },
  filterButtonActive: { borderColor: alpha(Tw.color.primary, 0.5), backgroundColor: alpha(Tw.color.primary, 0.05) },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Tw.radius.lg },
  bubble: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: Tw.color.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  bubbleText: { lineHeight: 14 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 28, paddingLeft: 10, paddingRight: 6, borderRadius: 14, borderWidth: 1, maxWidth: '100%' },
  badgeInclude: { backgroundColor: alpha(Tw.color.primary, 0.1), borderColor: alpha(Tw.color.primary, 0.2) },
  badgeExclude: { backgroundColor: alpha(Tw.color.destructive, 0.1), borderColor: alpha(Tw.color.destructive, 0.2) },
  badgeLabel: { flexShrink: 1 },
  sortList: { paddingHorizontal: 8, paddingBottom: 8, gap: 4 },
  sortItem: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingHorizontal: 10, borderRadius: Tw.radius.lg },
  sortDir: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  sortDot: { width: 4, height: 4, borderRadius: 2 },
  footerButton: { flex: 1, height: 44, borderRadius: Tw.radius.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  footerPrimary: { backgroundColor: Tw.color.primary, borderColor: 'transparent' },
  footerOutline: { backgroundColor: alpha(Tw.color.input, 0.3), borderColor: Tw.color.input },
  filtersHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16 },
  panel: { paddingHorizontal: 8, paddingBottom: 8 },
  chipRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: Tw.radius.md },
  optionList: { gap: 2 },
  option: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, borderRadius: Tw.radius.sm },
  commandInput: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 8, marginBottom: 4, borderBottomWidth: 1, borderColor: Tw.color.border },
  commandText: { flex: 1, height: 44, paddingVertical: 0, color: Tw.color.foreground, fontFamily: Fonts.regular, fontSize: 14 },
  facetModeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  facetModes: { flex: 1, flexDirection: 'row', borderRadius: Tw.radius.md, backgroundColor: Tw.color.muted, padding: 2 },
  facetMode: { flex: 1, alignItems: 'center', borderRadius: Tw.radius.sm, paddingHorizontal: 8, paddingVertical: 4 },
  facetModeActive: { backgroundColor: Tw.color.background },
  facetHint: { paddingHorizontal: 4, paddingVertical: 4 },
  seasonPanel: { gap: 12, paddingHorizontal: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  smallButton: { height: 28, paddingHorizontal: 10, borderRadius: Tw.radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  smallButtonOn: { backgroundColor: Tw.color.primary, borderColor: 'transparent' },
  smallButtonOff: { backgroundColor: alpha(Tw.color.input, 0.3), borderColor: Tw.color.input },
  seasonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  seasonCell: { width: '48.5%', height: 44, borderRadius: Tw.radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  seasonOn: { borderColor: Tw.color.primary, backgroundColor: alpha(Tw.color.primary, 0.1) },
  seasonOff: { borderColor: Tw.color.input },
  yearGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  yearCell: { width: '23.5%', height: 44, borderRadius: Tw.radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
