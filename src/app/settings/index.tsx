import { router, type Href } from 'expo-router';
import { Ban, Lock, MonitorSmartphone, User, Users } from 'lucide-react-native';

import { SettingsCard, SettingsLink, SettingsPage } from '@/components/settings/settings-ui';

const go = (path: string) => router.push(path as Href);

/** Paramètres du compte (`/settings` du site) : un écran par section, tous dans l'app. */
export default function SettingsHub() {
  return (
    <SettingsPage title="Paramètres" description="Ton profil, qui peut le voir, tes amis et les appareils connectés.">
      <SettingsCard>
        <SettingsLink icon={User} label="Profil" hint="Nom affiché et présentation" onPress={() => go('/settings/profile')} />
        <SettingsLink icon={Lock} label="Confidentialité" hint="Qui peut voir ton profil, tes listes et tes activités" onPress={() => go('/settings/confidentialite')} />
      </SettingsCard>
      <SettingsCard>
        <SettingsLink icon={Users} label="Amis" hint="Demandes reçues et envoyées" onPress={() => go('/settings/amis')} />
        <SettingsLink icon={Ban} label="Blocages" hint="Membres que tu as bloqués" onPress={() => go('/settings/blocages')} />
      </SettingsCard>
      <SettingsCard>
        <SettingsLink icon={MonitorSmartphone} label="Appareils" hint="Où ton compte est connecté" onPress={() => go('/settings/appareils')} />
      </SettingsCard>
    </SettingsPage>
  );
}
