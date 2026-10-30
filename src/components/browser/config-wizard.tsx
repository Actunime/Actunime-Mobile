import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Pressable } from '@/components/tap';
import { Button } from '@/components/button';
import { FieldChip, PageIllustration, Stepper, fieldStyle, type PickField } from '@/components/browser/wizard-parts';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { deriveEpisodeUrlRegex } from '@/detection/core/strategies';
import type { LearnedPattern, MangaTrackingMode, StrategyResult } from '@/detection/core/types';
import type { PickedElement } from '@/detection/messages';

type Step = 'kind' | 'strategies' | 'title' | 'title-ok' | 'number' | 'token' | 'number-ok' | 'tracking' | 'confirm';

interface IConfigWizardProps {
  visible: boolean;
  host: string;
  /** Adresse de la page ouverte : sert à déduire quelles pages du site sont des pages de lecture. */
  url: string;
  inferredKind: 'anime' | 'manga';
  strategies: StrategyResult[] | null;
  /** Dernier élément pointé ; `seq` change à chaque choix, même sur le même élément. */
  picked: { seq: number; element: PickedElement } | null;
  onRunStrategies: () => void;
  onStartPick: (field: PickField) => void;
  onStopPick: () => void;
  onClose: () => void;
  onSave: (pattern: LearnedPattern) => Promise<void>;
}

const TRACKING_CHOICES: {
  mode: MangaTrackingMode;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  hint: string;
}[] = [
  {
    mode: 'scroll',
    icon: 'flash',
    label: 'Automatique',
    hint: 'Le chapitre est ajouté dès que tu arrives presque en bas.',
  },
  { mode: 'manual', icon: 'hand-left', label: 'À la main', hint: 'Tu touches « Marquer comme lu » quand tu as fini.' },
];

/** Le meilleur résultat automatique : celui qui trouve à la fois un titre et un numéro, du plus fiable au moins fiable. */
function bestStrategy(results: StrategyResult[]): StrategyResult | null {
  const usable = results.filter((result) => result.title);
  const complete = usable.filter((result) => result.episode !== undefined);
  const pool = complete.length > 0 ? complete : usable;
  return pool.slice().sort((a, b) => b.confidence - a.confidence)[0] ?? null;
}

/**
 * Assistant « Configurer ce site » (équivalent mobile de E17). On essaie d'abord la lecture automatique ; si elle
 * ne convient pas, l'utilisateur montre lui-même le titre puis le numéro sur la page. Chaque étape tient en une
 * phrase, avec un schéma et une couleur par champ (la même couleur surligne l'élément sur la page).
 */
export function ConfigWizard(props: IConfigWizardProps) {
  const { visible, host, url, inferredKind, strategies, picked } = props;
  const [step, setStep] = useState<Step>('kind');
  const [kind, setKind] = useState(inferredKind);
  const [selected, setSelected] = useState<StrategyResult | null>(null);
  const [manual, setManual] = useState(false);
  const [title, setTitle] = useState<PickedElement | null>(null);
  const [number, setNumber] = useState<{ element: PickedElement; tokenIndex: number } | null>(null);
  const [numberCandidate, setNumberCandidate] = useState<PickedElement | null>(null);
  const [mode, setMode] = useState<MangaTrackingMode>('scroll');
  const [picking, setPicking] = useState<PickField | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSeq, setLastSeq] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setStep('kind');
    setKind(inferredKind);
    setSelected(null);
    setManual(false);
    setTitle(null);
    setNumber(null);
    setNumberCandidate(null);
    setMode('scroll');
    setPicking(null);
    setError(null);
    setLastSeq(picked?.seq ?? 0);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps -- remise à zéro à l'ouverture seulement

  // Les résultats automatiques arrivent : on présélectionne le plus probable.
  useEffect(() => {
    if (step === 'strategies' && strategies && !selected) setSelected(bestStrategy(strategies));
  }, [strategies]); // eslint-disable-line react-hooks/exhaustive-deps -- présélection à l'arrivée des résultats

  // Un nouvel élément pointé alimente le champ en cours de choix.
  useEffect(() => {
    if (!picked || picked.seq === lastSeq || !picking) return;
    setLastSeq(picked.seq);
    const field = picking;
    setPicking(null);
    setError(null);
    if (field === 'title') {
      setTitle(picked.element);
      setStep('title-ok');
      return;
    }
    const { tokens } = picked.element;
    if (tokens.length === 0) {
      setError('Il n’y a aucun chiffre dans cet élément. Touche celui qui affiche le numéro.');
      return;
    }
    if (tokens.length === 1) {
      setNumber({ element: picked.element, tokenIndex: 0 });
      setStep('number-ok');
    } else {
      setNumberCandidate(picked.element);
      setStep('token');
    }
  }, [picked]); // eslint-disable-line react-hooks/exhaustive-deps -- réagit au seul nouvel élément pointé

  const numberField = fieldStyle('number', kind);
  const unit = kind === 'manga' ? 'chapitre' : 'épisode';
  const hasTracking = kind === 'manga';

  // Étapes affichées en haut : la lecture automatique tient en une étape, le pointage manuel en deux.
  const labels = useMemo(() => {
    const reading = manual ? ['Titre', kind === 'manga' ? 'Chapitre' : 'Épisode'] : ['Lecture'];
    return ['Type', ...reading, ...(hasTracking ? ['Suivi'] : [])];
  }, [manual, kind, hasTracking]);

  const current = (() => {
    switch (step) {
      case 'kind':
        return 0;
      case 'strategies':
      case 'title':
      case 'title-ok':
        return 1;
      case 'number':
      case 'token':
      case 'number-ok':
        return 2;
      case 'tracking':
        return labels.length - 1;
      default:
        return labels.length;
    }
  })();

  const pick = (field: PickField) => {
    setError(null);
    setPicking(field);
    props.onStartPick(field);
  };

  const cancelPick = () => {
    setPicking(null);
    props.onStopPick();
  };

  const afterReading = () => setStep(hasTracking ? 'tracking' : 'confirm');

  const numberValue = (() => {
    if (!number) return undefined;
    const tokens = number.element.text.match(/\d{1,4}/g) ?? [];
    return tokens[number.tokenIndex] ?? undefined;
  })();

  const save = async () => {
    setSaving(true);
    try {
      let pathname = '';
      try {
        pathname = new URL(url).pathname;
      } catch {
        // adresse illisible : le pattern s'applique alors à toutes les pages du site
      }
      const now = new Date().toISOString();
      const pattern: LearnedPattern = {
        host,
        kind,
        strategy: manual ? 'manual' : (selected?.id ?? 'manual'),
        manualSelectors:
          manual && title && number
            ? { title: title.selector, episode: { selector: number.element.selector, tokenIndex: number.tokenIndex } }
            : undefined,
        episodeUrlRegex: pathname ? deriveEpisodeUrlRegex(pathname) : undefined,
        mangaTracking: hasTracking ? { mode, threshold: 0.9 } : undefined,
        createdAt: now,
        updatedAt: now,
      };
      await props.onSave(pattern);
      props.onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  };

  const picked1 = fieldStyle('title', kind);
  const pickBanner = picking ? fieldStyle(picking, kind) : null;

  return (
    <>
      <Modal visible={visible && !picking} animationType="slide" transparent onRequestClose={props.onClose}>
        <View style={styles.backdrop}>
          <SafeAreaView style={styles.sheet} edges={['bottom']}>
            <View style={styles.header}>
              <ThemedText type="subtitle">Configurer {host}</ThemedText>
              <Pressable onPress={props.onClose} accessibilityRole="button">
                <ThemedText type="link">Fermer</ThemedText>
              </Pressable>
            </View>

            <Stepper labels={labels} current={current} />

            <ScrollView contentContainerStyle={styles.content}>
              {step === 'kind' && (
                <>
                  <ThemedText type="subtitle">Tu lis quoi sur ce site ?</ThemedText>
                  <View style={styles.row}>
                    {(['manga', 'anime'] as const).map((value) => (
                      <Pressable
                        key={value}
                        onPress={() => setKind(value)}
                        style={[styles.bigChoice, styles.flex, kind === value && styles.choiceActive]}
                      >
                        <Ionicons
                          name={value === 'manga' ? 'book' : 'play-circle'}
                          size={30}
                          color={kind === value ? Colors.primary : Colors.textSecondary}
                        />
                        <ThemedText type="smallBold">{value === 'manga' ? 'Manga / manhwa' : 'Anime'}</ThemedText>
                      </Pressable>
                    ))}
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">
                    Reste sur une page d’un {unit} de ce site : l’assistant va la lire.
                  </ThemedText>
                  <Button
                    label="Continuer"
                    onPress={() => {
                      props.onRunStrategies();
                      setStep('strategies');
                    }}
                  />
                </>
              )}

              {step === 'strategies' && (
                <>
                  <ThemedText type="subtitle">C’est bien ça ?</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Voici ce qu’Actunime lit sur cette page.
                  </ThemedText>
                  {strategies === null && <ActivityIndicator color={Colors.primary} />}
                  {strategies
                    ?.filter((result) => result.title)
                    .map((result) => (
                      <Pressable
                        key={result.id}
                        onPress={() => setSelected(result)}
                        style={[styles.card, selected?.id === result.id && styles.choiceActive]}
                      >
                        <FieldChip field="title" kind={kind} value={result.title} />
                        <FieldChip
                          field="number"
                          kind={kind}
                          value={result.episode !== undefined ? String(result.episode) : 'non trouvé'}
                        />
                        {selected?.id === result.id && (
                          <Ionicons name="checkmark-circle" size={24} color={Colors.primary} style={styles.cardCheck} />
                        )}
                      </Pressable>
                    ))}
                  {strategies && strategies.every((result) => !result.title) && (
                    <ThemedText type="small" themeColor="destructive">
                      Rien n’a pu être lu tout seul. Es-tu bien sur la page d’un {unit} ?
                    </ThemedText>
                  )}
                  {selected && selected.episode === undefined && (
                    <ThemedText type="small" themeColor="warning">
                      Le {unit} n’a pas été trouvé : ça ne suffit pas pour suivre ta lecture. Montre-le moi.
                    </ThemedText>
                  )}
                  <Button
                    label="Oui, c’est ça"
                    disabled={!selected || selected.episode === undefined}
                    onPress={() => {
                      setManual(false);
                      afterReading();
                    }}
                  />
                  <Button
                    label="Non, je vais te le montrer"
                    variant="outline"
                    onPress={() => {
                      setManual(true);
                      setSelected(null);
                      setStep('title');
                    }}
                  />
                </>
              )}

              {step === 'title' && (
                <>
                  <ThemedText type="subtitle">Montre-moi le titre</ThemedText>
                  <PageIllustration field="title" kind={kind} />
                  <ThemedText type="small" themeColor="textSecondary">
                    La page va s’afficher. Touche {picked1.sentence} (par exemple « {picked1.example} »).
                  </ThemedText>
                  <Button label="Je touche le titre" onPress={() => pick('title')} />
                </>
              )}

              {step === 'title-ok' && title && (
                <>
                  <ThemedText type="subtitle">Titre choisi</ThemedText>
                  <View style={styles.card}>
                    <FieldChip field="title" kind={kind} value={title.text} />
                  </View>
                  <Button label="C’est bon, continuer" onPress={() => setStep('number')} />
                  <Button label="Ce n’est pas ça, recommencer" variant="outline" onPress={() => pick('title')} />
                </>
              )}

              {step === 'number' && (
                <>
                  <ThemedText type="subtitle">Montre-moi le {unit}</ThemedText>
                  <PageIllustration field="number" kind={kind} />
                  <ThemedText type="small" themeColor="textSecondary">
                    Touche {numberField.sentence} (par exemple « {numberField.example} »).
                  </ThemedText>
                  <Button label={`Je touche le ${unit}`} onPress={() => pick('number')} />
                  <Button label="Changer le titre" variant="outline" onPress={() => setStep('title')} />
                </>
              )}

              {step === 'token' && numberCandidate && (
                <>
                  <ThemedText type="subtitle">Quel nombre est le {unit} ?</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Il y a plusieurs nombres dans « {numberCandidate.text} ». Touche le bon.
                  </ThemedText>
                  <View style={styles.row}>
                    {numberCandidate.tokens.map((token, index) => (
                      <Pressable
                        key={`${token}-${index}`}
                        onPress={() => {
                          setNumber({ element: numberCandidate, tokenIndex: index });
                          setStep('number-ok');
                        }}
                        style={[styles.token, { borderColor: numberField.color }]}
                      >
                        <ThemedText type="title">{token}</ThemedText>
                      </Pressable>
                    ))}
                  </View>
                  <Button label="Recommencer" variant="outline" onPress={() => pick('number')} />
                </>
              )}

              {step === 'number-ok' && number && (
                <>
                  <ThemedText type="subtitle">{kind === 'manga' ? 'Chapitre' : 'Épisode'} choisi</ThemedText>
                  <View style={styles.card}>
                    <FieldChip field="number" kind={kind} value={numberValue ?? number.element.text} />
                  </View>
                  <Button label="C’est bon, continuer" onPress={afterReading} />
                  <Button label="Ce n’est pas ça, recommencer" variant="outline" onPress={() => pick('number')} />
                </>
              )}

              {step === 'tracking' && (
                <>
                  <ThemedText type="subtitle">Quand ajouter le chapitre ?</ThemedText>
                  {TRACKING_CHOICES.map((choice) => (
                    <Pressable
                      key={choice.mode}
                      onPress={() => setMode(choice.mode)}
                      style={[styles.card, mode === choice.mode && styles.choiceActive]}
                    >
                      <View style={styles.row}>
                        <Ionicons
                          name={choice.icon}
                          size={26}
                          color={mode === choice.mode ? Colors.primary : Colors.textSecondary}
                        />
                        <View style={styles.flex}>
                          <ThemedText type="smallBold">{choice.label}</ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">
                            {choice.hint}
                          </ThemedText>
                        </View>
                      </View>
                    </Pressable>
                  ))}
                  <Button label="Continuer" onPress={() => setStep('confirm')} />
                </>
              )}

              {step === 'confirm' && (
                <>
                  <ThemedText type="subtitle">Tout est prêt</ThemedText>
                  <View style={styles.card}>
                    <FieldChip field="title" kind={kind} value={manual ? title?.text : selected?.title} />
                    <FieldChip
                      field="number"
                      kind={kind}
                      value={
                        manual ? numberValue : selected?.episode !== undefined ? String(selected.episode) : undefined
                      }
                    />
                  </View>
                  {hasTracking && (
                    <ThemedText type="small" themeColor="textSecondary">
                      Ajout : {mode === 'manual' ? 'à la main' : 'automatique en fin de chapitre'}.
                    </ThemedText>
                  )}
                  <ThemedText type="small" themeColor="textSecondary">
                    Ce réglage reste sur ton appareil et ne concerne que ce site.
                  </ThemedText>
                  <Button label="Enregistrer pour ce site" onPress={save} disabled={saving} />
                </>
              )}

              {error && (
                <ThemedText type="small" themeColor="destructive">
                  {error}
                </ThemedText>
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {picking && pickBanner && (
        <SafeAreaView style={styles.pickBanner} edges={['bottom']} pointerEvents="box-none">
          <View style={[styles.pickCard, { borderColor: pickBanner.color }]}>
            <View style={[styles.pickTag, { backgroundColor: pickBanner.color }]}>
              <Ionicons name="hand-left" size={22} color="#ffffff" />
              <ThemedText type="smallBold" style={styles.pickTagText}>
                {pickBanner.label}
              </ThemedText>
            </View>
            <ThemedText type="smallBold" style={styles.flex}>
              Touche {pickBanner.sentence} sur la page
            </ThemedText>
            <Pressable onPress={cancelPick} accessibilityRole="button">
              <ThemedText type="link">Annuler</ThemedText>
            </Pressable>
          </View>
        </SafeAreaView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 6, 22, 0.6)' },
  sheet: {
    maxHeight: '90%',
    backgroundColor: Colors.backgroundElement,
    borderTopLeftRadius: Radius.large,
    borderTopRightRadius: Radius.large,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  content: { gap: Spacing.three, paddingBottom: Spacing.three },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.three },
  flex: { flex: 1 },
  card: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  cardCheck: { position: 'absolute', top: Spacing.two, right: Spacing.two },
  bigChoice: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  choiceActive: { borderColor: Colors.primary, backgroundColor: Colors.backgroundSelected },
  token: {
    minWidth: 88,
    alignItems: 'center',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 3,
    backgroundColor: Colors.background,
  },
  pickBanner: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: Spacing.three },
  pickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    backgroundColor: Colors.backgroundElement,
    borderWidth: 3,
  },
  pickTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.small,
  },
  pickTagText: { color: '#ffffff' },
});
