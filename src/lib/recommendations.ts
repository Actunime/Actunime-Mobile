/**
 * Recommandations d'une fiche à un ami (E149). Les types et validations ne sont pas encore dans les versions
 * publiées de `@actunime/types` et `validations` : le contrat est recopié ici depuis `types/src/entity/social` et
 * `validations/src/social/_recommendation.ts`, à remplacer par un import au prochain bump.
 */

export const RECOMMENDATION_REASONS = {
  STORY: "Pour l'histoire",
  CHARACTERS: 'Pour les personnages',
  ATMOSPHERE: "Pour l'ambiance",
  ART_MUSIC: "Pour l'animation et la musique",
  RELAX: 'Pour se détendre',
  EMOTIONS: 'Pour les émotions',
  LIKE_YOU: 'Parce que ça te ressemble',
} as const;
export type IRecommendationReason = keyof typeof RECOMMENDATION_REASONS;
export const REASON_KEYS = Object.keys(RECOMMENDATION_REASONS) as IRecommendationReason[];

export type IRecommendationStatus = 'PENDING' | 'ACCEPTED' | 'LATER' | 'DECLINED';
export type IRecommendationAnswer = Exclude<IRecommendationStatus, 'PENDING'>;

/** Nombre maximal de recommandations par membre sur 24 h, et longueur du message libre. */
export const RECOMMENDATION_DAILY_LIMIT = 10;
export const RECOMMENDATION_MESSAGE_MAX = 200;

export interface IRecommendationMember {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string | null;
  signature?: import('@actunime/types').IMemberSignature | null;
  contributionTier?: number;
}

export interface IRecommendation {
  id: string;
  fromId: string;
  toId: string;
  mediaId: string;
  mediaType: 'Anime' | 'Manga';
  reason: IRecommendationReason;
  message?: string | null;
  status: IRecommendationStatus;
  createdAt: string;
  from?: IRecommendationMember | null;
  media?: { id: string; title?: { original?: string; normal?: string } | null; image?: unknown; format?: string | null } | null;
}

export interface IRecommendationCreate {
  toId: string;
  mediaId: string;
  mediaType: 'Anime' | 'Manga';
  reason: IRecommendationReason | null;
  message: string;
}

/** Ce qui empêche l'envoi (en français), ou `null`. */
export function recommendationProblem(input: IRecommendationCreate): string | null {
  if (!input.toId) return 'Choisis un ami.';
  if (!input.reason) return 'Choisis un motif.';
  if (input.message.trim().length > RECOMMENDATION_MESSAGE_MAX) return `Le message ne peut pas dépasser ${RECOMMENDATION_MESSAGE_MAX} caractères.`;
  return null;
}

/** Corps de `POST /recommendations` : message rogné, absent quand il est vide (l'API refuse un message vide). */
export function recommendationBody(input: IRecommendationCreate) {
  const message = input.message.trim();
  return { toId: input.toId, mediaId: input.mediaId, mediaType: input.mediaType, reason: input.reason as IRecommendationReason, ...(message ? { message } : {}) };
}

/** Statut d'ajout à la liste quand j'accepte une recommandation. */
export const plannedStatus = (mediaType: 'Anime' | 'Manga') => (mediaType === 'Anime' ? 'PLAN_TO_WATCH' : 'PLAN_TO_READ') as 'PLAN_TO_WATCH' | 'PLAN_TO_READ';

/** L'œuvre est déjà dans ma liste : l'ajout n'est plus à faire, la réponse « ajoutée » reste vraie. */
export const isAlreadyInList = (error: unknown): boolean => error instanceof Error && /déjà dans (votre|ta) liste/i.test(error.message);

export const recommendationTitle = (rec: IRecommendation): string => rec.media?.title?.normal ?? rec.media?.title?.original ?? 'Fiche';
export const recommendationSender = (rec: IRecommendation): string => rec.from?.displayName || rec.from?.username || 'Un ami';
export const recommendationPoster = (rec: IRecommendation): string | undefined => (typeof rec.media?.image === 'string' ? rec.media.image : undefined);

/** Les erreurs de l'API sont déjà rédigées en français (quota, doublon, pas amis) : on les garde, sinon un texte neutre. */
export const recommendationError = (error: unknown): string => (error instanceof Error && error.message && !/^HTTP \d+$/.test(error.message) ? error.message : 'La recommandation n’a pas pu être envoyée.');
