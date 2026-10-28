import { Image } from 'expo-image';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { signOut, useAuth } from '@/lib/auth-store';
import { WEB_URL } from '@/lib/config';
import { useListStatistics } from '@/lib/queries';

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

export default function ProfileScreen() {
  const { auth } = useAuth();
  const stats = useListStatistics();
  if (!auth) return null;
  const name = auth.user.displayName ?? auth.user.username;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title">Profil</ThemedText>

        <ThemedView type="backgroundElement" style={[styles.card, styles.identity]}>
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
            <Counter value={stats.data.animeCount} label="animes" />
            <Counter value={stats.data.mangaCount} label="mangas" />
            <Counter value={stats.data.totalEpisodesWatched} label="épisodes vus" />
            <Counter value={stats.data.totalChaptersRead} label="chapitres lus" />
            {stats.data.averageScore ? (
              <Counter value={stats.data.averageScore.toFixed(1).replace('.', ',')} label="note moyenne" />
            ) : null}
          </ThemedView>
        )}

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="small" themeColor="textSecondary">
            Statistiques détaillées, amis, activité et réglages du compte sont sur le site.
          </ThemedText>
          <Button
            label="Ouvrir mon profil sur le site"
            variant="outline"
            onPress={() => Linking.openURL(`${WEB_URL}/membres/${encodeURIComponent(auth.user.username)}`)}
          />
        </ThemedView>

        <Button label="Se déconnecter" variant="outline" onPress={() => signOut()} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.three },
  card: { padding: Spacing.three, borderRadius: Radius.large, borderWidth: 1, borderColor: Colors.border, gap: Spacing.three },
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
  counters: { flexDirection: 'row', flexWrap: 'wrap', rowGap: Spacing.three },
  counter: { flexGrow: 1, flexBasis: 120, alignItems: 'center' },
  centered: { textAlign: 'center' },
});
