import { Switch, View, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Sheen } from '@/components/ui/sheen';
import { Colors, Floating, Spacing } from '@/constants/theme';
import {
  checkForUpdate,
  downloadUpdate,
  installedVersion,
  installUpdate,
  openUpdatePage,
  setAutoUpdate,
  useAutoUpdate,
  useUpdateState,
  type UpdateState,
} from '@/lib/update-store';

const megabytes = (bytes: number) => `${(bytes / 1_048_576).toFixed(1).replace('.', ',')} Mo`;

/** Phrase d'état de la mise à jour, et l'action qui suit (rien, télécharger, installer). */
function updateLine(update: UpdateState): string {
  switch (update.status) {
    case 'checking':
      return 'Recherche en cours…';
    case 'up-to-date':
      return 'Tu as la dernière version.';
    case 'available':
      return `Version ${update.info.version} disponible.`;
    case 'downloading':
      return update.total > 0
        ? `Téléchargement de la version ${update.info.version} : ${megabytes(update.downloaded)} sur ${megabytes(update.total)}.`
        : `Téléchargement de la version ${update.info.version}…`;
    case 'ready':
      return `Version ${update.info.version} téléchargée, prête à installer.`;
    case 'installing':
      return 'Installation en cours…';
    case 'error':
      return update.message;
    default:
      return '';
  }
}

/** Mises à jour de l'app : recherche automatique au lancement, téléchargement et installation. */
export function AppUpdate() {
  const update = useUpdateState();
  const auto = useAutoUpdate();
  const busy = update.status === 'checking' || update.status === 'downloading' || update.status === 'installing';
  let version = '';
  try {
    version = installedVersion().versionName;
  } catch {
    // module natif absent (essais hors Android)
  }
  const line = updateLine(update);

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <Sheen />
      <View style={styles.updateHead}>
        <View style={styles.names}>
          <ThemedText type="smallBold">Mises à jour automatiques</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Actunime cherche une nouvelle version au lancement, au plus une fois par jour, et te propose de l’installer.
          </ThemedText>
        </View>
        <Switch
          accessibilityLabel="Mises à jour automatiques"
          value={auto}
          onValueChange={setAutoUpdate}
          trackColor={{ false: Colors.backgroundSelected, true: Colors.primary }}
          thumbColor={Colors.text}
        />
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {version ? `Version installée : ${version}. ` : ''}
        {line}
      </ThemedText>
      {(update.status === 'available' || update.status === 'downloading' || update.status === 'ready') && update.info.notes ? (
        <View style={styles.notes}>
          <ThemedText type="smallBold">Nouveautés de la version {update.info.version}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {update.info.notes}
          </ThemedText>
        </View>
      ) : null}
      {update.status === 'available' ? (
        <>
          <Button label="Télécharger la mise à jour" onPress={() => void downloadUpdate(update.info)} />
          <Button label="Ou la télécharger sur GitHub" variant="outline" onPress={() => void openUpdatePage(update.info)} />
        </>
      ) : update.status === 'ready' ? (
        <>
          <Button label="Installer la mise à jour" onPress={() => void installUpdate(update.info, update.path)} />
          <Button label="Ou la télécharger sur GitHub" variant="outline" onPress={() => void openUpdatePage(update.info)} />
        </>
      ) : (
        <Button
          label="Rechercher une mise à jour"
          variant="outline"
          disabled={busy}
          onPress={() => void checkForUpdate()}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { ...Floating, overflow: 'hidden', padding: Spacing.three, gap: Spacing.three },
  names: { flex: 1 },
  notes: { gap: Spacing.one },
  updateHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
});
