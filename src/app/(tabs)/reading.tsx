import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { resolveAddress } from '@/lib/address';

/** Onglet Lecture : point d'entrée du navigateur de lecture avec suivi (écran `browser`). */
export default function ReadingScreen() {
  const [address, setAddress] = useState('');

  const open = useCallback(() => {
    const url = resolveAddress(address);
    if (url) router.push({ pathname: '/browser', params: { url, t: String(Date.now()) } });
  }, [address]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText type="title">Lecture</ThemedText>

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
            <Button label="Ouvrir" onPress={open} disabled={!address.trim()} />
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="subtitle">Comment ça marche</ThemedText>
            {[
              'Ouvre ton site de lecture ou de streaming dans le navigateur ci-dessus.',
              'Une barre Actunime apparaît en bas : elle te dit quelle œuvre et quel chapitre sont reconnus.',
              'À la fin du chapitre, ta liste est mise à jour (ou touche « Marquer comme lu »).',
              'Si rien n’est reconnu, touche « Configurer ce site » : tu montres une fois où lire le titre et le numéro.',
            ].map((step, index) => (
              <View key={step} style={styles.step}>
                <ThemedText type="small" themeColor="textSecondary">
                  {index + 1}. {step}
                </ThemedText>
              </View>
            ))}
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
  card: {
    padding: Spacing.three,
    borderRadius: Radius.large,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.three,
  },
  step: { flexDirection: 'row' },
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
