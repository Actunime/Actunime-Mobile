import type { IMedia, MediaKind } from './api';

/** Ce que le membre peut corriger depuis l'app sur une fiche existante. */
export interface IMediaDraft {
  synopsis: string;
  total?: number;
  status?: string;
  start: string | null;
  end: string | null;
}

export function draftOf(media: IMedia, kind: MediaKind): IMediaDraft {
  return {
    synopsis: media.synopsis ?? '',
    total: kind === 'manga' ? media.chaptersInfo?.total : media.episodesInfo?.total,
    status: media.status,
    start: media.date?.start ? String(media.date.start) : null,
    end: media.date?.end ? String(media.date.end) : null,
  };
}

const sameDay = (a: string | null, b: string | null) => (a ?? '').slice(0, 10) === (b ?? '').slice(0, 10);

/**
 * Corps `mainDependency` d'une proposition de mise à jour : seulement les champs que le membre a changés
 * (l'API compare à la fiche et ne retient que les différences). Vide : rien à proposer.
 */
export function buildMediaUpdate(kind: MediaKind, original: IMediaDraft, draft: IMediaDraft): Record<string, unknown> {
  const update: Record<string, unknown> = {};
  if (draft.synopsis.trim() !== original.synopsis.trim()) update.synopsis = draft.synopsis.trim();
  if (draft.total !== undefined && draft.total !== original.total) {
    update[kind === 'manga' ? 'chaptersInfo' : 'episodesInfo'] = { total: draft.total };
  }
  if (draft.status && draft.status !== original.status) update.status = draft.status;
  const date: Record<string, string> = {};
  // L'API attend des jours (AAAA-MM-JJ), pas des horodatages.
  if (draft.start && !sameDay(draft.start, original.start)) date.start = draft.start.slice(0, 10);
  if (draft.end && !sameDay(draft.end, original.end)) date.end = draft.end.slice(0, 10);
  if (Object.keys(date).length > 0) update.date = date;
  return update;
}

/** Relations qu'un membre peut ajouter à une fiche depuis l'app. */
export type RelationKind = 'tracks' | 'companies';

export interface IRelationPick {
  id: string;
  /** Musique : épisodes concernés (ouverture sur les épisodes 1 à 12, par exemple), facultatifs. */
  startEpisode?: number;
  endEpisode?: number;
}

/** Corps d'une proposition qui ajoute une relation (musique, société) à une fiche existante, sans toucher à ses champs. */
export function buildRelationAdd(what: RelationKind, pick: IRelationPick): Record<string, unknown> {
  if (what === 'companies') return { companies: [{ id: pick.id }] };
  const track: Record<string, unknown> = { id: pick.id };
  // 0 = champ laissé vide (le sélecteur affiche 0 tant qu'on n'a rien choisi).
  if (pick.startEpisode && pick.startEpisode > 0) track.startEpisode = pick.startEpisode;
  if (pick.endEpisode && pick.endEpisode > 0) track.endEpisode = pick.endEpisode;
  return { tracks: [track] };
}
