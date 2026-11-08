import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react-native';
import { useEffect } from 'react';
import { Alert, AppState, Linking, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { SettingsCard, SettingsPage, StatusNote } from '@/components/settings/settings-ui';
import { ErrorState, Loading, errorMessage } from '@/components/states';
import { Txt } from '@/components/tw';
import { Tw, alpha } from '@/constants/theme';
import { billingApi, canPay, PASS_OFFERS, SUPPORTER_OFFERS, type ISupporterOffer } from '@/lib/billing';
import { formatLongDate } from '@/lib/media';
import { supportBenefits, supportMode, supportStatusLine } from '@/lib/support';

/** Ouvre la page hébergée de Stripe dans le navigateur du téléphone : l'app ne voit jamais de donnée de carte. */
const openStripe = (url: string) => void Linking.openURL(url);

function Offer({ offer, busy, onChoose }: Readonly<{ offer: ISupporterOffer; busy: boolean; onChoose: (offer: ISupporterOffer) => void }>) {
  return (
    <View style={styles.offer}>
      <View style={styles.offerHead}>
        <Txt size="base" weight="semibold" style={styles.flex}>
          {offer.label}
        </Txt>
        {offer.highlight ? (
          <View style={styles.highlight}>
            <Txt size="xs" weight="semibold" color={Tw.color.green400}>
              {offer.highlight}
            </Txt>
          </View>
        ) : null}
      </View>
      <Txt size="lg" weight="bold">
        {offer.price} <Txt size="sm" color={Tw.color.mutedForeground}>{offer.period}</Txt>
      </Txt>
      <Txt size="xs" color={Tw.color.mutedForeground}>
        {offer.description}
      </Txt>
      <Button label={busy ? 'Ouverture…' : 'Choisir'} disabled={busy} onPress={() => onChoose(offer)} />
    </View>
  );
}

/** Soutenir Actunime (`/soutenir` et `/settings/abonnement` du site) : avantages, offres, abonnement. */
export default function SupportScreen() {
  const client = useQueryClient();
  const availability = useQuery({ queryKey: ['billing', 'availability'], queryFn: billingApi.availability, retry: false });
  const status = useQuery({ queryKey: ['billing', 'status'], queryFn: billingApi.status, retry: false });

  // Le paiement se termine dans le navigateur : au retour dans l'app, l'état est relu.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void client.invalidateQueries({ queryKey: ['billing'] });
        void client.invalidateQueries({ queryKey: ['my-appearance'] });
      }
    });
    return () => sub.remove();
  }, [client]);

  const checkout = useMutation({ mutationFn: (plan: ISupporterOffer['plan']) => billingApi.checkout(plan), onSuccess: ({ url }) => openStripe(url) });
  const portal = useMutation({ mutationFn: billingApi.portal, onSuccess: ({ url }) => openStripe(url) });
  const change = useMutation({
    mutationFn: (action: 'cancel' | 'resume') => (action === 'cancel' ? billingApi.cancel() : billingApi.resume()),
    onSuccess: (next) => client.setQueryData(['billing', 'status'], next),
  });

  if (availability.isPending || status.isPending) {
    return (
      <SettingsPage title="Soutenir Actunime">
        <Loading />
      </SettingsPage>
    );
  }
  if (availability.isError || status.isError) {
    return (
      <SettingsPage title="Soutenir Actunime">
        <ErrorState error={availability.error ?? status.error ?? new Error('Offre indisponible')} onRetry={() => { void availability.refetch(); void status.refetch(); }} />
      </SettingsPage>
    );
  }

  const mode = supportMode(availability.data, status.data);
  const line = supportStatusLine(status.data, formatLongDate);
  const sub = status.data.subscription;
  const askCancel = () =>
    Alert.alert('Résilier l’abonnement ?', 'Tes avantages restent actifs jusqu’à la fin de la période déjà payée.', [{ text: 'Garder', style: 'cancel' }, { text: 'Résilier', style: 'destructive', onPress: () => change.mutate('cancel') }]);

  return (
    <SettingsPage title="Soutenir Actunime" description="Actunime est gratuit et le reste. Le Soutien finance le site et débloque la personnalisation, sans rien retirer à personne.">
      {line ? <StatusNote tone="success">{line}</StatusNote> : null}

      <SettingsCard>
        <Txt size="base" weight="semibold">
          Ce que le Soutien débloque
        </Txt>
        {supportBenefits().map((benefit) => (
          <View key={benefit.perk} style={styles.benefit}>
            <Check size={16} color={Tw.color.green400} />
            <View style={styles.flex}>
              <Txt size="sm">{benefit.label}</Txt>
              {benefit.unlock ? (
                <Txt size="xs" color={Tw.color.mutedForeground}>
                  Aussi, pour toujours, dès {benefit.unlock}
                </Txt>
              ) : null}
            </View>
          </View>
        ))}
      </SettingsCard>

      {mode === 'soon' ? (
        <StatusNote tone="info">Les offres ouvrent bientôt. En attendant, la personnalisation se débloque en contribuant au catalogue.</StatusNote>
      ) : mode === 'unconfigured' ? (
        <StatusNote tone="info">Le paiement n’est pas encore configuré sur cette instance.</StatusNote>
      ) : (
        <>
          {mode === 'preview' ? <StatusNote tone="info">Aperçu administrateur : l’offre n’est pas encore ouverte au public.</StatusNote> : null}
          {status.data.isSupporter && sub ? (
            <SettingsCard>
              <Txt size="base" weight="semibold">
                Mon abonnement
              </Txt>
              {sub.cancelAtPeriodEnd ? (
                <Button label={change.isPending ? '…' : 'Réactiver l’abonnement'} disabled={change.isPending} onPress={() => change.mutate('resume')} />
              ) : (
                <Button label="Résilier l’abonnement" variant="outline" disabled={change.isPending} onPress={askCancel} />
              )}
              <Button label="Carte et factures" variant="outline" disabled={portal.isPending} onPress={() => portal.mutate()} />
            </SettingsCard>
          ) : null}
          {!sub && canPay(mode) ? (
            <>
              <Txt size="base" weight="semibold">
                Abonnement
              </Txt>
              {SUPPORTER_OFFERS.map((offer) => (
                <Offer key={offer.plan} offer={offer} busy={checkout.isPending} onChoose={(o) => checkout.mutate(o.plan)} />
              ))}
              <Txt size="base" weight="semibold">
                Sans renouvellement
              </Txt>
              {PASS_OFFERS.map((offer) => (
                <Offer key={offer.plan} offer={offer} busy={checkout.isPending} onChoose={(o) => checkout.mutate(o.plan)} />
              ))}
              <Txt size="xs" color={Tw.color.mutedForeground}>
                Le paiement se fait sur la page sécurisée de Stripe, dans ton navigateur : l’app ne voit jamais ta carte. Résiliation en ligne à tout moment.
              </Txt>
            </>
          ) : null}
          {checkout.isError || portal.isError || change.isError ? <StatusNote tone="error">{errorMessage(checkout.error ?? portal.error ?? change.error)}</StatusNote> : null}
        </>
      )}
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  benefit: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  offer: { gap: 8, padding: 16, borderRadius: Tw.radius.xl, backgroundColor: Tw.color.card },
  offerHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  highlight: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Tw.radius.full, backgroundColor: alpha(Tw.color.green400, 0.12) },
});
