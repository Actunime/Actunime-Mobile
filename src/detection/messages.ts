/** Détection brute d'une page de lecture/visionnage, telle que postée par le script injecté. */
export interface PageDetection {
  kind: 'anime' | 'manga';
  title: string;
  chapter?: number;
  episode?: number;
  season?: number;
  imageUrl?: string;
  url: string;
  host: string;
}

/** Messages du script injecté vers l'app (`window.ReactNativeWebView.postMessage`, JSON). */
export type InPageMessage =
  | { type: 'detection'; detection: PageDetection | null }
  | { type: 'progress-reached'; detection: PageDetection };

export function parseInPageMessage(raw: string): InPageMessage | null {
  try {
    const value = JSON.parse(raw) as InPageMessage;
    if (value?.type === 'detection' || value?.type === 'progress-reached') return value;
  } catch {
    // message étranger à Actunime (la page peut aussi poster dans ce canal)
  }
  return null;
}
