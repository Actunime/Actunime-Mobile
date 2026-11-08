import { SupporterPerkObj, ContributionTiers, type ISupporterPerk } from '@actunime/types';

import { billingMode, type BillingMode, type IBillingAvailability, type IBillingStatus } from './billing-model';

/** Avantages de l'offre, dans l'ordre des paliers, avec le palier qui les débloque aussi (hors Soutien seul). */
export function supportBenefits(): { perk: ISupporterPerk; label: string; unlock: string | null }[] {
  return (Object.keys(SupporterPerkObj) as ISupporterPerk[]).map((perk) => {
    const tier = ContributionTiers[SupporterPerkObj[perk].tier - 1];
    // Les auras de Soutien et la fin des contenus sponsorisés ont leur propre règle : on ne les range pas sous un palier ici.
    return { perk, label: SupporterPerkObj[perk].label, unlock: tier ? `${tier.label} (${tier.min} contributions)` : null };
  });
}

/** Ce que voit le membre : tarifs et paiement seulement à l'ouverture (ou pour un administrateur, avant). */
export function supportMode(availability: IBillingAvailability | undefined, status: IBillingStatus | undefined): BillingMode {
  if (!availability) return 'soon';
  return billingMode({ open: availability.open, enabled: availability.enabled, isAdmin: !!status?.canUse && !availability.open });
}

/** Texte de l'état de l'abonnement d'un membre, ou `null` quand il n'est pas Soutien. */
export function supportStatusLine(status: IBillingStatus | undefined, formatDate: (value: string) => string | null): string | null {
  if (!status?.isSupporter) return null;
  const sub = status.subscription;
  const end = formatDate(sub?.currentPeriodEnd ?? status.until ?? status.passUntil ?? '');
  if (sub?.cancelAtPeriodEnd && end) return `Abonnement résilié : tes avantages restent actifs jusqu’au ${end}.`;
  if (sub && end) return `Abonnement actif, renouvelé le ${end}.`;
  if (status.passUntil && end) return `Pass actif jusqu’au ${end}, sans renouvellement.`;
  return end ? `Soutien actif jusqu’au ${end}.` : 'Soutien actif.';
}
