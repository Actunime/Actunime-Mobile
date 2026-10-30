import { Grid2x2, Grid3x3, LayoutList, List, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/tw';
import { Tw } from '@/constants/theme';
import type { ListStatus } from '@/lib/api';
import type { ListStatusFilter } from '@/lib/list-filter';
import { STATUS_LABELS } from '@/lib/list-form';
import { ALL_STATUS_META, LIST_STATUS_META } from '@/lib/list-status';

export type ViewMode = 'grid' | 'dense' | 'list' | 'rows';

export const VIEW_MODE_OPTIONS: { value: ViewMode; label: string; icon: LucideIcon }[] = [
  { value: 'grid', label: 'Grille', icon: Grid2x2 },
  { value: 'dense', label: 'Grille compacte', icon: Grid3x3 },
  { value: 'list', label: 'Liste détaillée', icon: LayoutList },
  { value: 'rows', label: 'Liste compacte', icon: List },
];

/** Choix de la disposition (`ListViewSwitcher` du site) : quatre boutons `size-8` dans un cadre `rounded-md border`. */
export function ListViewSwitcher({ value, onChange }: Readonly<{ value: ViewMode; onChange: (mode: ViewMode) => void }>) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Disposition de la liste" style={styles.switcher}>
      {VIEW_MODE_OPTIONS.map(({ value: mode, label, icon: Icon }, index) => {
        const active = value === mode;
        return (
          <Pressable
            key={mode}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            accessibilityLabel={label}
            onPress={() => onChange(mode)}
            style={[
              styles.switchButton,
              index === 0 && styles.first,
              index === VIEW_MODE_OPTIONS.length - 1 && styles.last,
              active && { backgroundColor: Tw.color.primaryFill },
            ]}
          >
            <Icon size={16} color={active ? Tw.color.primaryForeground : Tw.color.mutedForeground} />
          </Pressable>
        );
      })}
    </View>
  );
}

/** Bascule « Animes | Mangas » (`MemberListKindSwitch` du site) : `rounded-lg bg-muted p-0.5`. */
export function KindSwitch<T extends string>({
  options,
  value,
  onChange,
}: Readonly<{ options: { value: T; label: string }[]; value: T; onChange: (value: T) => void }>) {
  return (
    <View accessibilityRole="radiogroup" style={styles.kind}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            onPress={() => onChange(option.value)}
            style={[styles.kindButton, active && styles.kindActive]}
          >
            <Txt size="sm" weight="medium" color={active ? Tw.color.foreground : Tw.color.mutedForeground}>
              {option.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Bande de statuts du téléphone (`ListStatusStrip`) : une case par catégorie (icône + nombre), rien ne défile de
 * côté, le nom de la catégorie active dessous.
 */
export function ListStatusStrip({
  statuses,
  counts,
  value,
  onChange,
}: Readonly<{
  statuses: ListStatus[];
  counts: Record<string, number>;
  value: ListStatusFilter;
  onChange: (value: ListStatusFilter) => void;
}>) {
  const items = [
    { key: 'ALL' as ListStatusFilter, label: 'Tous', Icon: ALL_STATUS_META.icon, color: ALL_STATUS_META.color },
    ...statuses.map((status) => ({
      key: status as ListStatusFilter,
      label: STATUS_LABELS[status],
      Icon: LIST_STATUS_META[status].icon,
      color: LIST_STATUS_META[status].color,
    })),
  ];
  const active = items.find((item) => item.key === value);

  return (
    <View style={styles.stripWrap}>
      <View accessibilityRole="radiogroup" accessibilityLabel="Catégorie de la liste" style={styles.strip}>
        {items.map(({ key, label, Icon, color }) => {
          const selected = value === key;
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${label}, ${counts[key] ?? 0}`}
              onPress={() => onChange(key)}
              style={[styles.stripItem, selected && styles.stripItemActive]}
            >
              <Icon size={18} color={selected ? color : Tw.color.mutedForeground} />
              <Txt size="xs" weight="semibold" tabular color={selected ? color : Tw.color.foreground}>
                {counts[key] ?? 0}
              </Txt>
            </Pressable>
          );
        })}
      </View>
      {active ? (
        <View style={styles.stripLabel}>
          <Txt size="sm" weight="semibold">
            {active.key === 'ALL' ? 'Tous les titres' : active.label}
          </Txt>
          <Txt size="xs" color={Tw.color.mutedForeground}>
            {counts[active.key] ?? 0} titres
          </Txt>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  switcher: { flexDirection: 'row', alignItems: 'center', borderRadius: Tw.radius.md, borderWidth: 1, borderColor: Tw.color.border },
  switchButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  first: { borderTopLeftRadius: 5, borderBottomLeftRadius: 5 },
  last: { borderTopRightRadius: 5, borderBottomRightRadius: 5 },
  kind: { flexDirection: 'row', borderRadius: Tw.radius.lg, backgroundColor: Tw.color.muted, padding: 2 },
  kindButton: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Tw.radius.md, paddingHorizontal: 16 },
  kindActive: { backgroundColor: Tw.color.background, elevation: 1 },
  stripWrap: { gap: 6 },
  strip: { flexDirection: 'row', gap: 4 },
  stripItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    borderRadius: Tw.radius.xl,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingVertical: 8,
  },
  stripItemActive: { borderColor: Tw.color.border, backgroundColor: Tw.color.card },
  stripLabel: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
});
