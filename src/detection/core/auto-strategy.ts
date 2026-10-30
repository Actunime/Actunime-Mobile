import { isPlausibleTitle, titleKey } from './title-quality';
import type { StrategyId, StrategyResult } from './types';

/**
 * Confiance minimale pour suivre une page sans que l'utilisateur ait configuré le site. À 0,65, il faut un titre
 * ET un numéro (titre seul : 0,5 au mieux), sinon une page d'accueil ou de liste serait prise pour un chapitre.
 */
export const AUTO_MIN_CONFIDENCE = 0.65;

/**
 * Fiabilité du TITRE selon la source, de la plus sûre à la moins sûre : les données structurées du site d'abord,
 * l'adresse en dernier (un slug est une approximation du titre, pas le titre). La confiance d'une stratégie mêle
 * titre et numéro : elle ne sert pas à choisir le titre, sinon une adresse à 0,7 passe devant un `og:title` à 0,65.
 */
const TITLE_PRIORITY: readonly StrategyId[] = ['jsonld', 'og', 'document-title', 'dom-selectors', 'url-tokens', 'manual'];

const byTitlePriority = (a: StrategyResult, b: StrategyResult) => TITLE_PRIORITY.indexOf(a.id) - TITLE_PRIORITY.indexOf(b.id);

/**
 * Titre et numéro d'une page reconnue sans réglage. Le titre vient de la source de titre la plus fiable ; le numéro de
 * cette même source, sinon de la source la plus confiante qui en trouve un. `id` est la source du titre : c'est elle
 * qui est mémorisée pour le site.
 */
export function pickAutoStrategy(results: readonly StrategyResult[]): StrategyResult | null {
  const withTitle = results.filter((result) => isPlausibleTitle(result.title)).sort(byTitlePriority);
  const withNumber = results
    .filter((result) => result.episode !== undefined)
    .sort((a, b) => b.confidence - a.confidence);
  const source = withTitle.find((result) => result.episode !== undefined) ?? withTitle[0];
  const numberSource = source?.episode !== undefined ? source : withNumber[0];
  if (!source || !numberSource) return null;
  // titre ET numéro doivent venir d'au moins une source assez sûre
  if (Math.max(source.confidence, numberSource.confidence) < AUTO_MIN_CONFIDENCE) return null;
  return { ...source, episode: numberSource.episode, season: source.season ?? numberSource.season };
}

export interface ITitleAlternative {
  /** Stratégie à mémoriser pour le site si l'utilisateur choisit ce titre. */
  strategy: StrategyId;
  title: string;
}

/** Les autres titres que la page propose, sans doublon ni identifiant, pour corriger une reconnaissance fausse. */
export function titleAlternatives(
  results: readonly StrategyResult[],
  current: string | undefined,
  limit = 4,
): ITitleAlternative[] {
  const seen = new Set(current ? [titleKey(current)] : []);
  const out: ITitleAlternative[] = [];
  for (const result of [...results].sort(byTitlePriority)) {
    if (!isPlausibleTitle(result.title)) continue;
    const key = titleKey(result.title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ strategy: result.id, title: result.title });
    if (out.length === limit) break;
  }
  return out;
}
