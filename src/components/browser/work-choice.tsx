import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { Pressable } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import type { ITitleAlternative } from '@/detection/core/auto-strategy';
import type { PageDetection } from '@/detection/messages';
import { Colors, Fonts, Radius, Spacing, Tw } from '@/constants/theme';
import { aliasesFor, guessFormat, QUICK_ADD_FORMATS } from '@/lib/quick-add';
import type { ICandidate } from '@/lib/sync';

interface IWorkChoiceProps {
  detection: PageDetection;
  candidates: ICandidate[];
  alternatives: ITitleAlternative[];
  onChoose: (candidate: ICandidate) => void;
  onPickTitle: (alternative: ITitleAlternative) => void;
  onQuickAdd: (input: { title: string; format: string; aliases: string[] }) => Promise<void>;
  onSearch: () => void;
  onConfigure: () => void;
}

/**
 * « Quelle œuvre est-ce ? » : trois issues, de la plus simple à la plus avancée. Choisir une œuvre déjà dans Actunime ;
 * la suivre quand même si elle n'y est pas (ajout rapide : elle sera reliée à une fiche ensuite) ; chercher à la main ou, en
 * dernier recours, montrer le titre sur la page (mode avancé).
 */
export function WorkChoice({ detection, candidates, alternatives, ...actions }: Readonly<IWorkChoiceProps>) {
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(detection.title);
  const [format, setFormat] = useState(() => guessFormat(detection.kind, detection.url));
  const noCandidate = candidates.length === 0;

  const submit = async () => {
    const clean = title.trim();
    if (clean.length < 2 || saving) return;
    setSaving(true);
    try {
      await actions.onQuickAdd({ title: clean, format, aliases: aliasesFor(clean, [detection.title, ...alternatives.map((a) => a.title)]) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      {!adding && (
        <View style={styles.detected}>
          <ThemedText type="small" themeColor="textSecondary">
            Titre lu sur la page
          </ThemedText>
          <ThemedText type="smallBold">{detection.title}</ThemedText>
        </View>
      )}

      {!adding && candidates.length > 0 && (
        <View style={styles.group}>
          <ThemedText type="small" themeColor="textSecondary">
            Dans Actunime
          </ThemedText>
          {candidates.map((candidate) => (
            <Pressable key={candidate.key} onPress={() => actions.onChoose(candidate)} style={styles.candidate}>
              <Image source={candidate.posterUrl ? { uri: candidate.posterUrl } : undefined} style={styles.poster} contentFit="cover" />
              <View style={styles.candidateText}>
                <ThemedText type="smallBold" numberOfLines={2}>
                  {candidate.title}
                </ThemedText>
                {candidate.origin !== 'media' && (
                  <ThemedText type="small" themeColor="warning">
                    En attente de référencement
                  </ThemedText>
                )}
              </View>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.quickAdd}>
        <ThemedText type="smallBold">{noCandidate ? 'Pas encore dans Actunime ?' : 'Ce n’est aucune de ces œuvres ?'}</ThemedText>
        {!adding && (
          <ThemedText type="small" themeColor="textSecondary">
            Ajoute-la à ta liste : tu la suis tout de suite, elle apparaît « en attente de référencement ».
          </ThemedText>
        )}

        {adding ? (
          <View style={styles.form}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Titre de l’œuvre"
              placeholderTextColor={Colors.textSecondary}
              style={styles.input}
              autoCorrect={false}
            />
            <View style={styles.chips}>
              {QUICK_ADD_FORMATS[detection.kind].map((option) => (
                <Chip key={option.value} label={option.label} active={format === option.value} onPress={() => setFormat(option.value)} />
              ))}
            </View>
            {alternatives.length > 0 && (
              <ThemedText type="small" themeColor="textSecondary">
                Les autres titres lus sur la page sont gardés avec l’œuvre, pour aider à la relier à une fiche existante.
              </ThemedText>
            )}
            <Button label={saving ? 'Ajout…' : 'Ajouter à ma liste et suivre'} disabled={saving || title.trim().length < 2} onPress={() => void submit()} />
            <Button label="Annuler" variant="outline" onPress={() => setAdding(false)} />
          </View>
        ) : (
          <Button label="Suivre cette œuvre" variant={noCandidate ? 'primary' : 'outline'} onPress={() => setAdding(true)} />
        )}
      </View>

      {alternatives.length > 0 && !adding && (
        <View style={styles.group}>
          <ThemedText type="small" themeColor="textSecondary">
            Le titre est faux ? Autres titres lus sur la page
          </ThemedText>
          <View style={styles.chips}>
            {alternatives.map((alternative) => (
              <Chip key={`${alternative.strategy}|${alternative.title}`} label={alternative.title} onPress={() => actions.onPickTitle(alternative)} />
            ))}
          </View>
        </View>
      )}

      <View style={styles.links}>
        <Pressable accessibilityRole="button" onPress={actions.onSearch} style={styles.link}>
          <ThemedText type="link">Chercher à la main</ThemedText>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={actions.onConfigure} style={styles.link}>
          <ThemedText type="link" themeColor="textSecondary">
            Mode avancé
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

/** Recherche en cours : le panneau reste ouvert avec un message, il ne se replie plus le temps de la requête. */
export function ResolvingNotice({ title }: Readonly<{ title: string }>) {
  return (
    <View style={styles.resolving}>
      <ActivityIndicator color={Colors.primary} />
      <ThemedText type="small" themeColor="textSecondary" style={styles.resolvingText}>
        Recherche de « {title} » sur Actunime…
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: Spacing.three },
  detected: { gap: Spacing.half },
  group: { gap: Spacing.two },
  candidate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two,
    borderRadius: Tw.radius.lg,
    backgroundColor: Colors.backgroundSelected,
    minHeight: 56,
  },
  poster: { width: 40, height: 56, borderRadius: Radius.small, backgroundColor: Colors.backgroundElement },
  candidateText: { flex: 1, gap: Spacing.half },
  quickAdd: { gap: Spacing.two, padding: Spacing.three, borderRadius: Tw.radius.lg, backgroundColor: Colors.backgroundSelected },
  form: { gap: Spacing.two },
  input: {
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    borderRadius: Tw.radius.lg,
    backgroundColor: Colors.input,
    color: Colors.text,
    fontFamily: Fonts.medium,
    fontSize: 16,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  links: { flexDirection: 'row', flexWrap: 'wrap', columnGap: Spacing.four },
  link: { minHeight: 44, justifyContent: 'center' },
  resolving: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 72 },
  resolvingText: { flex: 1 },
});
