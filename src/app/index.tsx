import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { resolveAddress } from '@/lib/address';
import { login } from '@/lib/auth';
import { signOut, useAuth } from '@/lib/auth-store';

export default function HomeScreen() {
  const { auth, loaded } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState('');

  const connect = useCallback(async () => {
    setError(null);
    try {
      await login();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible');
    }
  }, []);

  const disconnect = useCallback(async () => {
    await signOut();
  }, []);

  const open = useCallback(() => {
    const url = resolveAddress(address);
    if (url) router.push({ pathname: '/browser', params: { url } });
  }, [address]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Image source={require('../../assets/images/logo.png')} style={styles.logo} contentFit="contain" />
            <ThemedText type="title">Actunime</ThemedText>
            <ThemedText themeColor="textSecondary">Ta liste anime & manga, partout.</ThemedText>
          </View>

          <ThemedView type="backgroundElement" style={styles.card}>
            {!loaded ? null : auth ? (
              <>
                <ThemedText type="subtitle">Bonjour {auth.user.displayName ?? auth.user.username}</ThemedText>
                <ThemedText themeColor="textSecondary" type="small">
                  Tes lectures détectées dans le navigateur seront ajoutées à ta liste.
                </ThemedText>
                <Button label="Se déconnecter" variant="outline" onPress={disconnect} />
              </>
            ) : (
              <>
                <ThemedText type="subtitle">Connexion</ThemedText>
                <ThemedText themeColor="textSecondary" type="small">
                  Connecte-toi pour que tes lectures soient ajoutées à ta liste.
                </ThemedText>
                <Button label="Se connecter avec Actunime" onPress={connect} />
                {error && (
                  <ThemedText type="small" themeColor="destructive">
                    {error}
                  </ThemedText>
                )}
              </>
            )}
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="subtitle">Comment ça marche</ThemedText>
            {[
              'Ouvre ton site de lecture ou de streaming dans le navigateur ci-dessous.',
              'Une barre Actunime apparaît en bas : elle te dit quelle œuvre et quel chapitre sont reconnus.',
              'À la fin du chapitre, ta liste est mise à jour (ou touche « Marquer comme lu »).',
              'Si rien n’est reconnu, touche « Configurer ce site » : tu montres une fois où lire le titre et le numéro.',
            ].map((step, index) => (
              <ThemedText key={step} type="small" themeColor="textSecondary">
                {index + 1}. {step}
              </ThemedText>
            ))}
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="subtitle">Navigateur</ThemedText>
            <ThemedText themeColor="textSecondary" type="small">
              Ouvre un site de lecture ou de streaming : Actunime détecte l’œuvre et le chapitre.
            </ThemedText>
            <TextInput
              value={address}
              onChangeText={setAddress}
              onSubmitEditing={open}
              placeholder="Adresse du site ou recherche"
              placeholderTextColor={Colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              style={styles.input}
            />
            <Button label="Ouvrir" onPress={open} disabled={!auth || !address.trim()} />
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  header: { alignItems: 'center', gap: Spacing.one, paddingVertical: Spacing.four },
  logo: { width: 72, height: 76, marginBottom: Spacing.two },
  card: {
    padding: Spacing.three,
    borderRadius: Radius.large,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.three,
  },
  input: {
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Colors.input,
    color: Colors.text,
    fontFamily: Fonts.medium,
    fontSize: 16,
  },
});
