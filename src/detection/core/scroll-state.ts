export type ScrollEdge = 'top' | 'middle' | 'bottom';

export interface IScrollState {
  edge: ScrollEdge;
  /** Part de la page déjà défilée, de 0 à 100. */
  percent: number;
}

/** Marge sous laquelle on considère être en bas : les pages n'arrivent pas toujours au pixel près. */
const BOTTOM_MARGIN = 6;

/** Position de lecture à partir du défilement `y` et du défilement maximal (`scrollHeight - innerHeight`). */
export function scrollState(y: number, max: number): IScrollState {
  const edge: ScrollEdge = y <= 0 ? 'top' : max > 0 && y >= max - BOTTOM_MARGIN ? 'bottom' : 'middle';
  const percent = max > 0 ? Math.round(Math.min(100, Math.max(0, (y / max) * 100))) : 0;
  return { edge, percent };
}
