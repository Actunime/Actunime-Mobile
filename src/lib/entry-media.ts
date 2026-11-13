import type { IListEntry, IMedia } from './api';

/** Œuvre affichable d'une entrée : la fiche, ou l'aperçu d'une proposition en attente (ajout rapide pas encore validé). */
export const mediaOf = (entry: IListEntry): IMedia =>
  (entry.media ?? {
    title: { original: entry.preview?.title || 'Titre inconnu' },
    posterUrl: entry.preview?.coverImage ?? null,
  }) as IMedia;

/** Entrée dont l'œuvre attend d'être référencée : pas de fiche, mais une proposition (ajout rapide). */
export const isPendingEntry = (entry: IListEntry): boolean => !entry.mediaId && !!entry.proposalId;

/** Entrée qu'on sait afficher : une fiche existante ou une proposition en attente. */
export const isDisplayableEntry = (entry: IListEntry): boolean => (!!entry.media && !!entry.mediaId) || isPendingEntry(entry);
