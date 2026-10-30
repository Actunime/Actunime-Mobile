import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { Pressable } from '@/components/tap';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { LearnedPattern } from '@/detection/core/types';
import type { PageDetection } from '@/detection/messages';
import type { ICandidate } from '@/lib/sync';
import type { INotice, TrackingState } from '@/lib/use-tracking';

interface ITrackingBarProps {
  tracking: TrackingState;
  notice: INotice | null;
  host: string;
  pattern: LearnedPattern | null;
  onMarkRead: () => void;
  onChoose: (candidate: ICandidate) => void;
  onChange: () => void;
  onSearch: () => void;
  onConfigure: () => void;
  onIgnore: () => void;
  onUnignore: () => void;
}

const numberLabel = (d: PageDetection) => {
  const number = d.kind === 'manga' ? d.chapter : d.episode;
  return number === undefined ? null : `${d.kind === 'manga' ? 'Chapitre' : 'Épisode'} ${number}`;
};

/** Phrase d'aide de l'état « reconnu » : où en est la liste et ce qu'il reste à faire pour ce chapitre. */
function matchedHelp(tracking: Extract<TrackingState, { kind: 'matched' }>, pattern: LearnedPattern | null): string {
  const { detection, progress } = tracking;
  const manga = detection.kind === 'manga';
  const unit = manga ? 'chapitre' : 'épisode';
  const number = manga ? detection.chapter : detection.episode;
  if (progress !== undefined && number !== undefined && progress >= number) {
    return `Ton ${unit} ${number} est dans ta liste (tu es au ${unit} ${progress}).`;
  }
  const where = progress !== undefined ? `Dans ta liste : ${unit} ${progress}.` : 'Pas encore dans ta liste.';
  const auto = manga && pattern?.mangaTracking?.mode !== 'manual';
  return `${where} ${auto ? 'La progression est ajoutée quand tu arrives à la fin du chapitre.' : 'Touche « Marquer comme lu » quand tu as terminé.'}`;
}

const NOTICE_COLOR = { success: Colors.success, error: Colors.destructive, info: Colors.textSecondary } as const;

type BarMode = 'panel' | 'pill' | 'icon';

const PILL_DELAY_MS = 5_000;
const PILL_NOTICE_DELAY_MS = 7_000;

/** Texte court de la pastille : l'essentiel de l'état, sans ouvrir le panneau. */
function pillText(tracking: TrackingState): string {
  switch (tracking.kind) {
    case 'idle':
      return 'Aucune œuvre détectée';
    case 'resolving':
      return 'Recherche…';
    case 'confirm':
      return 'Quelle œuvre ?';
    case 'ignored':
      return 'Suivi désactivé';
    case 'matched': {
      const number = numberLabel(tracking.detection);
      return number ? `${tracking.match.title} · ${number}` : tracking.match.title;
    }
  }
}

/**
 * Barre de suivi Actunime, équivalent mobile du popup de l'extension. Elle flotte par-dessus la page (elle ne la
 * redimensionne jamais) et reste discrète pendant la lecture :
 * - `panel` : le détail et les actions, ouvert d'office quand il faut choisir l'œuvre ;
 * - `pill` : une pastille translucide d'une ligne, pour une œuvre reconnue ;
 * - `icon` : le seul logo Actunime, où la pastille se range seule au bout de quelques secondes.
 */
export function TrackingBar(props: ITrackingBarProps) {
  const { tracking, notice, host, pattern } = props;
  const [mode, setMode] = useState<BarMode>('pill');

  const number = 'detection' in tracking ? numberLabel(tracking.detection) : null;
  const stateKey = `${tracking.kind}|${'detection' in tracking ? `${tracking.detection.title}|${number}` : ''}`;

  // Mode par défaut selon l'état : on n'ouvre le panneau que quand l'utilisateur doit décider.
  useEffect(() => {
    if (tracking.kind === 'resolving') return;
    setMode(tracking.kind === 'confirm' ? 'panel' : tracking.kind === 'ignored' ? 'icon' : 'pill');
  }, [stateKey]); // eslint-disable-line react-hooks/exhaustive-deps -- seul un changement d'état réinitialise le mode

  // Un retour (ajout réussi, erreur) rouvre la pastille pour qu'on le voie.
  useEffect(() => {
    if (notice) setMode((current) => (current === 'icon' ? 'pill' : current));
  }, [notice]);

  useEffect(() => {
    if (mode !== 'pill') return;
    const timer = setTimeout(() => setMode('icon'), notice ? PILL_NOTICE_DELAY_MS : PILL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [mode, notice, stateKey]);

  const title =
    tracking.kind === 'idle'
      ? 'Aucune œuvre détectée'
      : tracking.kind === 'resolving'
        ? 'Recherche sur Actunime…'
        : tracking.kind === 'confirm'
          ? 'Quelle œuvre est-ce ?'
          : tracking.kind === 'matched'
            ? tracking.match.title
            : 'Suivi désactivé';

  const inList =
    tracking.kind === 'matched' &&
    tracking.progress !== undefined &&
    (tracking.detection.kind === 'manga' ? tracking.detection.chapter : tracking.detection.episode) !== undefined &&
    tracking.progress >=
      ((tracking.detection.kind === 'manga' ? tracking.detection.chapter : tracking.detection.episode) ?? 0);

  if (mode === 'icon') {
    return (
      <View pointerEvents="box-none" style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ouvrir le suivi Actunime"
          onPress={() => setMode('pill')}
          style={styles.iconButton}
        >
          <Image source={require('../../../assets/images/logo.png')} style={styles.iconLogo} contentFit="contain" />
        </Pressable>
      </View>
    );
  }

  if (mode === 'pill') {
    return (
      <View pointerEvents="box-none" style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ouvrir le détail du suivi Actunime"
          onPress={() => setMode('panel')}
          style={styles.pill}
        >
          <Image source={require('../../../assets/images/logo.png')} style={styles.pillLogo} contentFit="contain" />
          {tracking.kind === 'resolving' && <ActivityIndicator size="small" color={Colors.primary} />}
          <ThemedText
            type="smallBold"
            numberOfLines={1}
            style={[styles.pillText, notice && { color: NOTICE_COLOR[notice.tone] }]}
          >
            {notice ? notice.text : pillText(tracking)}
          </ThemedText>
          {!notice && inList && <Ionicons name="checkmark-circle" size={18} color={Colors.success} />}
        </Pressable>
      </View>
    );
  }

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <ThemedView type="backgroundElement" style={styles.bar}>
        <Pressable accessibilityRole="button" onPress={() => setMode('pill')} style={styles.header}>
          <Image source={require('../../../assets/images/logo.png')} style={styles.logo} contentFit="contain" />
          <View style={styles.headerText}>
            <ThemedText type="smallBold" numberOfLines={1}>
              {title}
            </ThemedText>
            {number && (
              <ThemedText type="small" themeColor="textSecondary">
                {number}
              </ThemedText>
            )}
          </View>
          {tracking.kind === 'resolving' && <ActivityIndicator color={Colors.primary} />}
          <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
        </Pressable>

        {notice && (
          <ThemedText type="small" style={{ color: NOTICE_COLOR[notice.tone] }}>
            {notice.text}
          </ThemedText>
        )}

        {
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
          >
            {tracking.kind === 'idle' && (
              <>
                <ThemedText type="small" themeColor="textSecondary">
                  Ouvre une page de chapitre ou d’épisode : Actunime la reconnaît toute seule.
                </ThemedText>
                <Button label="Chercher une œuvre à la main" variant="outline" onPress={props.onSearch} />
                <Pressable onPress={props.onConfigure}>
                  <ThemedText type="link">
                    {pattern ? 'Reconfigurer ce site' : 'Page non reconnue sur un chapitre ? Configurer ce site'}
                  </ThemedText>
                </Pressable>
                <Pressable onPress={props.onIgnore}>
                  <ThemedText type="link" themeColor="textSecondary">
                    Ne pas suivre {host || 'ce site'}
                  </ThemedText>
                </Pressable>
              </>
            )}

            {tracking.kind === 'confirm' && (
              <>
                <ThemedText type="small" themeColor="textSecondary">
                  Page détectée : « {tracking.detection.title} ». Choisis l’œuvre correspondante pour que le suivi
                  s’active.
                </ThemedText>
                {tracking.candidates.map((candidate) => (
                  <Pressable key={candidate.key} onPress={() => props.onChoose(candidate)} style={styles.candidate}>
                    <Image
                      source={candidate.posterUrl ? { uri: candidate.posterUrl } : undefined}
                      style={styles.poster}
                      contentFit="cover"
                    />
                    <View style={styles.candidateText}>
                      <ThemedText type="smallBold" numberOfLines={2}>
                        {candidate.title}
                      </ThemedText>
                      {candidate.origin !== 'media' && (
                        <ThemedText type="small" themeColor="warning">
                          En attente de validation
                        </ThemedText>
                      )}
                    </View>
                  </Pressable>
                ))}
                <Button label="Aucune de ces œuvres : chercher" variant="outline" onPress={props.onSearch} />
                <View style={styles.links}>
                  <Pressable onPress={props.onConfigure}>
                    <ThemedText type="link">Le titre est faux : configurer ce site</ThemedText>
                  </Pressable>
                </View>
              </>
            )}

            {tracking.kind === 'matched' && (
              <>
                <ThemedText type="small" themeColor="textSecondary">
                  {matchedHelp(tracking, pattern)}
                </ThemedText>
                {numberLabel(tracking.detection) && <Button label="Marquer comme lu" onPress={props.onMarkRead} />}
                <View style={styles.links}>
                  <Pressable onPress={props.onChange}>
                    <ThemedText type="link">Ce n’est pas la bonne œuvre</ThemedText>
                  </Pressable>
                  <Pressable onPress={props.onConfigure}>
                    <ThemedText type="link">Configurer ce site</ThemedText>
                  </Pressable>
                  <Pressable onPress={props.onIgnore}>
                    <ThemedText type="link" themeColor="textSecondary">
                      Ne pas suivre ce site
                    </ThemedText>
                  </Pressable>
                </View>
              </>
            )}

            {tracking.kind === 'ignored' && (
              <>
                <ThemedText type="small" themeColor="textSecondary">
                  Actunime ne suit pas {host || 'ce site'}.
                </ThemedText>
                <Button label="Réactiver le suivi" variant="outline" onPress={props.onUnignore} />
              </>
            )}
          </ScrollView>
        }
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Par-dessus la page : le lecteur garde toute la hauteur et ne se redimensionne jamais.
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: Spacing.three,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  bar: {
    alignSelf: 'stretch',
    padding: Spacing.three,
    gap: Spacing.two,
    borderRadius: Radius.large,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: '60%',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    maxWidth: '85%',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: 'rgba(3, 10, 29, 0.78)',
  },
  pillLogo: { width: 20, height: 21 },
  pillText: { flexShrink: 1 },
  /** Le logo seul, flottant sur la page (le même que le favicon du site) : pas de pastille derrière. */
  iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  iconLogo: { width: 38, height: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  logo: { width: 22, height: 23 },
  headerText: { flex: 1 },
  body: { flexGrow: 0, flexShrink: 1 },
  bodyContent: { gap: Spacing.two },
  candidate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  poster: { width: 40, height: 56, borderRadius: Radius.small, backgroundColor: Colors.backgroundSelected },
  candidateText: { flex: 1, gap: Spacing.half },
  links: { flexDirection: 'row', flexWrap: 'wrap', columnGap: Spacing.four, rowGap: Spacing.one },
});
