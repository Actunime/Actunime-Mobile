import { Image } from 'expo-image';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { login } from '@/lib/auth';

/** Écran affiché tant que le membre n'est pas connecté : le flux PKCE passe par le site (consentement). */
export default function LoginScreen() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const connect = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      await login();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible');
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Image source={require('../../assets/images/logo.png')} style={styles.logo} contentFit="contain" />
            <ThemedText type="title">Actunime</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.centered}>
              Ta liste anime & manga, partout.
            </ThemedText>
          </View>

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="subtitle">Connexion</ThemedText>
            <ThemedText themeColor="textSecondary" type="small">
              Connecte-toi avec ton compte Actunime pour retrouver ta liste et suivre tes lectures.
            </ThemedText>
            <Button label={busy ? 'Connexion…' : 'Se connecter avec Actunime'} onPress={connect} disabled={busy} />
            {error && (
              <ThemedText type="small" themeColor="destructive">
                {error}
              </ThemedText>
            )}
          </ThemedView>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    justifyContent: 'center',
    padding: Spacing.three,
    gap: Spacing.four,
  },
  header: { alignItems: 'center', gap: Spacing.one },
  logo: { width: 72, height: 76, marginBottom: Spacing.two },
  centered: { textAlign: 'center' },
  card: {
    padding: Spacing.three,
    borderRadius: Radius.large,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.three,
  },
});
