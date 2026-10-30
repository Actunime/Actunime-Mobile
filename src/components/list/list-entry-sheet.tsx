import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { ArrowRight, ChevronUp, Globe, Heart, Lock, Minus, Plus, Trash2, Users } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Txt } from '@/components/tw';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Fonts, Tw, alpha } from '@/constants/theme';
import type { IListEntry, ListVisibility, MediaKind } from '@/lib/api';
import { ANIME_STATUSES, MANGA_STATUSES, VISIBILITY_LABELS, formatFrenchDate } from '@/lib/list-form';
import { LIST_STATUS_META } from '@/lib/list-status';
import type { IEntryPatch } from '@/lib/queries';

interface IListEntrySheetProps {
  open: boolean;
  onClose: () => void;
  entry: IListEntry | null;
  kind: MediaKind;
  title: string;
  posterUrl?: string | null;
  subtitle?: string;
  total?: number;
  available?: number;
  /** Format, diffusion, durée, premiers genres. */
  infoBadges?: string[];
  onViewEntity?: () => void;
  /** Chaque réglage est appliqué tout de suite : pas de bouton « Enregistrer ». */
  onChange: (patch: IEntryPatch) => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onRemove?: () => void;
}

const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const VISIBILITY_ICON = { PUBLIC: Globe, FRIENDS_ONLY: Users, PRIVATE: Lock } as const;
const VISIBILITY_HINT: Record<ListVisibility, string> = {
  PUBLIC: 'Visible par tout le monde.',
  FRIENDS_ONLY: 'Visible uniquement par tes amis.',
  PRIVATE: 'Visible par toi seul.',
};

function SectionTitle({ children, aside }: Readonly<{ children: React.ReactNode; aside?: React.ReactNode }>) {
  return (
    <View style={styles.sectionTitle}>
      <Txt size="xs" weight="semibold" upper tracking={0.6} color={Tw.color.mutedForeground}>
        {children}
      </Txt>
      {aside ? (
        <Txt size="11" weight="medium" color={Tw.color.mutedForeground}>
          {aside}
        </Txt>
      ) : null}
    </View>
  );
}

/** Date choisie au sélecteur natif, enregistrée au format `AAAA-MM-JJ` comme le champ `date` du site. */
function DateButton({ value, onChange, label }: Readonly<{ value?: string | null; onChange: (value: string | null) => void; label: string }>) {
  const open = () =>
    DateTimePickerAndroid.open({
      value: value ? new Date(value) : new Date(),
      mode: 'date',
      maximumDate: new Date(),
      onChange: (event, date) => {
        if (event.type !== 'set' || !date) return;
        const pad = (n: number) => String(n).padStart(2, '0');
        onChange(`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`);
      },
    });
  return (
    <View style={styles.dateField}>
      <Txt size="xs" color={Tw.color.mutedForeground}>
        {label}
      </Txt>
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={open} onLongPress={() => onChange(null)} style={styles.dateInput}>
        <Txt size="sm" color={value ? Tw.color.foreground : Tw.color.mutedForeground}>
          {value ? formatFrenchDate(value) : 'jj/mm/aaaa'}
        </Txt>
      </Pressable>
    </View>
  );
}

/**
 * Tiroir de gestion d'une entrée (`ListEntrySheet` → `QuickEditSheet` du site), à deux hauteurs. Replié : bloc de
 * l'œuvre, statut et progression ; tiré vers le haut : note, dates, revisionnages, notes, visibilité, retrait.
 * Chaque réglage s'applique tout de suite.
 */
export function ListEntrySheet({
  open,
  onClose,
  entry,
  kind,
  title,
  posterUrl,
  subtitle,
  total,
  available,
  infoBadges,
  onViewEntity,
  onChange,
  isFavorite,
  onToggleFavorite,
  onRemove,
}: Readonly<IListEntrySheetProps>) {
  const [expanded, setExpanded] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [notes, setNotes] = useState(entry?.notes ?? '');
  useEffect(() => {
    if (open) setConfirmRemove(false);
  }, [open]);
  useEffect(() => setNotes(entry?.notes ?? ''), [entry?.id, entry?.notes]);

  const statuses = kind === 'anime' ? ANIME_STATUSES : MANGA_STATUSES;
  const progress = (kind === 'anime' ? entry?.episodesWatched : entry?.chaptersRead) ?? 0;
  const unit = kind === 'anime' ? 'épisode' : 'chapitre';
  const setProgress = (value: number) => {
    const next = Math.max(0, total ? Math.min(total, value) : value);
    if (next === progress) return;
    Haptics.selectionAsync().catch(() => undefined);
    onChange({ progress: next, ...(total && next >= total && next > progress ? { status: 'COMPLETED' as const } : {}) });
  };
  const visibility: ListVisibility = entry?.visibility ?? 'PUBLIC';
  const notesPublic = !!entry?.notesPublic;

  const header = (
    <View style={styles.headerWrap}>
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <Pressable
            disabled={!onViewEntity}
            onPress={onViewEntity}
            accessibilityLabel={onViewEntity ? `Voir la fiche : ${title}` : undefined}
            style={styles.headerMain}
          >
            <View style={styles.thumb}>
              {posterUrl ? <Image source={{ uri: posterUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
            </View>
            <View style={styles.headerText}>
              <Txt size="base" weight="semibold" numberOfLines={2} leading={1.375}>
                {title}
              </Txt>
              {subtitle ? (
                <Txt size="xs" color={Tw.color.mutedForeground}>
                  {subtitle}
                </Txt>
              ) : null}
              {infoBadges?.length ? (
                <View style={styles.infoBadges}>
                  {infoBadges.slice(0, 5).map((label) => (
                    <View key={label} style={styles.infoBadge}>
                      <Txt size="10" weight="medium" color={Tw.color.mutedForeground} style={{ fontSize: 10.5 }}>
                        {label}
                      </Txt>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          </Pressable>
          {onToggleFavorite ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: !!isFavorite }}
              accessibilityLabel={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              onPress={onToggleFavorite}
              style={[styles.heart, isFavorite ? styles.heartOn : styles.heartOff]}
            >
              <Heart size={20} color={isFavorite ? Tw.color.rose400 : Tw.color.mutedForeground} fill={isFavorite ? Tw.color.rose400 : 'transparent'} />
            </Pressable>
          ) : null}
        </View>
        {onViewEntity ? (
          <Pressable accessibilityRole="button" onPress={onViewEntity} style={styles.viewButton}>
            <Txt size="sm" weight="semibold" color={Tw.color.primaryForeground}>
              Voir la fiche
            </Txt>
            <ArrowRight size={16} color={Tw.color.primaryForeground} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  return (
    <BottomSheet open={open} onClose={onClose} header={header} collapsedHeight={472} onExpandedChange={setExpanded}>
      {entry ? (
        <ScrollView scrollEnabled={expanded} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.section}>
            <SectionTitle>Statut</SectionTitle>
            <View style={styles.statusGrid}>
              {statuses.map((value) => {
                const meta = LIST_STATUS_META[value];
                const Icon = meta.icon;
                const active = entry.status === value;
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => onChange({ status: value })}
                    style={[styles.statusCell, active && { borderColor: meta.color, backgroundColor: Tw.color.muted }]}
                  >
                    <Icon size={18} color={active ? meta.color : Tw.color.mutedForeground} />
                    <Txt size="11" weight={active ? 'semibold' : 'normal'} color={active ? meta.color : Tw.color.mutedForeground} style={{ fontSize: 11.5 }}>
                      {meta.short}
                    </Txt>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <SectionTitle>Progression</SectionTitle>
            <View style={styles.stepper}>
              <Pressable accessibilityLabel={`Un ${unit} de moins`} onPress={() => setProgress(progress - 1)} style={styles.stepButton}>
                <Minus size={20} color={Tw.color.foreground} />
              </Pressable>
              <Txt size="2xl" weight="bold" tabular style={styles.stepValue}>
                {progress}
                {total ? (
                  <Txt size="sm" weight="medium" color={Tw.color.mutedForeground}>
                    {' '}/ {total}
                  </Txt>
                ) : null}
              </Txt>
              <Pressable accessibilityLabel={`Un ${unit} de plus`} onPress={() => setProgress(progress + 1)} style={styles.stepButton}>
                <Plus size={20} color={Tw.color.foreground} />
              </Pressable>
            </View>
            <View style={styles.shortcuts}>
              {available != null && available > 0 ? <Shortcut label={`Dernier sorti (${available})`} onPress={() => setProgress(available)} /> : null}
              {total ? <Shortcut label={`Tout ${kind === 'anime' ? 'vu' : 'lu'} (${total})`} onPress={() => setProgress(total)} /> : null}
              <Shortcut label="Remettre à 0" onPress={() => setProgress(0)} />
            </View>
          </View>

          {!expanded ? (
            <View style={styles.more}>
              <ChevronUp size={16} color={Tw.color.mutedForeground} />
              <Txt size="xs" color={Tw.color.mutedForeground}>
                Note, dates, revisionnages, notes, visibilité
              </Txt>
            </View>
          ) : null}

          {entry.status === 'COMPLETED' ? (
            <View style={styles.section}>
              <SectionTitle aside={entry.score ? `${entry.score} / 10` : 'Aucune'}>Note</SectionTitle>
              <View style={styles.scoreGrid}>
                {SCORES.map((n) => {
                  const on = entry.score === n;
                  return (
                    <Pressable
                      key={n}
                      accessibilityState={{ selected: on }}
                      onPress={() => onChange({ score: on ? null : n })}
                      style={[styles.scoreCell, on && styles.scoreOn]}
                    >
                      <Txt size="base" weight="semibold" tabular color={on ? '#000' : Tw.color.foreground}>
                        {n}
                      </Txt>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <SectionTitle>Dates de {kind === 'anime' ? 'visionnage' : 'lecture'}</SectionTitle>
            <View style={styles.dates}>
              <DateButton label="Début" value={entry.startedAt} onChange={(v) => onChange({ startedAt: v })} />
              <DateButton label="Fin" value={entry.completedAt} onChange={(v) => onChange({ completedAt: v })} />
            </View>
            {entry.status === 'ON_HOLD' ? (
              <DateButton label="En pause depuis" value={entry.onHoldSince} onChange={(v) => onChange({ onHoldSince: v })} />
            ) : null}
          </View>

          <View style={styles.section}>
            <SectionTitle>{kind === 'anime' ? 'Revisionnages' : 'Relectures'}</SectionTitle>
            <View style={styles.stepper}>
              <Pressable accessibilityLabel="Un de moins" onPress={() => onChange({ rewatchCount: Math.max(0, (entry.rewatchCount ?? 0) - 1) })} style={styles.stepButton}>
                <Minus size={20} color={Tw.color.foreground} />
              </Pressable>
              <Txt size="xl" weight="bold" tabular style={styles.stepValue}>
                {entry.rewatchCount ?? 0}
              </Txt>
              <Pressable accessibilityLabel="Un de plus" onPress={() => onChange({ rewatchCount: (entry.rewatchCount ?? 0) + 1 })} style={styles.stepButton}>
                <Plus size={20} color={Tw.color.foreground} />
              </Pressable>
            </View>
          </View>

          <View style={styles.section}>
            <SectionTitle aside={`${notes.length} / 1000`}>Notes personnelles</SectionTitle>
            <TextInput
              value={notes}
              maxLength={1000}
              multiline
              numberOfLines={4}
              onChangeText={setNotes}
              onBlur={() => notes !== (entry.notes ?? '') && onChange({ notes })}
              placeholder="Ce que tu retiens, où tu en es, une phrase à garder…"
              placeholderTextColor={Tw.color.mutedForeground}
              style={styles.textarea}
            />
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: notesPublic }}
              onPress={() => onChange({ notesPublic: !notesPublic })}
              style={styles.switchRow}
            >
              <View style={[styles.switchTrack, notesPublic ? styles.switchOn : styles.switchOff]}>
                <View style={[styles.switchThumb, notesPublic ? styles.thumbOn : styles.thumbOff]} />
              </View>
              <View style={styles.flex}>
                <Txt size="sm" weight="medium">
                  Montrer cette note sur ma liste publique
                </Txt>
                <Txt size="xs" color={Tw.color.mutedForeground}>
                  {notesPublic
                    ? 'Les visiteurs de ta liste la lisent sous le titre.'
                    : 'Privée : toi seul la vois. Active pour la partager avec les visiteurs.'}
                  {visibility === 'PRIVATE' ? " Sans effet tant que l'entrée est privée." : ''}
                </Txt>
              </View>
            </Pressable>
          </View>

          <View style={styles.section}>
            <SectionTitle>Visibilité</SectionTitle>
            {(Object.keys(VISIBILITY_ICON) as ListVisibility[]).map((value) => {
              const Icon = VISIBILITY_ICON[value];
              const active = visibility === value;
              return (
                <Pressable
                  key={value}
                  accessibilityState={{ selected: active }}
                  onPress={() => onChange({ visibility: value })}
                  style={[styles.visibility, active && styles.visibilityOn]}
                >
                  <Icon size={18} color={active ? Tw.color.primary : Tw.color.mutedForeground} />
                  <View style={styles.flex}>
                    <Txt size="sm" weight="medium">
                      {VISIBILITY_LABELS[value]}
                    </Txt>
                    <Txt size="xs" color={Tw.color.mutedForeground}>
                      {VISIBILITY_HINT[value]}
                    </Txt>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {onRemove ? (
            confirmRemove ? (
              <View style={styles.confirm}>
                <Txt size="sm">Retirer « {title} » de ta liste ? Ta note et ta progression seront perdues.</Txt>
                <View style={styles.confirmRow}>
                  <Pressable onPress={() => setConfirmRemove(false)} style={[styles.confirmButton, styles.cancel]}>
                    <Txt size="sm" weight="semibold">
                      Annuler
                    </Txt>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      onRemove();
                      onClose();
                    }}
                    style={[styles.confirmButton, styles.remove]}
                  >
                    <Txt size="sm" weight="semibold" color="#fff">
                      Retirer
                    </Txt>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable accessibilityRole="button" onPress={() => setConfirmRemove(true)} style={styles.removeButton}>
                <Trash2 size={16} color={Tw.color.destructive} />
                <Txt size="sm" weight="semibold" color={Tw.color.destructive}>
                  Retirer de ma liste
                </Txt>
              </Pressable>
            )
          ) : null}
        </ScrollView>
      ) : null}
    </BottomSheet>
  );
}

function Shortcut({ label, onPress }: Readonly<{ label: string; onPress: () => void }>) {
  return (
    <Pressable onPress={onPress} style={styles.shortcut}>
      <Txt size="sm" color={Tw.color.mutedForeground} style={{ fontSize: 13 }}>
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  headerCard: { borderRadius: Tw.radius.xl, borderWidth: 1, borderColor: Tw.color.border, backgroundColor: alpha(Tw.color.muted, 0.4), padding: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headerMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 48, height: 68, borderRadius: Tw.radius.md, backgroundColor: Tw.color.muted, overflow: 'hidden' },
  headerText: { flex: 1, minWidth: 0, gap: 4 },
  infoBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  infoBadge: { borderRadius: 999, backgroundColor: alpha(Tw.color.background, 0.6), paddingHorizontal: 8, paddingVertical: 2 },
  heart: { width: 44, height: 44, borderRadius: Tw.radius.xl, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  heartOn: { borderColor: alpha(Tw.color.rose500, 0.5), backgroundColor: alpha(Tw.color.rose500, 0.1) },
  heartOff: { borderColor: Tw.color.border, backgroundColor: alpha(Tw.color.background, 0.6) },
  viewButton: { marginTop: 12, height: 40, borderRadius: Tw.radius.lg, backgroundColor: Tw.color.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  content: { paddingHorizontal: 16, paddingBottom: 40, gap: 20 },
  section: { gap: 8 },
  sectionTitle: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  statusGrid: { flexDirection: 'row', gap: 4 },
  statusCell: { flex: 1, alignItems: 'center', gap: 4, borderRadius: Tw.radius.xl, borderWidth: 1, borderColor: Tw.color.border, paddingVertical: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepButton: { width: 48, height: 44, borderRadius: Tw.radius.xl, borderWidth: 1, borderColor: Tw.color.border, alignItems: 'center', justifyContent: 'center' },
  stepValue: { flex: 1, textAlign: 'center' },
  shortcuts: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  shortcut: { height: 40, borderRadius: 16, borderWidth: 1, borderColor: Tw.color.border, paddingHorizontal: 12, justifyContent: 'center' },
  more: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 4 },
  scoreGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  scoreCell: { width: '18.2%', height: 40, borderRadius: Tw.radius.xl, borderWidth: 1, borderColor: Tw.color.border, alignItems: 'center', justifyContent: 'center' },
  scoreOn: { borderColor: Tw.color.amber400, backgroundColor: Tw.color.amber400 },
  dates: { flexDirection: 'row', gap: 8 },
  dateField: { flex: 1, gap: 4 },
  dateInput: { height: 40, borderRadius: Tw.radius.lg, borderWidth: 1, borderColor: Tw.color.border, backgroundColor: Tw.color.background, paddingHorizontal: 8, justifyContent: 'center' },
  textarea: {
    minHeight: 96,
    borderRadius: Tw.radius.lg,
    borderWidth: 1,
    borderColor: Tw.color.border,
    backgroundColor: Tw.color.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Tw.color.foreground,
    fontFamily: Fonts.regular,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: Tw.radius.xl, borderWidth: 1, borderColor: Tw.color.border, paddingHorizontal: 12, paddingVertical: 10 },
  switchTrack: { width: 40, height: 24, borderRadius: 12, borderWidth: 1, justifyContent: 'center' },
  switchOn: { borderColor: Tw.color.primary, backgroundColor: Tw.color.primary },
  switchOff: { borderColor: Tw.color.border, backgroundColor: Tw.color.muted },
  switchThumb: { width: 18, height: 18, borderRadius: 9, marginLeft: 2 },
  thumbOn: { backgroundColor: Tw.color.primaryForeground, transform: [{ translateX: 16 }] },
  thumbOff: { backgroundColor: Tw.color.mutedForeground },
  visibility: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: Tw.radius.xl, borderWidth: 1, borderColor: Tw.color.border, paddingHorizontal: 12, paddingVertical: 10 },
  visibilityOn: { borderColor: Tw.color.primary, backgroundColor: alpha(Tw.color.primary, 0.1) },
  confirm: { gap: 8, borderRadius: Tw.radius.xl, borderWidth: 1, borderColor: alpha(Tw.color.destructive, 0.4), backgroundColor: alpha(Tw.color.destructive, 0.1), padding: 12 },
  confirmRow: { flexDirection: 'row', gap: 8 },
  confirmButton: { flex: 1, height: 40, borderRadius: Tw.radius.lg, alignItems: 'center', justifyContent: 'center' },
  cancel: { borderWidth: 1, borderColor: Tw.color.border },
  remove: { backgroundColor: Tw.color.destructive },
  removeButton: { height: 44, borderRadius: Tw.radius.xl, borderWidth: 1, borderColor: alpha(Tw.color.destructive, 0.4), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
