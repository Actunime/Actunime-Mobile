import type { IMedia as IAnime } from './api';

/**
 * Agenda des sorties (E108). Le créneau hebdomadaire est DÉRIVÉ de `date.start`
 * (E54) : rien n'est stocké, chaque sortie d'une semaine affichée est calculée ici.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DURATION_MINUTES = 24;
/**
 * Sans total d'épisodes connu (ou série « continue »), on ne sait pas quand la
 * série s'arrête : l'agenda ne promet des sorties futures que sur cet horizon.
 */
export const UNKNOWN_END_HORIZON_WEEKS = 4;

export const AGENDA_PLATFORMS = ['Crunchyroll', 'ADN', 'Netflix', 'Prime Video', 'Disney+'] as const;
export type IAgendaPlatform = (typeof AGENDA_PLATFORMS)[number];

const PLATFORM_MATCHERS: Array<[IAgendaPlatform, RegExp]> = [
  ['Crunchyroll', /crunchyroll/i],
  ['ADN', /^adn$|animation digital network|animationdigitalnetwork/i],
  ['Netflix', /netflix/i],
  ['Prime Video', /prime|amazon/i],
  ['Disney+', /disney/i],
];

/** Plateformes de visionnage connues d'un anime, d'après le nom ou l'adresse de ses liens. */
export function getAnimePlatforms(anime: IAnime): IAgendaPlatform[] {
  const found = new Set<IAgendaPlatform>();
  for (const link of anime.links ?? []) {
    for (const [platform, matcher] of PLATFORM_MATCHERS) {
      if (matcher.test(link.name ?? '') || matcher.test(link.url ?? '')) found.add(platform);
    }
  }
  return AGENDA_PLATFORMS.filter((p) => found.has(p));
}

export interface IAgendaOccurrence {
  anime: IAnime;
  /** Début de la sortie (jour + heure locale ; minuit local si l'heure est inconnue). */
  date: Date;
  episode: number;
  total: number | null;
  /** `date.start` enregistrée à minuit UTC : l'heure n'a jamais été précisée. */
  timeUnknown: boolean;
  durationMinutes: number;
  /** Anime « Bientôt » : date et heure prévisionnelles, pas encore confirmées par le staff. */
  provisional: boolean;
  platforms: IAgendaPlatform[];
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Lundi de la semaine de `d` (semaine française). */
export function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  return addDays(x, -((x.getDay() + 6) % 7));
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Différence en jours calendaires (insensible au passage heure d'été / hiver). */
function dayDiff(from: Date, to: Date): number {
  return Math.round(
    (Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()) -
      Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())) /
      DAY_MS
  );
}

function isTimeUnknown(start: Date): boolean {
  return start.getUTCHours() === 0 && start.getUTCMinutes() === 0;
}

/**
 * Sortie de `anime` le jour `day`, ou `null`. Respecte la pause, la fin de
 * diffusion (`episodesInfo.total`), les films (un seul épisode) et la reprise
 * fixée par le staff (`nextAiringDate` + `airing`) ; `now` sert à juger si cette reprise est périmée
 * et à borner l'horizon des séries sans total (`UNKNOWN_END_HORIZON_WEEKS`).
 */
export function getOccurrenceOnDay(anime: IAnime, day: Date, now: Date = new Date()): IAgendaOccurrence | null {
  const info = anime.episodesInfo;
  if (anime.format === 'FILM' || !anime.date?.start) return null;
  const start = new Date(anime.date.start);
  if (Number.isNaN(start.getTime())) return null;

  const resume = info?.nextAiringDate ? new Date(info.nextAiringDate) : null;
  const hasResume = resume !== null && !Number.isNaN(resume.getTime()) && typeof info?.airing === 'number';
  // En pause, seule une reprise à venir place la série : une `nextAiringDate` déjà passée est périmée.
  if (info?.broadcastPaused && (!hasResume || dayDiff(resume, now) > 0)) return null;

  // Une `date.start` au mois ou à l'année ne désigne pas un jour : elle ne sert pas d'ancre,
  // mais une `nextAiringDate` précise suffit à placer la série.
  const startIsDay = !anime.date.startPrecision || anime.date.startPrecision === 'day';
  if (!startIsDay && !hasResume) return null;

  let anchor = start;
  let anchorEpisode = 1;
  if (hasResume && dayDiff(resume, day) >= 0) {
    anchor = resume;
    anchorEpisode = (info?.airing ?? 0) + 1;
  } else if (!startIsDay) {
    return null;
  }
  const days = dayDiff(anchor, day);
  if (days < 0 || days % 7 !== 0) return null;

  const episode = anchorEpisode + days / 7;
  // Avant la reprise, la cadence de `date.start` ne vaut que jusqu'au dernier épisode réellement diffusé
  // (`airing`) : au-delà, ce sont des semaines de pause, pas des sorties.
  if (hasResume && anchor === start && episode > (info?.airing ?? 0)) return null;
  const total = info?.total && info.total > 0 && !info.continuous ? info.total : null;
  if (total !== null && episode > total) return null;
  // Fin inconnue : pas de sortie annoncée au-delà de l'horizon.
  // Pour un anime pas encore commencé, l'horizon court depuis sa première (sinon elle serait coupée).
  if (total === null && dayDiff(now > anchor ? now : anchor, day) > UNKNOWN_END_HORIZON_WEEKS * 7) return null;

  // L'heure vient de `nextAiringDate` (heure locale de l'utilisateur) pour tous les
  // jours, y compris avant la reprise ; `date.start` ne sert que de repli.
  const clock = resume !== null && !Number.isNaN(resume.getTime()) ? resume : start;
  const timeUnknown = isTimeUnknown(clock);
  const date = startOfDay(day);
  if (!timeUnknown) date.setHours(clock.getHours(), clock.getMinutes(), 0, 0);

  return {
    anime,
    date,
    episode,
    total,
    timeUnknown,
    provisional: anime.status === 'SOON',
    durationMinutes:
      info?.durationMinutes && info.durationMinutes > 0 ? info.durationMinutes : DEFAULT_DURATION_MINUTES,
    platforms: getAnimePlatforms(anime),
  };
}

/** Sorties d'un jour, heure inconnue en dernier, puis par heure et titre. */
export function getOccurrencesOnDay(animes: IAnime[], day: Date, now: Date = new Date()): IAgendaOccurrence[] {
  const out: IAgendaOccurrence[] = [];
  for (const anime of animes) {
    const occ = getOccurrenceOnDay(anime, day, now);
    if (occ) out.push(occ);
  }
  return out.sort(
    (a, b) =>
      Number(a.timeUnknown) - Number(b.timeUnknown) ||
      a.date.getTime() - b.date.getTime() ||
      animeTitle(a.anime).localeCompare(animeTitle(b.anime), 'fr')
  );
}

export function animeTitle(anime: IAnime): string {
  return anime.title?.normal ?? anime.title?.original ?? 'Sans titre';
}

const SEASON_DEFS = [
  { key: 'winter', label: 'Hiver' },
  { key: 'spring', label: 'Printemps' },
  { key: 'summer', label: 'Été' },
  { key: 'fall', label: 'Automne' },
] as const;

/** Saison calendaire (trimestre) : 0 = en cours, 1 = suivante (aligné sur `getSeasonWindow` de l'API). */
export function seasonOf(offset: 0 | 1, now: Date = new Date()): { name: string; label: string } {
  const quarter = Math.floor(now.getMonth() / 3);
  const ref = new Date(now.getFullYear(), quarter * 3 + offset * 3, 1);
  const { key, label } = SEASON_DEFS[Math.floor(ref.getMonth() / 3) % 4]!;
  const year = ref.getFullYear();
  return { name: `${key}-${year}`, label: `${label} ${year}` };
}

/** Les 7 jours (lundi → dimanche) de la semaine de `d`. */
export function weekDays(d: Date): Date[] {
  const monday = startOfWeek(d);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** Cases du mois de `d` : jours du mois, précédés des jours qui complètent la première semaine (`null`). */
export function monthCells(d: Date): (Date | null)[] {
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const count = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  return [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: count }, (_, i) => new Date(d.getFullYear(), d.getMonth(), i + 1)),
  ];
}
