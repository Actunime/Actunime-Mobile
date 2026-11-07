import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Linking, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { openMember } from '@/components/member/open-member';
import { Sheen } from '@/components/ui/sheen';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Floating, Radius, Spacing } from '@/constants/theme';
import { signOut, useAuth } from '@/lib/auth-store';
import { WEB_URL } from '@/lib/config';
import { api } from '@/lib/api';
import { useMyEntries } from '@/lib/queries';
import { listTotals } from '@/lib/suivi';
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

function Counter({ value, label }: Readonly<{ value: string | number; label: string }>) {
  return (
    <View style={styles.counter}>
      <ThemedText type="subtitle">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
        {label}
      </ThemedText>
    </View>
  );
}

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

function AppUpdate() {
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

export default function ProfileScreen() {
  const { auth } = useAuth();
  const animeList = useMyEntries('Anime');
  const mangaList = useMyEntries('Manga');
  // Le pseudo vient du profil lui-même : celui de la session peut être l'e-mail quand la connexion n'a pas trouvé le membre.
  const me = useQuery({ queryKey: ['me', 'profile'], queryFn: () => api.getMyProfile(), enabled: !!auth });
  const stats = { data: animeList.data && mangaList.data ? listTotals([...animeList.data, ...mangaList.data]) : undefined };
  if (!auth) return null;
  const name = auth.user.displayName ?? auth.user.username;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title">Profil</ThemedText>

        <ThemedView type="backgroundElement" style={[styles.card, styles.identity]}>

          <Sheen />
          <View style={styles.avatar}>
            {auth.user.avatarUrl ? (
              <Image source={{ uri: auth.user.avatarUrl }} style={styles.avatarImage} contentFit="cover" />
            ) : (
              <ThemedText type="subtitle">{name.slice(0, 1).toUpperCase()}</ThemedText>
            )}
          </View>
          <View style={styles.names}>
            <ThemedText type="subtitle" numberOfLines={1}>
              {name}
            </ThemedText>
            <ThemedText themeColor="textSecondary" type="small" numberOfLines={1}>
              @{auth.user.username}
            </ThemedText>
          </View>
        </ThemedView>

        {stats.data && (
          <ThemedView type="backgroundElement" style={[styles.card, styles.counters]}>
            <Sheen />
            <Counter value={stats.data.animeCount} label="animes" />
            <Counter value={stats.data.mangaCount} label="mangas" />
            <Counter value={stats.data.episodesWatched} label="épisodes vus" />
            <Counter value={stats.data.chaptersRead} label="chapitres lus" />
            {stats.data.averageScore ? (
              <Counter value={stats.data.averageScore.toFixed(1).replace('.', ',')} label="note moyenne" />
            ) : null}
          </ThemedView>
        )}

        <ThemedView type="backgroundElement" style={styles.card}>

          <Sheen />
          <ThemedText type="small" themeColor="textSecondary">
            Ton profil public, tes favoris et tes statistiques détaillées.
          </ThemedText>
          <Button label="Voir mon profil public" variant="outline" disabled={!me.data?.username} onPress={() => me.data?.username && openMember(me.data.username)} />
        </ThemedView>

        <AppUpdate />

        <Button label="Déconnexion" variant="outline" onPress={() => signOut()} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.three },
  card: { ...Floating, overflow: 'hidden', padding: Spacing.three, gap: Spacing.three },
  identity: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: Colors.backgroundSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: { width: 64, height: 64 },
  names: { flex: 1 },
  updateHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  counters: { flexDirection: 'row', flexWrap: 'wrap', rowGap: Spacing.three },
  counter: { flexGrow: 1, flexBasis: 120, alignItems: 'center' },
  centered: { textAlign: 'center' },
});
