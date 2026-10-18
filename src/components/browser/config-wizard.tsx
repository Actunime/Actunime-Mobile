import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { deriveEpisodeUrlRegex } from '@/detection/core/strategies';
import type { LearnedPattern, MangaTrackingMode, StrategyResult } from '@/detection/core/types';
import type { PickedElement } from '@/detection/messages';

type Step = 'kind' | 'strategies' | 'pick-title' | 'pick-number' | 'token' | 'tracking' | 'confirm';
type PickField = 'title' | 'number';

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
  onStartPick: () => void;
  onStopPick: () => void;
  onClose: () => void;
  onSave: (pattern: LearnedPattern) => Promise<void>;
}

const TRACKING_CHOICES: { mode: MangaTrackingMode; label: string; hint: string }[] = [
  {
    mode: 'scroll',
    label: 'Automatique : fin du chapitre',
    hint: 'Le chapitre est ajouté quand tu arrives presque en bas de la page.',
  },
  { mode: 'manual', label: 'Manuel', hint: 'Tu touches « Marquer comme lu » toi-même, rien n’est ajouté tout seul.' },
];

/**
 * Assistant « Configurer ce site » (équivalent mobile de E17) : on essaie d'abord les stratégies automatiques,
 * et si aucune ne convient l'utilisateur pointe lui-même le titre puis le numéro sur la page.
 */
export function ConfigWizard(props: IConfigWizardProps) {
  const { visible, host, url, inferredKind, strategies, picked } = props;
  const [step, setStep] = useState<Step>('kind');
  const [kind, setKind] = useState(inferredKind);
  const [selected, setSelected] = useState<StrategyResult | null>(null);
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
    setTitle(null);
    setNumber(null);
    setNumberCandidate(null);
    setMode('scroll');
    setPicking(null);
    setError(null);
    setLastSeq(picked?.seq ?? 0);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps -- remise à zéro à l'ouverture seulement

  // Un nouvel élément pointé alimente le champ en cours de choix.
  useEffect(() => {
    if (!picked || picked.seq === lastSeq || !picking) return;
    setLastSeq(picked.seq);
    const field = picking;
    setPicking(null);
    if (field === 'title') {
      setTitle(picked.element);
      setError(null);
      setStep('pick-number');
      return;
    }
    if (picked.element.tokens.length === 0) {
      setError('Cet élément ne contient aucun nombre. Touche celui qui affiche le numéro du chapitre ou de l’épisode.');
      return;
    }
    setError(null);
    if (picked.element.tokens.length === 1) {
      setNumber({ element: picked.element, tokenIndex: 0 });
      setStep(kind === 'manga' ? 'tracking' : 'confirm');
    } else {
      setNumberCandidate(picked.element);
      setStep('token');
    }
  }, [picked]); // eslint-disable-line react-hooks/exhaustive-deps -- réagit au seul nouvel élément pointé

  const unit = kind === 'manga' ? 'chapitre' : 'épisode';
  const manual = !selected;

  const startPick = (field: PickField) => {
    setError(null);
    setPicking(field);
    props.onStartPick();
  };

  const cancelPick = () => {
    setPicking(null);
    props.onStopPick();
  };

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
        strategy: selected?.id ?? 'manual',
        manualSelectors:
          !selected && title && number
            ? { title: title.selector, episode: { selector: number.element.selector, tokenIndex: number.tokenIndex } }
            : undefined,
        episodeUrlRegex: pathname ? deriveEpisodeUrlRegex(pathname) : undefined,
        mangaTracking: kind === 'manga' ? { mode, threshold: 0.9 } : undefined,
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

  const next = () => setStep(kind === 'manga' ? 'tracking' : 'confirm');

  return (
    <>
      <Modal visible={visible && !picking} animationType="slide" transparent onRequestClose={props.onClose}>
        <View style={styles.backdrop}>
          <SafeAreaView style={styles.sheet} edges={['bottom']}>
            <View style={styles.header}>
              <ThemedText type="subtitle">Configurer {host}</ThemedText>
              <Pressable onPress={props.onClose}>
                <ThemedText type="link">Fermer</ThemedText>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
              {step === 'kind' && (
                <>
                  <ThemedText themeColor="textSecondary" type="small">
                    Ouvre d’abord une page de chapitre ou d’épisode de ce site, puis continue : l’assistant regarde ce
                    que la page contient et te montre ce qu’il comprend.
                  </ThemedText>
                  <ThemedText type="smallBold">Que lis-tu ou regardes-tu ici ?</ThemedText>
                  <View style={styles.row}>
                    {(['manga', 'anime'] as const).map((value) => (
                      <Pressable
                        key={value}
                        onPress={() => setKind(value)}
                        style={[styles.choice, styles.flex, kind === value && styles.choiceActive]}
                      >
                        <ThemedText type="smallBold">{value === 'manga' ? 'Manga / manhwa' : 'Anime'}</ThemedText>
                      </Pressable>
                    ))}
                  </View>
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
                  <ThemedText themeColor="textSecondary" type="small">
                    Voici ce que la page permet de lire automatiquement. Choisis la ligne qui affiche le bon titre et le
                    bon {unit}.
                  </ThemedText>
                  {strategies === null && <ActivityIndicator color={Colors.primary} />}
                  {strategies
                    ?.filter((result) => result.title)
                    .map((result) => {
                      const found = result.episode;
                      return (
                        <Pressable
                          key={result.id}
                          onPress={() => setSelected(result)}
                          style={[styles.choice, selected?.id === result.id && styles.choiceActive]}
                        >
                          <ThemedText type="smallBold">{result.label}</ThemedText>
                          <ThemedText type="small">
                            {result.title}
                            {found !== undefined ? ` · ${unit} ${found}` : ` · ${unit} non trouvé`}
                          </ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">
                            {result.description}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  {strategies && strategies.every((result) => !result.title) && (
                    <ThemedText type="small" themeColor="destructive">
                      Rien n’a pu être lu automatiquement sur cette page. Es-tu bien sur une page de chapitre ou
                      d’épisode ?
                    </ThemedText>
                  )}
                  <Button label="Utiliser cette ligne" onPress={next} disabled={!selected} />
                  <Button
                    label="Aucune ne convient : pointer moi-même"
                    variant="outline"
                    onPress={() => setStep('pick-title')}
                  />
                </>
              )}

              {step === 'pick-title' && (
                <>
                  <ThemedText themeColor="textSecondary" type="small">
                    Étape 1 sur 2. La page va s’afficher : touche le titre de l’œuvre (pas le titre du chapitre). Il se
                    surligne en bleu quand ton doigt est dessus.
                  </ThemedText>
                  <Button label="Pointer le titre sur la page" onPress={() => startPick('title')} />
                </>
              )}

              {step === 'pick-number' && (
                <>
                  <ThemedText type="small" themeColor="textSecondary">
                    Titre retenu : « {title?.text} »
                  </ThemedText>
                  <ThemedText themeColor="textSecondary" type="small">
                    Étape 2 sur 2. Touche maintenant le texte qui affiche le numéro du {unit}.
                  </ThemedText>
                  <Button label={`Pointer le numéro du ${unit}`} onPress={() => startPick('number')} />
                  <Button label="Changer le titre" variant="outline" onPress={() => setStep('pick-title')} />
                </>
              )}

              {step === 'token' && numberCandidate && (
                <>
                  <ThemedText themeColor="textSecondary" type="small">
                    Cet élément contient plusieurs nombres : « {numberCandidate.text} ». Touche celui qui est le numéro
                    du {unit}.
                  </ThemedText>
                  <View style={styles.row}>
                    {numberCandidate.tokens.map((token, index) => (
                      <Pressable
                        key={`${token}-${index}`}
                        onPress={() => {
                          setNumber({ element: numberCandidate, tokenIndex: index });
                          setStep(kind === 'manga' ? 'tracking' : 'confirm');
                        }}
                        style={styles.choice}
                      >
                        <ThemedText type="smallBold">{token}</ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}

              {step === 'tracking' && (
                <>
                  <ThemedText themeColor="textSecondary" type="small">
                    Comment Actunime doit-il savoir que tu as fini un chapitre ?
                  </ThemedText>
                  {TRACKING_CHOICES.map((choice) => (
                    <Pressable
                      key={choice.mode}
                      onPress={() => setMode(choice.mode)}
                      style={[styles.choice, mode === choice.mode && styles.choiceActive]}
                    >
                      <ThemedText type="smallBold">{choice.label}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {choice.hint}
                      </ThemedText>
                    </Pressable>
                  ))}
                  <Button label="Continuer" onPress={() => setStep('confirm')} />
                </>
              )}

              {step === 'confirm' && (
                <>
                  <ThemedText type="smallBold">Récapitulatif</ThemedText>
                  <ThemedText type="small">Site : {host}</ThemedText>
                  <ThemedText type="small">Type : {kind === 'manga' ? 'manga / manhwa' : 'anime'}</ThemedText>
                  <ThemedText type="small">
                    Lecture :{' '}
                    {manual ? `titre « ${title?.text} », numéro lu dans « ${number?.element.text} »` : selected?.label}
                  </ThemedText>
                  {kind === 'manga' && (
                    <ThemedText type="small">
                      Suivi : {TRACKING_CHOICES.find((choice) => choice.mode === mode)?.label.toLowerCase()}
                    </ThemedText>
                  )}
                  <ThemedText type="small" themeColor="textSecondary">
                    Cette configuration reste sur ton appareil et ne concerne que ce site.
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

      {picking && (
        <SafeAreaView style={styles.pickBanner} edges={['bottom']} pointerEvents="box-none">
          <View style={styles.pickCard}>
            <ThemedText type="smallBold" style={styles.flex}>
              {picking === 'title' ? 'Touche le titre de l’œuvre' : `Touche le numéro du ${unit}`}
            </ThemedText>
            <Pressable onPress={cancelPick}>
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
    maxHeight: '85%',
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
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  flex: { flex: 1 },
  choice: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  choiceActive: { borderColor: Colors.primary, backgroundColor: Colors.backgroundSelected },
  pickBanner: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: Spacing.three },
  pickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    backgroundColor: Colors.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
});
