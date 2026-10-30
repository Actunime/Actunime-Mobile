import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Pressable } from '@/components/tap';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { searchCandidates, type ICandidate } from '@/lib/sync';

interface ISearchSheetProps {
  visible: boolean;
  initialQuery: string;
  initialKind: 'anime' | 'manga';
  initialNumber?: number;
  onClose: () => void;
  onSubmit: (candidate: ICandidate, kind: 'anime' | 'manga', number: number) => Promise<void>;
}

/** Recherche manuelle : quand la détection échoue ou se trompe, l'utilisateur choisit l'œuvre et le numéro. */
export function SearchSheet({
  visible,
  initialQuery,
  initialKind,
  initialNumber,
  onClose,
  onSubmit,
}: ISearchSheetProps) {
  const [query, setQuery] = useState(initialQuery);
  const [kind, setKind] = useState(initialKind);
  const [results, setResults] = useState<ICandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [chosen, setChosen] = useState<ICandidate | null>(null);
  const [number, setNumber] = useState(initialNumber?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setQuery(initialQuery);
    setKind(initialKind);
    setNumber(initialNumber?.toString() ?? '');
    setChosen(null);
    setResults([]);
    setError(null);
  }, [visible, initialQuery, initialKind, initialNumber]);

  const search = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      setResults(await searchCandidates(kind, query.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recherche impossible');
    } finally {
      setLoading(false);
    }
  }, [kind, query]);

  const submit = useCallback(async () => {
    const parsed = Number(number);
    if (!chosen || !Number.isInteger(parsed) || parsed < 0) return setError('Indique un numéro entier');
    try {
      await onSubmit(chosen, kind, parsed);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Écriture impossible');
    }
  }, [chosen, kind, number, onClose, onSubmit]);

  const unit = kind === 'manga' ? 'chapitre' : 'épisode';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Chercher une œuvre</ThemedText>
          <Pressable onPress={onClose}>
            <ThemedText type="link">Fermer</ThemedText>
          </Pressable>
        </View>

        <View style={styles.kinds}>
          {(['manga', 'anime'] as const).map((value) => (
            <Pressable
              key={value}
              onPress={() => setKind(value)}
              style={[styles.kind, kind === value && styles.kindActive]}
            >
              <ThemedText type="smallBold">{value === 'manga' ? 'Manga / manhwa' : 'Anime'}</ThemedText>
            </Pressable>
          ))}
        </View>

        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={search}
          placeholder="Titre de l’œuvre"
          placeholderTextColor={Colors.textSecondary}
          returnKeyType="search"
          style={styles.input}
        />
        <Button label="Rechercher" onPress={search} disabled={!query.trim() || loading} />

        {loading && <ActivityIndicator color={Colors.primary} />}
        <ScrollView contentContainerStyle={styles.results} keyboardShouldPersistTaps="handled">
          {results.map((candidate) => (
            <Pressable
              key={candidate.key}
              onPress={() => setChosen(candidate)}
              style={[styles.result, chosen?.key === candidate.key && styles.resultSelected]}
            >
              <Image
                source={candidate.posterUrl ? { uri: candidate.posterUrl } : undefined}
                style={styles.poster}
                contentFit="cover"
              />
              <View style={styles.resultText}>
                <ThemedText type="smallBold" numberOfLines={2}>
                  {candidate.title}
                </ThemedText>
                {candidate.origin !== 'media' && (
                  <ThemedText type="small" themeColor="warning">
                    {candidate.origin === 'pending-entry'
                      ? 'Dans ta liste, en attente de validation'
                      : 'En attente de validation'}
                  </ThemedText>
                )}
              </View>
            </Pressable>
          ))}
          {!loading && results.length === 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              Lance une recherche pour voir les œuvres d’Actunime.
            </ThemedText>
          )}
        </ScrollView>

        {chosen && (
          <View style={styles.footer}>
            <ThemedText type="small" themeColor="textSecondary">
              {chosen.title} : quel {unit} as-tu lu ?
            </ThemedText>
            <TextInput
              value={number}
              onChangeText={setNumber}
              keyboardType="number-pad"
              placeholder={`Numéro du ${unit}`}
              placeholderTextColor={Colors.textSecondary}
              style={styles.input}
            />
            <Button label="Ajouter à ma liste" onPress={submit} disabled={!number.trim()} />
          </View>
        )}
        {error && (
          <ThemedText type="small" themeColor="destructive">
            {error}
          </ThemedText>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.three, gap: Spacing.three },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kinds: { flexDirection: 'row', gap: Spacing.two },
  kind: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  kindActive: { borderColor: Colors.primary, backgroundColor: Colors.backgroundSelected },
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
  results: { gap: Spacing.two },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resultSelected: { borderColor: Colors.primary, backgroundColor: Colors.backgroundSelected },
  poster: { width: 40, height: 56, borderRadius: Radius.small, backgroundColor: Colors.backgroundSelected },
  resultText: { flex: 1, gap: Spacing.half },
  footer: { gap: Spacing.two },
});
