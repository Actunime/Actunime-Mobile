import { router, type Href } from 'expo-router';
import { Ban, Bell, Heart, Lock, MonitorSmartphone, Palette, ShieldCheck, Trash2, User, Users } from 'lucide-react-native';

import { Button } from '@/components/button';
import { AppUpdate } from '@/components/settings/app-update';
import { SettingsCard, SettingsLink, SettingsPage } from '@/components/settings/settings-ui';
import { signOut } from '@/lib/auth-store';

const go = (path: string) => router.push(path as Href);

/** Paramètres du compte (`/settings` du site) : un écran par section, tous dans l'app. */
export default function SettingsHub() {
  return (
    <SettingsPage title="Paramètres" description="Ton profil, tes notifications, qui peut te voir, tes amis et la sécurité du compte.">
      <SettingsCard>
        <SettingsLink icon={User} label="Modifier mon profil" hint="Photo, bannière, nom affiché et présentation" onPress={() => go('/settings/profile')} />
        <SettingsLink icon={Palette} label="Thème & signature" hint="Pseudo coloré, couleurs, aura de ta photo" onPress={() => go('/settings/theme')} />
        <SettingsLink icon={Heart} label="Soutenir Actunime" hint="Offre Soutien, abonnement et avantages" onPress={() => go('/settings/soutenir')} />
        <SettingsLink icon={Lock} label="Confidentialité" hint="Qui peut voir ton profil, tes listes et tes activités" onPress={() => go('/settings/confidentialite')} />
        <SettingsLink icon={Bell} label="Notifications" hint="Quoi, dans l’application et sur Discord" onPress={() => go('/settings/notifications')} />
      </SettingsCard>
      <SettingsCard>
        <SettingsLink icon={Users} label="Amis" hint="Demandes reçues et envoyées" onPress={() => go('/settings/amis')} />
        <SettingsLink icon={Ban} label="Blocages" hint="Membres que tu as bloqués" onPress={() => go('/settings/blocages')} />
      </SettingsCard>
      <SettingsCard>
        <SettingsLink icon={ShieldCheck} label="Sécurité" hint="Changer le mot de passe" onPress={() => go('/settings/security')} />
        <SettingsLink icon={MonitorSmartphone} label="Appareils" hint="Sessions ouvertes sur le site" onPress={() => go('/settings/appareils')} />
        <SettingsLink icon={Trash2} label="Supprimer le compte" hint="Demande avec délai d’annulation" onPress={() => go('/settings/delete-account')} />
      </SettingsCard>
      <AppUpdate />
      <Button label="Déconnexion" variant="outline" onPress={() => void signOut()} />
    </SettingsPage>
  );
}
