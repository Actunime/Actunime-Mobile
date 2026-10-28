import type { IListEntry, IListEntryFields, ListStatus, ListVisibility } from './api';

/**
 * Logique du formulaire « Ajouter à ma liste », reprise de l'`AddToListDialog` du site
 * (`ui/src/components/AddToListDialog/AddToListDialog.tsx`) pour que les deux écrans se comportent pareil.
 */

export type ListMediaType = 'Anime' | 'Manga';

export const ANIME_STATUSES: ListStatus[] = ['WATCHING', 'COMPLETED', 'ON_HOLD', 'DROPPED', 'PLAN_TO_WATCH'];
export const MANGA_STATUSES: ListStatus[] = ['READING', 'COMPLETED', 'ON_HOLD', 'DROPPED', 'PLAN_TO_READ'];

export const STATUS_LABELS: Record<ListStatus, string> = {
  WATCHING: 'En cours de visionnage',
  READING: 'En cours de lecture',
  COMPLETED: 'Terminé',
  ON_HOLD: 'En pause',
  DROPPED: 'Abandonné',
  PLAN_TO_WATCH: 'Planifié',
  PLAN_TO_READ: 'Planifié',
};

export const VISIBILITY_LABELS: Record<ListVisibility, string> = {
  PUBLIC: 'Public',
  FRIENDS_ONLY: 'Amis uniquement',
  PRIVATE: 'Privé',
};

export const MEDIA_STATUS_LABELS: Record<string, string> = {
  AIRING: 'En cours',
  PAUSED: 'En pause',
  ENDED: 'Terminé',
  STOPPED: 'Arrêté',
  POSTONED: 'Reporté',
  SOON: 'Bientôt',
  UNKNOWN: 'Inconnu',
};

export const PROGRESS_STATUSES: ListStatus[] = ['COMPLETED', 'WATCHING', 'READING', 'DROPPED', 'ON_HOLD'];
export const RATING_STATUSES: ListStatus[] = ['COMPLETED', 'WATCHING', 'READING', 'DROPPED'];
export const REWATCH_STATUSES: ListStatus[] = ['COMPLETED', 'WATCHING', 'READING'];

export const statusesFor = (mediaType: ListMediaType): ListStatus[] =>
  mediaType === 'Anime' ? ANIME_STATUSES : MANGA_STATUSES;

export const defaultStatus = (mediaType: ListMediaType): ListStatus =>
  mediaType === 'Anime' ? 'PLAN_TO_WATCH' : 'PLAN_TO_READ';

export interface IListForm {
  status: ListStatus;
  score?: number;
  episodesWatched?: number;
  chaptersRead?: number;
  volumesRead?: number;
  notes: string;
  notesPublic: boolean;
  startedAt: string | null;
  completedAt: string | null;
  onHoldSince: string | null;
  rewatchCount: number;
  visibility: ListVisibility;
}

export function entryToForm(mediaType: ListMediaType, entry?: IListEntry | null): IListForm {
  return {
    status: entry?.status ?? defaultStatus(mediaType),
    score: entry?.score,
    episodesWatched: entry?.episodesWatched,
    chaptersRead: entry?.chaptersRead,
    volumesRead: entry?.volumesRead,
    notes: entry?.notes ?? '',
    notesPublic: entry?.notesPublic ?? false,
    startedAt: entry?.startedAt ?? null,
    completedAt: entry?.completedAt ?? null,
    onHoldSince: entry?.onHoldSince ?? null,
    rewatchCount: entry?.rewatchCount ?? 0,
    visibility: entry?.visibility ?? 'PUBLIC',
  };
}

/** Pourquoi un statut n'est pas choisissable pour cette œuvre (`null` : choisissable). */
export function disabledReason(mediaType: ListMediaType, mediaStatus: string | undefined, status: ListStatus) {
  if (!mediaStatus) return null;
  if (['COMPLETED', 'ON_HOLD', 'DROPPED', 'WATCHING', 'READING'].includes(status) && ['SOON', 'UNKNOWN'].includes(mediaStatus)) {
    return mediaType === 'Anime' ? "Cet anime n'est pas encore diffusé." : "Ce manga n'est pas encore publié.";
  }
  if (status === 'COMPLETED' && mediaStatus === 'AIRING') {
    return `La ${mediaType === 'Anime' ? 'diffusion' : 'publication'} est toujours en cours.`;
  }
  return null;
}

interface IStatusContext {
  mediaType: ListMediaType;
  /** Dates déjà enregistrées sur l'entrée : on ne les écrase pas. */
  entry?: IListEntry | null;
  totalEpisodes?: number;
  now?: Date;
}

/**
 * Change le statut et complète les dates comme le site : « Terminé » pose la fin, le début et (anime) tous les
 * épisodes ; « En cours » pose le début ; « En pause » pose la date de pause. Une date déjà saisie est conservée.
 */
export function applyStatus(form: IListForm, status: ListStatus, ctx: IStatusContext): IListForm {
  const now = (ctx.now ?? new Date()).toISOString();
  const next: IListForm = { ...form, status };
  if (status === 'COMPLETED') {
    if (!ctx.entry?.completedAt && !form.completedAt) next.completedAt = now;
    if (!ctx.entry?.startedAt && !form.startedAt) next.startedAt = now;
    if (ctx.mediaType === 'Anime' && ctx.totalEpisodes) next.episodesWatched = ctx.totalEpisodes;
  }
  if ((status === 'WATCHING' || status === 'READING') && !ctx.entry?.startedAt && !form.startedAt) {
    next.startedAt = now;
  }
  if (status === 'ON_HOLD' && !ctx.entry?.onHoldSince && !form.onHoldSince) next.onHoldSince = now;
  return next;
}

/** Corps envoyé à l'API : seulement la progression du bon type de média, notes vides omises. */
export function buildFields(form: IListForm, mediaType: ListMediaType): IListEntryFields {
  const fields: IListEntryFields = {
    status: form.status,
    score: form.score,
    notes: form.notes.trim() ? form.notes.trim() : undefined,
    notesPublic: form.notesPublic,
    startedAt: form.startedAt,
    completedAt: form.completedAt,
    onHoldSince: form.onHoldSince,
    rewatchCount: form.rewatchCount,
    visibility: form.visibility,
  };
  if (mediaType === 'Anime') fields.episodesWatched = form.episodesWatched;
  else {
    fields.chaptersRead = form.chaptersRead;
    fields.volumesRead = form.volumesRead;
  }
  return fields;
}

/** Corps de mise à jour : les notes effacées partent en chaîne vide pour être vraiment retirées. */
export function buildUpdate(form: IListForm, mediaType: ListMediaType): Partial<IListEntryFields> {
  return { ...buildFields(form, mediaType), notes: form.notes.trim() };
}

/** Note de 0 à 10 par demi-points. */
export const clampScore = (value: number): number => Math.min(10, Math.max(0, Math.round(value * 2) / 2));

export function formatScore(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ',');
}

export function formatFrenchDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}
