import type { IListEntry, IMedia, MediaKind } from './api';

/** Titre affiché : le titre normal du site, sinon l'original. */
export function mediaTitle(media?: Pick<IMedia, 'title'> | null): string {
  return media?.title?.original ?? media?.title?.normal ?? 'Sans titre';
}

export function entryId(entry: IListEntry): string {
  return entry.id;
}

export const kindOf = (mediaType?: 'Anime' | 'Manga'): MediaKind => (mediaType === 'Manga' ? 'manga' : 'anime');
export const mediaTypeOf = (kind: MediaKind): 'Anime' | 'Manga' => (kind === 'manga' ? 'Manga' : 'Anime');

/** Total d'épisodes (anime) ou de chapitres (manga) quand il est connu. */
export function totalOf(kind: MediaKind, media?: IMedia | null): number | undefined {
  const total = kind === 'manga' ? media?.chaptersInfo?.total : media?.episodesInfo?.total;
  return total && total > 0 ? total : undefined;
}

/** Progression de l'entrée : « 5 / 12 ép. » ou « 5 ch. ». */
export function progressLabel(entry: IListEntry, media?: IMedia | null): string | null {
  const manga = entry.mediaType === 'Manga';
  const done = manga ? entry.chaptersRead : entry.episodesWatched;
  if (done === undefined || done === null) return null;
  const total = totalOf(kindOf(entry.mediaType), media);
  const unit = manga ? 'ch.' : 'ép.';
  return total ? `${done} / ${total} ${unit}` : `${done} ${unit}`;
}

export function formatYear(media?: IMedia | null): string | null {
  const start = media?.date?.start;
  if (!start) return null;
  const year = new Date(start).getFullYear();
  return Number.isNaN(year) ? null : String(year);
}

const FORMAT_LABELS: Record<string, string> = {
  SERIE: 'Série',
  SERIE_COURTE: 'Série courte',
  FILM: 'Film',
  ONA: 'ONA',
  OVA: 'OVA',
  SPECIAL: 'Spécial',
  MANGA: 'Manga',
  UNKNOWN: '',
};

/** Format lisible (`SERIE_COURTE` devient « Série courte ») ; un format inconnu est passé en minuscules capitalisées. */
export function formatLabel(format?: string): string | null {
  if (!format) return null;
  const label = FORMAT_LABELS[format] ?? format.charAt(0) + format.slice(1).toLowerCase().replace(/_/g, ' ');
  return label || null;
}

const LINK_LABELS: Record<string, string> = {
  'official site': 'Site officiel',
  twitter: 'X (Twitter)',
  x: 'X (Twitter)',
  youtube: 'YouTube',
  wikipedia: 'Wikipédia',
  'official twitter': 'X officiel',
};

/** Libellé français d'un lien d'œuvre (les noms venus de MyAnimeList sont en anglais) ; le nom d'un service reste tel quel. */
export function linkLabel(link: { url: string; name?: string }): string {
  const name = link.name?.trim();
  if (!name) return new URL(link.url).hostname.replace(/^www\./, '');
  return LINK_LABELS[name.toLowerCase()] ?? name;
}

/** Couleur de la pastille de statut de l'œuvre : en cours en vert, bientôt en orange, terminé neutre. */
export function statusTone(status?: string): 'success' | 'warning' | 'destructive' | 'neutral' {
  if (status === 'AIRING') return 'success';
  if (status === 'SOON' || status === 'PAUSED' || status === 'POSTONED') return 'warning';
  if (status === 'STOPPED') return 'destructive';
  return 'neutral';
}

/** Date longue en français (« 16 janvier 2026 »), ou `null` si absente ou invalide. */
/** Les dates de l'API arrivent en texte ISO ; les types partagés admettent aussi `Date`. */
export function formatLongDate(value?: string | Date | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  return `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/**
 * Date de sortie des cartes (« 06 juillet 2026 », `formatReleaseDate` de `AnimeCard`) ; une date annoncée au mois
 * ou à l'année seulement s'affiche « mars 2027 » ou « 2027 ».
 */
export function formatReleaseDate(value?: string | null, precision?: 'day' | 'month' | 'year'): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (precision === 'year') return String(date.getUTCFullYear());
  if (precision === 'month') return `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
  return `${String(date.getUTCDate()).padStart(2, '0')} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** Source de l'adaptation (`MediaSourceObj`). */
export const SOURCE_LABELS: Record<string, string> = {
  ORIGINAL: 'Original',
  MANGA: 'Manga',
  MANHWA: 'Manhwa',
  MANHUA: 'Manhua',
  LIGHT_NOVEL: 'Light novel',
  VISUAL_NOVEL: 'Visual novel',
  WEB_NOVEL: 'Web novel',
  GAME: 'Jeu video',
  NOVEL: 'Roman',
  ANIME: 'Anime',
};

/** Libellés des formats de manga (`MangaFormatObj`). */
export const MANGA_FORMAT_LABELS: Record<string, string> = {
  MANGA: 'Manga',
  MANHWA: 'Manhwa',
  MANHUA: 'Manhua',
  LIGHT_NOVEL: 'Light novel',
  WEB_LOVEL: 'Web novel',
  GRAPHIC_NOVEL: 'Graphic novel',
  DOUJINSHI: 'Doujinshi',
  ONE_SHOT: 'One shot',
  OTHER: 'Autre',
  UNKNOWN: 'Inconnu',
};

/** Libellés des formats d'anime (`AnimeFormatObj`), dans l'ordre des filtres du site. */
export const ANIME_FORMAT_LABELS: Record<string, string> = {
  SERIE: 'Série',
  SERIE_COURTE: 'Série courte',
  FILM: 'Film',
  ONA: 'ONA',
  OVA: 'OVA',
  SPECIAL: 'Spécial',
  UNKNOWN: 'Inconnu',
};

/** Libellé d'une relation entre œuvres, par son rang dans `MediaRelationLabelArray`. */
export const RELATION_LABELS = [
  'Suite',
  'Préquelle',
  'Histoire parallèle',
  'Spin-off',
  'Suite alternative',
  'Réadaptation',
  'Film',
  'Manga',
  'Manhwa',
  'Manhua',
  'Light novel',
  'Visual novel',
  'Web novel',
  'Roman',
  'Anime',
  'Adaptation',
  'Récapitulatif',
];

/** « Saison 2 », « Saison 2 Partie 1 » (`getSeasonLabel`). */
export function seasonLabel(season?: { number: number; part?: number } | null): string | undefined {
  if (!season) return undefined;
  return season.part ? `Saison ${season.number} Partie ${season.part}` : `Saison ${season.number}`;
}

/** Libellés des types d'actualité (`NewsArticleTypeObj` des types partagés). */
export const NEWS_TYPE_LABELS: Record<string, string> = {
  SEASON_ANNOUNCEMENT: 'Annonce de saison',
  ADAPTATION_ANNOUNCEMENT: 'Annonce d’adaptation',
  RELEASE_DATE: 'Date de sortie',
  TRAILER: 'Trailer / PV',
  VISUAL: 'Visuel',
  CASTING: 'Casting / Staff',
  NEWS: 'Information',
};

/** Visuel d'une actualité : bannière, puis galerie, puis affiche (`getNewsArticleCover` du site). */
export function newsCover(article: {
  bannerUrl?: string | null;
  visuals?: string[];
  posterUrl?: string | null;
}): string | null {
  return article.bannerUrl ?? article.visuals?.[0] ?? article.posterUrl ?? null;
}
