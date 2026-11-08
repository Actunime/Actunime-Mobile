import type { IMemberPerks } from '@actunime/types';
import type { IMemberAppearanceBody } from '@actunime/validations';

/**
 * Offre Soutien (E132) : les routes `/billing/*` ne sont pas encore dans `@actunime/client` ; l'app passe par son
 * axios authentifié (jeton renouvelable), comme `lib/billing.ts` du site passe par `fetch`. Le paiement se fait sur la
 * page hébergée de Stripe : l'app ne voit jamais de donnée de carte.
 */

export type SupporterPlan = 'monthly' | 'annual' | 'pass_month' | 'pass_year';

export interface ISupporterOffer {
  plan: SupporterPlan;
  label: string;
  price: string;
  period: string;
  description: string;
  highlight?: string;
}

/** Prix affichés : alignés sur le catalogue Stripe (le montant réel est celui de la page de paiement). */
export const SUPPORTER_OFFERS: ISupporterOffer[] = [
  { plan: 'annual', label: 'Annuel', price: '29,99 €', period: 'par an', description: 'Deux mois offerts par rapport au mensuel. Renouvelé chaque année, résiliable à tout moment.', highlight: '2 mois offerts' },
  { plan: 'monthly', label: 'Mensuel', price: '2,99 €', period: 'par mois', description: 'Sans engagement. Renouvelé chaque mois, résiliable à tout moment.' },
];

export const PASS_OFFERS: ISupporterOffer[] = [
  { plan: 'pass_month', label: 'Pass 1 mois', price: '2,99 €', period: 'une fois', description: 'Payé une seule fois, sans renouvellement.' },
  { plan: 'pass_year', label: 'Pass 12 mois', price: '29,99 €', period: 'une fois', description: 'Payé une seule fois, sans renouvellement.' },
];

export interface IBillingAvailability {
  open: boolean;
  enabled: boolean;
}

export interface IBillingStatus {
  enabled: boolean;
  open: boolean;
  canUse: boolean;
  isSupporter: boolean;
  supporterSince: string | null;
  until: string | null;
  subscription: { status: string; plan?: SupporterPlan; currentPeriodEnd?: string; cancelAtPeriodEnd: boolean } | null;
  passUntil: string | null;
}

export interface IAppearanceResponse {
  appearance: IMemberAppearanceBody;
  backdropSamples?: [number, number, number][] | null;
  isSupporter: boolean;
  /** Avantages débloqués : Supporter payant, ou palier de contribution. */
  perks: IMemberPerks;
  tier: number;
}

/** Ce que voit un membre de l'offre : `soon` (rien à vendre encore), `preview` (admin avant ouverture), `open`, `unconfigured`. */
export type BillingMode = 'soon' | 'preview' | 'open' | 'unconfigured';

export function billingMode(input: { open: boolean; enabled: boolean; isAdmin: boolean }): BillingMode {
  if (!input.open && !input.isAdmin) return 'soon';
  if (!input.enabled) return 'unconfigured';
  return input.open ? 'open' : 'preview';
}

export const canPay = (mode: BillingMode): boolean => mode === 'open' || mode === 'preview';
