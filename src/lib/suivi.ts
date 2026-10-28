import type { IListEntry, IMedia, ListStatus } from './api';

/**
 * Calculs de « Mon suivi », repris de `getEstimatedAired` / `getNextBroadcast` / `useMyListInsights` du site
 * (`types/src/utils/_mediaUtil.ts`, `Actunime-Web/src/hooks/useMyListInsights.ts`) : l'app n'embarque aucune
 * dépendance `@actunime/*`, ces fonctions sont recopiées. Seules les entrées de ma liste servent de source.
 */

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

interface IAiringMedia extends IMedia {
  format?: string;
  date?: { start?: string; end?: string; startPrecision?: string };
  episodesInfo?: IMedia['episodesInfo'] & { nextAiringDate?: string };
}

/** Épisodes estimés diffusés : semaines écoulées depuis la première, recalées sur le compteur `airing` du staff. */
export function estimatedAired(media: IMedia, from = new Date()): number {
  const m = media as IAiringMedia;
  const info = m.episodesInfo;
  const total = info?.total;
  const clamp = (aired: number) => Math.max(0, Math.min(aired, total && total > 0 ? total : aired));
  const paused = Boolean(info?.broadcastPaused || m.status === 'PAUSED');

  if (typeof info?.airing === 'number' && info.airing >= 0) {
    const resume = info.nextAiringDate ? new Date(info.nextAiringDate) : null;
    if (resume && !Number.isNaN(resume.getTime())) {
      const extra = resume.getTime() <= from.getTime() ? Math.floor((from.getTime() - resume.getTime()) / WEEK_MS) + 1 : 0;
      return clamp(info.airing + extra);
    }
    if (paused) return clamp(info.airing);
  }

  const start = m.date?.start ? new Date(m.date.start) : null;
  if (!start || Number.isNaN(start.getTime()) || start.getTime() > from.getTime()) return 0;
  return clamp(Math.floor((from.getTime() - start.getTime()) / WEEK_MS) + 1);
}

/** Prochaine diffusion du créneau hebdomadaire (même jour et heure que la première), ou `null` si indéterminée. */
export function nextBroadcast(media: IMedia, from = new Date()): Date | null {
  const m = media as IAiringMedia;
  if (m.format === 'FILM') return null;
  const info = m.episodesInfo;

  let resume: Date | null = null;
  if (info?.nextAiringDate) {
    const r = new Date(info.nextAiringDate);
    if (!Number.isNaN(r.getTime())) {
      if (r.getTime() >= from.getTime()) return r;
      resume = r;
    }
  }
  if (info?.broadcastPaused) return null;

  const precision = resume ? 'day' : m.date?.startPrecision;
  const anchor = resume ?? (m.date?.start ? new Date(m.date.start) : null);
  if (!anchor || Number.isNaN(anchor.getTime())) return null;
  if (anchor.getTime() >= from.getTime()) return anchor;
  if (precision && precision !== 'day') return null;

  const next = new Date(from);
  next.setHours(anchor.getHours(), anchor.getMinutes(), 0, 0);
  next.setDate(next.getDate() + ((anchor.getDay() - next.getDay() + 7) % 7));
  if (next.getTime() < from.getTime()) next.setDate(next.getDate() + 7);
  return next;
}

export interface IBehind {
  entry: IListEntry;
  media: IMedia;
  available: number;
  watched: number;
  behind: number;
}

/** Animes en cours avec des épisodes diffusés non vus, du plus en retard au moins en retard. */
export function behindAnimes(entries: IListEntry[], from = new Date()): IBehind[] {
  const items: IBehind[] = [];
  for (const entry of entries) {
    if (entry.mediaType !== 'Anime' || entry.status !== 'WATCHING' || !entry.media) continue;
    const available = estimatedAired(entry.media, from);
    const watched = entry.episodesWatched ?? 0;
    if (available - watched > 0) items.push({ entry, media: entry.media, available, watched, behind: available - watched });
  }
  return items.sort((a, b) => b.behind - a.behind);
}

export interface IScheduleItem {
  media: IMedia;
  at: Date;
}

export interface IScheduleDay {
  date: Date;
  items: IScheduleItem[];
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** Sept jours à partir d'aujourd'hui, avec les animes de ma liste (en cours ou prévus) qui sortent chaque jour. */
export function weekSchedule(entries: IListEntry[], from = new Date()): IScheduleDay[] {
  const days: IScheduleDay[] = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(from);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    return { date, items: [] };
  });
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  for (const entry of entries) {
    if (entry.mediaType !== 'Anime' || !entry.media) continue;
    if (entry.status !== 'WATCHING' && entry.status !== 'PLAN_TO_WATCH') continue;
    if (entry.media.status !== 'AIRING') continue;
    const at = nextBroadcast(entry.media, start);
    const day = at ? days.find((d) => sameDay(d.date, at)) : undefined;
    if (day && at) day.items.push({ media: entry.media, at });
  }
  for (const day of days) day.items.sort((a, b) => a.at.getTime() - b.at.getTime());
  return days;
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** « Mercredi 28 octobre ». */
export function dayLabel(date: Date): string {
  return `${capitalize(WEEKDAYS[date.getDay()]!)} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export const shortDay = (date: Date): string => capitalize(WEEKDAYS[date.getDay()]!.slice(0, 3));

/** Titre du bandeau d'ouverture (même logique que `TodayBanner`). */
export function headline(todayCount: number, behindTotal: number): string {
  if (todayCount > 0) return `${todayCount} épisode${todayCount > 1 ? 's' : ''} sort${todayCount > 1 ? 'ent' : ''} aujourd'hui`;
  if (behindTotal > 0) return `${behindTotal} épisode${behindTotal > 1 ? 's' : ''} à rattraper`;
  return "Rien de prévu aujourd'hui";
}

export interface IBreakdownSegment {
  label: string;
  value: number;
  color: 'primary' | 'success' | 'info' | 'muted';
}

/** Répartition de la liste par statut (barre empilée de `ListBreakdown`). */
export function listBreakdown(byStatus: { status: ListStatus; count: number }[]): IBreakdownSegment[] {
  const count = (...statuses: ListStatus[]) => byStatus.filter((s) => statuses.includes(s.status)).reduce((n, s) => n + s.count, 0);
  return [
    { label: 'En cours', value: count('WATCHING', 'READING'), color: 'primary' as const },
    { label: 'Terminés', value: count('COMPLETED'), color: 'success' as const },
    { label: 'Prévus', value: count('PLAN_TO_WATCH', 'PLAN_TO_READ'), color: 'info' as const },
    { label: 'En pause / abandonnés', value: count('ON_HOLD', 'DROPPED'), color: 'muted' as const },
  ].filter((segment) => segment.value > 0);
}

/** Heure approximative de diffusion (« ~18:30 »). */
export const timeLabel = (date: Date): string =>
  `~${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
