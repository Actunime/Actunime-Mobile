import { Image } from 'expo-image';
import { Calendar, CalendarClock, ChevronLeft, ChevronRight, Sparkles, Tv } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CardCarousel, Pill, SectionCard, type ICarouselItem } from '@/components/media/detail-parts';
import { openMedia } from '@/components/media-row';
import { Screen } from '@/components/screen';
import { ErrorState, Loading } from '@/components/states';
import { Pressable } from '@/components/tap';
import { Txt } from '@/components/tw';
import { ScreenGutter, Tw, alpha } from '@/constants/theme';
import { mediaId, type IMedia } from '@/lib/api';
import {
  AGENDA_PLATFORMS,
  addDays,
  animeTitle,
  getAnimePlatforms,
  getOccurrencesOnDay,
  monthCells,
  sameDay,
  seasonOf,
  startOfWeek,
  weekDays,
  type IAgendaOccurrence,
  type IAgendaPlatform,
} from '@/lib/agenda';
import { formatLabel } from '@/lib/media';
import { useAgendaAnimes, useMyEntries, useSeasonAnimes } from '@/lib/queries';

type View_ = 'week' | 'month';

const dayName = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const monthName = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
const rangeDay = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' });
const clock = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
const WEEKDAY_INITIALS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function Chip({ label, selected, onPress, accent }: Readonly<{ label: string; selected: boolean; onPress: () => void; accent?: string }>) {
  const color = accent ?? Tw.color.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && { backgroundColor: alpha(color, 0.15), borderColor: color }]}
    >
      <Txt size="sm" weight="medium" color={selected ? Tw.color.foreground : Tw.color.mutedForeground}>
        {label}
      </Txt>
    </Pressable>
  );
}

/** Une sortie : affiche, titre, épisode, heure, plateformes ; « Prévisionnel » tant que le staff n'a pas confirmé. */
function OccurrenceRow({ occurrence, mine }: Readonly<{ occurrence: IAgendaOccurrence; mine: boolean }>) {
  const { anime } = occurrence;
  const episode = occurrence.total ? `Épisode ${occurrence.episode} / ${occurrence.total}` : `Épisode ${occurrence.episode}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={animeTitle(anime)}
      onPress={() => openMedia('anime', mediaId(anime))}
      style={[styles.occurrence, mine && styles.occurrenceMine]}
    >
      <View style={styles.thumb}>
        {anime.posterUrl ? <Image source={{ uri: anime.posterUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={120} /> : <Tv size={20} color={Tw.color.mutedForeground} />}
      </View>
      <View style={styles.flex}>
        <Txt size="sm" weight="semibold" numberOfLines={2}>
          {animeTitle(anime)}
        </Txt>
        <Txt size="xs" color={Tw.color.mutedForeground}>
          {episode} · {occurrence.timeUnknown ? 'heure inconnue' : clock.format(occurrence.date)}
        </Txt>
        <View style={styles.pills}>
          {mine ? <Pill label="Dans ma liste" color={Tw.color.green400} background={alpha(Tw.color.green500, 0.15)} border={alpha(Tw.color.green500, 0.3)} /> : null}
          {occurrence.provisional ? <Pill label="Prévisionnel" color={Tw.color.yellow400} background={alpha(Tw.color.yellow500, 0.15)} border={alpha(Tw.color.yellow500, 0.3)} /> : null}
          {occurrence.platforms.map((platform) => (
            <Pill key={platform} label={platform} />
          ))}
        </View>
      </View>
    </Pressable>
  );
}

function SeasonSection({ title, icon, period }: Readonly<{ title: string; icon: typeof Sparkles; period: 'current' | 'next' }>) {
  const season = useSeasonAnimes(period);
  const animes = season.data ?? [];
  if (!season.isPending && animes.length === 0) return null;
  return (
    <SectionCard title={title} icon={icon} count={animes.length || undefined}>
      {season.isPending ? (
        <Loading />
      ) : (
        <CardCarousel
          items={animes.map(
            (anime): ICarouselItem => ({
              id: mediaId(anime),
              title: animeTitle(anime),
              imageUrl: anime.posterUrl,
              subtitle: formatLabel(anime.format) ?? undefined,
              onPress: () => openMedia('anime', mediaId(anime)),
            }),
          )}
          width={112}
        />
      )}
    </SectionCard>
  );
}

/**
 * Agenda des animes (`planning` du site) : sorties de la semaine ou du mois (créneau dérivé de `date.start`), filtres
 * « dans ma liste » et plateformes, puis les animes de la saison en cours et de la suivante.
 */
export function AgendaScreen() {
  const agenda = useAgendaAnimes();
  const mine = useMyEntries('Anime');
  const [view, setView] = useState<View_>('week');
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => new Date());
  const [onlyMine, setOnlyMine] = useState(false);
  const [platform, setPlatform] = useState<IAgendaPlatform | null>(null);

  const now = useMemo(() => new Date(), []);
  const mineIds = useMemo(() => new Set((mine.data ?? []).map((entry) => entry.mediaId).filter(Boolean) as string[]), [mine.data]);
  const animes = useMemo(
    () =>
      (agenda.data ?? []).filter(
        (anime: IMedia) => (!onlyMine || mineIds.has(mediaId(anime))) && (!platform || getAnimePlatforms(anime).includes(platform)),
      ),
    [agenda.data, onlyMine, platform, mineIds],
  );

  const days = view === 'week' ? weekDays(cursor) : monthCells(cursor).filter((day): day is Date => day !== null);
  const occurrencesByDay = useMemo(() => new Map(days.map((day) => [day.toDateString(), getOccurrencesOnDay(animes, day, now)])), [days, animes, now]);

  const step = (direction: -1 | 1) => setCursor((current) => (view === 'week' ? addDays(current, direction * 7) : new Date(current.getFullYear(), current.getMonth() + direction, 1)));
  const label =
    view === 'month'
      ? capitalize(monthName.format(cursor))
      : `${rangeDay.format(startOfWeek(cursor))} – ${rangeDay.format(addDays(startOfWeek(cursor), 6))} ${addDays(startOfWeek(cursor), 6).getFullYear()}`;

  const dayBlock = (day: Date) => {
    const list = occurrencesByDay.get(day.toDateString()) ?? [];
    const today = sameDay(day, now);
    return (
      <View key={day.toDateString()} style={styles.day}>
        <Txt size="sm" weight="semibold" color={today ? Tw.color.primary : Tw.color.foreground}>
          {capitalize(dayName.format(day))}
          {today ? ' · aujourd’hui' : ''}
        </Txt>
        {list.length === 0 ? (
          <Txt size="xs" color={Tw.color.mutedForeground}>
            Aucune sortie
          </Txt>
        ) : (
          list.map((occurrence) => <OccurrenceRow key={`${occurrence.anime.id ?? occurrence.anime._id}-${occurrence.episode}`} occurrence={occurrence} mine={mineIds.has(mediaId(occurrence.anime))} />)
        )}
      </View>
    );
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.title}>
          <Calendar size={26} color={Tw.color.primary} />
          <Txt size="2xl" weight="bold">
            Agenda des animes
          </Txt>
        </View>

        <View style={styles.row}>
          <Chip label="Semaine" selected={view === 'week'} onPress={() => setView('week')} />
          <Chip label="Mois" selected={view === 'month'} onPress={() => setView('month')} />
        </View>

        <View style={styles.nav}>
          <Pressable accessibilityRole="button" accessibilityLabel="Précédent" onPress={() => step(-1)} style={styles.navButton}>
            <ChevronLeft size={22} color={Tw.color.foreground} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Aujourd’hui" onPress={() => { setCursor(new Date()); setSelected(new Date()); }} style={styles.navLabel}>
            <Txt size="sm" weight="semibold" style={styles.centered}>
              {label}
            </Txt>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Suivant" onPress={() => step(1)} style={styles.navButton}>
            <ChevronRight size={22} color={Tw.color.foreground} />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          <Chip label="Dans ma liste" selected={onlyMine} onPress={() => setOnlyMine((value) => !value)} accent={Tw.color.green500} />
          {AGENDA_PLATFORMS.map((name) => (
            <Chip key={name} label={name} selected={platform === name} onPress={() => setPlatform((current) => (current === name ? null : name))} />
          ))}
        </ScrollView>

        {agenda.isPending ? (
          <Loading />
        ) : agenda.isError ? (
          <ErrorState error={agenda.error} onRetry={() => void agenda.refetch()} />
        ) : view === 'week' ? (
          <View style={styles.days}>{days.map(dayBlock)}</View>
        ) : (
          <View style={styles.days}>
            <View style={styles.grid}>
              {WEEKDAY_INITIALS.map((initial, index) => (
                <View key={`${initial}-${index}`} style={styles.cell}>
                  <Txt size="xs" color={Tw.color.mutedForeground}>
                    {initial}
                  </Txt>
                </View>
              ))}
              {monthCells(cursor).map((day, index) => {
                if (!day) return <View key={`blank-${index}`} style={styles.cell} />;
                const count = occurrencesByDay.get(day.toDateString())?.length ?? 0;
                const isSelected = sameDay(day, selected);
                return (
                  <Pressable
                    key={day.toDateString()}
                    accessibilityRole="button"
                    accessibilityLabel={`${dayName.format(day)}, ${count} sortie${count > 1 ? 's' : ''}`}
                    onPress={() => setSelected(day)}
                    style={[styles.cell, styles.dayCell, isSelected && styles.dayCellSelected]}
                  >
                    <Txt size="sm" weight={sameDay(day, now) ? 'bold' : 'normal'} color={sameDay(day, now) ? Tw.color.primary : Tw.color.foreground}>
                      {day.getDate()}
                    </Txt>
                    {count > 0 ? (
                      <Txt size="10" color={Tw.color.mutedForeground}>
                        {count}
                      </Txt>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
            {dayBlock(selected)}
          </View>
        )}

        <View style={styles.seasons}>
          <SeasonSection title={seasonOf(0).label} icon={Sparkles} period="current" />
          <SeasonSection title={`Prochaine saison — ${seasonOf(1).label}`} icon={CalendarClock} period="next" />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  centered: { textAlign: 'center' },
  content: { padding: ScreenGutter, gap: 16, paddingBottom: 32 },
  title: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  row: { flexDirection: 'row', gap: 8 },
  filters: { gap: 8 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Tw.color.border,
    backgroundColor: Tw.color.card,
  },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Tw.radius.lg, backgroundColor: Tw.color.card },
  navLabel: { flex: 1, minHeight: 44, justifyContent: 'center' },
  days: { gap: 16 },
  day: { gap: 8 },
  occurrence: { flexDirection: 'row', gap: 12, padding: 8, minHeight: 72, borderRadius: Tw.radius.lg, backgroundColor: Tw.color.card, borderWidth: 1, borderColor: 'transparent' },
  occurrenceMine: { borderColor: alpha(Tw.color.green500, 0.5) },
  thumb: { width: 52, height: 72, borderRadius: Tw.radius.md, overflow: 'hidden', backgroundColor: Tw.color.muted, alignItems: 'center', justifyContent: 'center' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  dayCell: { borderRadius: Tw.radius.md, borderWidth: 1, borderColor: 'transparent' },
  dayCellSelected: { borderColor: Tw.color.primary, backgroundColor: alpha(Tw.color.primary, 0.12) },
  seasons: { gap: 16 },
});
