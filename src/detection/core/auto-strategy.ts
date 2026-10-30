import type { StrategyResult } from './types';

/**
 * Confiance minimale pour suivre une page sans que l'utilisateur ait configuré le site. À 0,65, il faut un titre
 * ET un numéro (titre seul : 0,5 au mieux), sinon une page d'accueil ou de liste serait prise pour un chapitre.
 */
export const AUTO_MIN_CONFIDENCE = 0.65;

/** Stratégie retenue pour reconnaître une page toute seule : titre et numéro trouvés, la plus fiable d'abord. */
export function pickAutoStrategy(results: readonly StrategyResult[]): StrategyResult | null {
  const usable = results.filter(
    (result) => result.title && result.episode !== undefined && result.confidence >= AUTO_MIN_CONFIDENCE,
  );
  return usable.slice().sort((a, b) => b.confidence - a.confidence)[0] ?? null;
}
