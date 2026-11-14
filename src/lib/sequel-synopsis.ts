import type { IAnime, IManga } from '@actunime/types';

/** Texte affiché à la place du synopsis d'une suite qui n'en a pas (E182), comme sur le site : rien n'est écrit en base. */
export const SEQUEL_SYNOPSIS = 'La suite des évènements de la saison précédente.';

/** Saison 2 ou plus. */
export function isSequel(media: Pick<IAnime | IManga, 'season'>): boolean {
  return (media.season?.number ?? 1) > 1;
}

/**
 * Synopsis à afficher : celui de la fiche, sinon le texte de suite pour une saison 2 ou plus, sinon `null`.
 * `automatic` distingue le texte de suite, qu'un membre peut toujours remplacer par un vrai synopsis.
 */
export function displaySynopsis(
  media: Pick<IAnime | IManga, 'synopsis' | 'season'>
): { text: string; automatic: boolean } | null {
  const own = media.synopsis?.trim();
  if (own) return { text: own, automatic: false };
  return isSequel(media) ? { text: SEQUEL_SYNOPSIS, automatic: true } : null;
}
