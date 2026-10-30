export type ProgressResult = 'created' | 'updated' | 'unchanged';

/**
 * Message court après l'écriture de la progression : le chapitre ou l'épisode, rien d'autre. Il s'affiche dans la
 * pastille, qui n'a qu'une ligne : le titre de l'œuvre la rendait illisible (il est déjà à l'écran).
 */
export function progressNotice(kind: 'anime' | 'manga', number: number, result: ProgressResult): string {
  const label = `${kind === 'manga' ? 'Chapitre' : 'Épisode'} ${number}`;
  if (result === 'unchanged') return `${label} déjà enregistré`;
  return result === 'created' ? `${label} ajouté à ta liste` : `${label} enregistré`;
}
