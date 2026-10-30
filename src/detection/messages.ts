import type { LearnedPattern, StrategyId, StrategyResult } from './core/types';

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
  /**
   * `learned` = pattern configuré (ou mémorisé) pour le site, `generic` = heuristiques de lecture de la page,
   * `auto` = reconnue par la phase automatique (stratégies de l'assistant, sans configuration).
   */
  source: 'learned' | 'generic' | 'auto';
  /** Stratégie qui a reconnu la page (`auto` seulement) : mémorisée pour le site une fois l'œuvre identifiée. */
  strategy?: StrategyId;
}

/** Élément pointé par l'utilisateur pendant l'assistant de configuration. */
export interface PickedElement {
  selector: string;
  text: string;
  /** Nombres de 1 à 4 chiffres trouvés dans le texte, dans l'ordre. */
  tokens: number[];
}

/** Messages du script injecté vers l'app (`window.ReactNativeWebView.postMessage`, JSON). */
export type InPageMessage =
  | { type: 'ready'; host: string; inferredKind: 'anime' | 'manga' }
  | { type: 'detection'; detection: PageDetection | null }
  | { type: 'progress-reached'; detection: PageDetection }
  | { type: 'strategies'; results: StrategyResult[] }
  | { type: 'picked'; element: PickedElement }
  | { type: 'pick-cancelled' };

/** Commandes de l'app vers le script injecté (`injectJavaScript`). */
export type InPageCommand =
  | { type: 'set-pattern'; pattern: LearnedPattern | null }
  | { type: 'run-strategies' }
  | { type: 'start-pick'; label: string; color: string }
  | { type: 'stop-pick' };

const MESSAGE_TYPES = ['ready', 'detection', 'progress-reached', 'strategies', 'picked', 'pick-cancelled'];

export function parseInPageMessage(raw: string): InPageMessage | null {
  try {
    const value = JSON.parse(raw) as InPageMessage;
    if (value && MESSAGE_TYPES.includes(value.type)) return value;
  } catch {
    // message étranger à Actunime (la page peut aussi poster dans ce canal)
  }
  return null;
}

/** Script à passer à `injectJavaScript` pour envoyer une commande au script injecté. */
export function commandScript(command: InPageCommand): string {
  return `window.__actunime && window.__actunime.handle(${JSON.stringify(JSON.stringify(command))}); true;`;
}
