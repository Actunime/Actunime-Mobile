import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { login } from '@/lib/auth';
import { clearAuth, getAuth, type IAuthState } from '@/lib/storage';

export default function HomeScreen() {
  const theme = useTheme();
  const [auth, setAuth] = useState<IAuthState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState('');

  useEffect(() => {
    void getAuth().then(setAuth);
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    try {
      setAuth(await login());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible');
    }
  }, []);

  const disconnect = useCallback(async () => {
    await clearAuth();
    setAuth(null);
  }, []);

  const open = useCallback(() => {
    const trimmed = address.trim();
    if (!trimmed) return;
    const url = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    router.push({ pathname: '/browser', params: { url } });
  }, [address]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">Actunime</ThemedText>

        {auth ? (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText>Connecté : {auth.user.displayName ?? auth.user.username}</ThemedText>
            <Pressable onPress={disconnect}>
              <ThemedText type="small">Se déconnecter</ThemedText>
            </Pressable>
          </ThemedView>
        ) : (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText>Connecte-toi pour que tes lectures soient ajoutées à ta liste.</ThemedText>
            <Pressable onPress={connect} style={[styles.button, { backgroundColor: theme.text }]}>
              <ThemedText style={{ color: theme.background }}>Se connecter</ThemedText>
            </Pressable>
            {error && <ThemedText type="small">{error}</ThemedText>}
          </ThemedView>
        )}

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText>Ouvre un site de lecture</ThemedText>
          <TextInput
            value={address}
            onChangeText={setAddress}
            onSubmitEditing={open}
            placeholder="adresse du site"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="go"
            style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
          />
          <Pressable
            onPress={open}
            disabled={!auth}
            style={[styles.button, { backgroundColor: theme.text, opacity: auth ? 1 : 0.4 }]}
          >
            <ThemedText style={{ color: theme.background }}>Ouvrir</ThemedText>
          </Pressable>
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.three, gap: Spacing.three },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  button: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  input: { borderWidth: 1, borderRadius: Spacing.two, padding: Spacing.two },
});
