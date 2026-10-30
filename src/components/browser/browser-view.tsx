import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from 'react-native-webview';

import { Pressable } from '@/components/tap';
import { ConfigWizard } from './config-wizard';
import { fieldStyle } from './wizard-parts';
import { SearchSheet } from './search-sheet';
import { TrackingBar } from './tracking-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import type { StrategyResult } from '@/detection/core/types';
import { INJECTED_DETECTION } from '@/detection/injected.generated';
import { commandScript, parseInPageMessage, type PickedElement } from '@/detection/messages';
import { resolveAddress } from '@/lib/address';
import { lastReadKey, recordLastRead, recordVisit } from '@/lib/browsing';
import { useTracking } from '@/lib/use-tracking';
import { Adblock } from '../../../modules/actunime-adblock/src';

/** Signaux de vie privée envoyés à chaque site : Do Not Track et Global Privacy Control. */
const PRIVACY_HEADERS = { DNT: '1', 'Sec-GPC': '1' };

interface IconButtonProps {
  name: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

function IconButton({ name, label, onPress, disabled }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      style={[styles.iconButton, disabled && styles.disabled]}
    >
      <Ionicons name={name} size={22} color={Colors.text} />
    </Pressable>
  );
}

interface IBrowserViewProps {
  url: string;
  /** Retour à la page d'accueil du navigateur (bouton Accueil, ou retour Android depuis la première page). */
  onHome: () => void;
}

/** Page web avec barre d'outils et suivi Actunime. Une nouvelle adresse venue de l'extérieur remonte le composant (`key`). */
export function BrowserView({ url: initialUrl, onHome }: Readonly<IBrowserViewProps>) {
  const focused = useIsFocused();
  const webview = useRef<WebView>(null);
  const tracking = useTracking(webview);
  // `source` n'est modifié que par une adresse saisie : le mettre à jour à chaque navigation rechargerait la page en boucle.
  const [source, setSource] = useState(initialUrl);
  const [pageUrl, setPageUrl] = useState(initialUrl);
  const [address, setAddress] = useState(initialUrl);
  const [editing, setEditing] = useState(false);
  const [navigation, setNavigation] = useState({ canGoBack: false, canGoForward: false, loading: true });
  const [progress, setProgress] = useState(0);
  const [shield, setShield] = useState(true);
  const [blocked, setBlocked] = useState(0);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [strategies, setStrategies] = useState<StrategyResult[] | null>(null);
  const [picked, setPicked] = useState<{ seq: number; element: PickedElement } | null>(null);
  const pickSeq = useRef(0);

  // Bouton retour d'Android : page précédente du site, puis accueil du navigateur. L'onglet reste monté
  // quand on change d'onglet : le retour ne lui appartient que tant qu'il est à l'écran.
  useEffect(() => {
    if (!focused) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (navigation.canGoBack) webview.current?.goBack();
      else onHome();
      return true;
    });
    return () => subscription.remove();
  }, [focused, navigation.canGoBack, onHome]);

  useEffect(() => {
    const subscription = Adblock.onBlocked((event) => setBlocked(event.count));
    return () => subscription.remove();
  }, []);

  const toggleShield = useCallback(() => {
    const next = !shield;
    Adblock.setEnabled(next);
    setShield(next);
    webview.current?.reload();
  }, [shield]);

  const onNavigationStateChange = useCallback(
    (state: WebViewNavigation) => {
      setNavigation({ canGoBack: state.canGoBack, canGoForward: state.canGoForward, loading: state.loading });
      setPageUrl(state.url);
      if (!editing) setAddress(state.url);
      if (!state.loading) void recordVisit(state.url);
    },
    [editing],
  );

  const submitAddress = useCallback(() => {
    const target = resolveAddress(address);
    setEditing(false);
    if (target) setSource(target);
  }, [address]);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const message = parseInPageMessage(event.nativeEvent.data);
      if (!message) return;
      if (message.type === 'strategies') return setStrategies(message.results);
      if (message.type === 'picked') {
        pickSeq.current += 1;
        return setPicked({ seq: pickSeq.current, element: message.element });
      }
      if (message.type === 'pick-cancelled') return;
      void tracking.onMessage(message);
    },
    [tracking],
  );

  const runStrategies = useCallback(() => {
    setStrategies(null);
    tracking.send({ type: 'run-strategies' });
  }, [tracking]);

  const current = 'detection' in tracking.tracking ? tracking.tracking.detection : null;

  // Page de l'œuvre reconnue : la page « Navigateur » propose de la reprendre au même chapitre ou épisode.
  const state = tracking.tracking;
  useEffect(() => {
    if (state.kind !== 'matched') return;
    const { detection, match } = state;
    const number = detection.kind === 'manga' ? detection.chapter : detection.episode;
    if (number === undefined || !detection.url) return;
    void recordLastRead(lastReadKey(detection.kind, match.id), { url: detection.url, number });
  }, [state]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ThemedView type="backgroundElement" style={styles.toolbar}>
          <IconButton name="home-outline" label="Accueil du navigateur" onPress={onHome} />
          <IconButton
            name="chevron-back"
            label="Page précédente"
            onPress={() => webview.current?.goBack()}
            disabled={!navigation.canGoBack}
          />
          <IconButton
            name="chevron-forward"
            label="Page suivante"
            onPress={() => webview.current?.goForward()}
            disabled={!navigation.canGoForward}
          />
          <TextInput
            value={address}
            onChangeText={setAddress}
            onFocus={() => setEditing(true)}
            onBlur={() => setEditing(false)}
            onSubmitEditing={submitAddress}
            selectTextOnFocus
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="go"
            style={styles.address}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={shield ? 'Désactiver le blocage des pubs' : 'Activer le blocage des pubs'}
            onPress={toggleShield}
            style={styles.shield}
          >
            <Ionicons
              name={shield ? 'shield-checkmark' : 'shield-outline'}
              size={22}
              color={shield ? Colors.primary : Colors.textSecondary}
            />
            {shield && blocked > 0 && (
              <ThemedText type="smallBold" themeColor="primary">
                {blocked}
              </ThemedText>
            )}
          </Pressable>
          <IconButton
            name={navigation.loading ? 'stop' : 'reload'}
            label={navigation.loading ? 'Arrêter' : 'Recharger'}
            onPress={() => (navigation.loading ? webview.current?.stopLoading() : webview.current?.reload())}
          />
        </ThemedView>
        <View style={styles.progressTrack}>
          {navigation.loading && <View style={[styles.progressBar, { width: `${Math.round(progress * 100)}%` }]} />}
        </View>

        <View style={styles.container}>
          <WebView
            ref={webview}
            source={{ uri: source, headers: PRIVACY_HEADERS }}
            style={styles.container}
            injectedJavaScript={INJECTED_DETECTION}
            onMessage={onMessage}
            onNavigationStateChange={onNavigationStateChange}
            onLoadProgress={({ nativeEvent }) => setProgress(nativeEvent.progress)}
            setSupportMultipleWindows={false}
            thirdPartyCookiesEnabled={false}
            mixedContentMode="never"
            allowsBackForwardNavigationGestures
          />

          {!wizardOpen && (
            <TrackingBar
              tracking={tracking.tracking}
              notice={tracking.notice}
              host={tracking.host}
              pattern={tracking.pattern}
              onMarkRead={tracking.markRead}
              onChoose={(media) => void tracking.choose(media)}
              onChange={tracking.change}
              onSearch={() => setSearchOpen(true)}
              onConfigure={() => setWizardOpen(true)}
              onIgnore={() => void tracking.ignoreHost()}
              onUnignore={() => void tracking.unignoreHost()}
            />
          )}
        </View>

        <ConfigWizard
          visible={wizardOpen}
          host={tracking.host}
          url={pageUrl}
          inferredKind={tracking.inferredKind}
          strategies={strategies}
          picked={picked}
          onRunStrategies={runStrategies}
          onStartPick={(field) => {
            const style = fieldStyle(field, tracking.inferredKind);
            webview.current?.injectJavaScript(
              commandScript({ type: 'start-pick', label: style.label, color: style.color }),
            );
          }}
          onStopPick={() => webview.current?.injectJavaScript(commandScript({ type: 'stop-pick' }))}
          onClose={() => setWizardOpen(false)}
          onSave={tracking.applyPattern}
        />

        <SearchSheet
          visible={searchOpen}
          initialQuery={current?.title ?? ''}
          initialKind={current?.kind ?? tracking.inferredKind}
          initialNumber={current ? (current.kind === 'manga' ? current.chapter : current.episode) : undefined}
          onClose={() => setSearchOpen(false)}
          onSubmit={tracking.markManually}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.medium },
  disabled: { opacity: 0.35 },
  shield: {
    minWidth: 44,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  address: {
    flex: 1,
    height: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
    fontFamily: Fonts.medium,
    fontSize: 14,
  },
  progressTrack: { height: 2, backgroundColor: Colors.backgroundElement },
  progressBar: { height: 2, backgroundColor: Colors.primary },
});
