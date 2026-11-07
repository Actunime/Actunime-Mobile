import { useCallback, useEffect, useState } from 'react';
import { AppState, PermissionsAndroid, Platform, StyleSheet, Switch, View } from 'react-native';

import { Button } from '@/components/button';
import { SettingsCard } from '@/components/settings/settings-ui';
import { Txt } from '@/components/tw';
import { Tw } from '@/constants/theme';
import { PhoneNotifications, type IPhoneNotificationsStatus } from '../../../modules/actunime-notifications/src';

const readStatus = (): IPhoneNotificationsStatus | null => {
  try {
    return PhoneNotifications.getStatus();
  } catch {
    return null;
  }
};

/** Notifications sur ce téléphone : interrogation régulière (par défaut) et mode instantané (option), sans service externe. */
export function PhoneNotificationsCard() {
  const [status, setStatus] = useState<IPhoneNotificationsStatus | null>(readStatus);
  const refresh = useCallback(() => setStatus(readStatus()), []);

  // Les réglages du système (permission, batterie) se changent hors de l'app : on relit au retour.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => state === 'active' && refresh());
    return () => subscription.remove();
  }, [refresh]);

  if (!status) return null;

  const allow = async () => {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const result = await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS' as never);
      if (result !== PermissionsAndroid.RESULTS.GRANTED) PhoneNotifications.openNotificationSettings();
    } else {
      PhoneNotifications.openNotificationSettings();
    }
    refresh();
  };

  return (
    <SettingsCard>
      <Txt size="base" weight="medium">
        Sur ce téléphone
      </Txt>
      {!status.canNotify ? (
        <View style={styles.block}>
          <Txt size="sm" color={Tw.color.mutedForeground}>
            Les notifications sont désactivées pour Actunime : tu ne seras prévenu de rien tant que tu ne les autorises pas.
          </Txt>
          <Button label="Autoriser les notifications" onPress={() => void allow()} />
        </View>
      ) : null}

      <View style={styles.row}>
        <View style={styles.flex}>
          <Txt size="sm" weight="semibold">
            Vérifier régulièrement
          </Txt>
          <Txt size="xs" color={Tw.color.mutedForeground}>
            L’app interroge Actunime environ toutes les 15 minutes, même fermée. Discret pour la batterie, mais pas instantané.
          </Txt>
        </View>
        <Switch value={status.polling} onValueChange={(value) => { PhoneNotifications.setPolling(value); refresh(); }} />
      </View>

      <View style={styles.row}>
        <View style={styles.flex}>
          <Txt size="sm" weight="semibold">
            Notifications instantanées
          </Txt>
          <Txt size="xs" color={Tw.color.mutedForeground}>
            Reste connecté en permanence pour être prévenu tout de suite. Android affiche alors une icône fixe, et ça consomme un peu plus de batterie.
          </Txt>
        </View>
        <Switch value={status.instant} onValueChange={(value) => { PhoneNotifications.setInstant(value); refresh(); }} />
      </View>

      <Button label="Vérifier maintenant" variant="outline" disabled={!status.sessionReady} onPress={() => PhoneNotifications.checkNow()} />

      {status.instant && !status.batteryExempt ? (
        <View style={styles.block}>
          <Txt size="xs" color={Tw.color.mutedForeground}>
            Pour que le mode instantané reste actif, exclus Actunime de l’optimisation de batterie : certains téléphones (Xiaomi, Samsung, Huawei, OnePlus…) coupent sinon la connexion en arrière-plan.
          </Txt>
          <Button label="Exclure de l’optimisation de batterie" variant="outline" onPress={() => PhoneNotifications.openBatterySettings()} />
        </View>
      ) : null}
      {!status.sessionReady ? (
        <Txt size="xs" color={Tw.color.mutedForeground}>
          Ouvre Actunime connecté pour activer les notifications du téléphone.
        </Txt>
      ) : null}
    </SettingsCard>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  block: { gap: 8 },
});
