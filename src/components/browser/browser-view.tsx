import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router, useIsFocused } from 'expo-router';
import { Alert, BackHandler, Linking, Share, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  WebView,
  type WebViewMessageEvent,
  type WebViewNavigation,
} from 'react-native-webview';

import { Pressable } from '@/components/tap';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { ConfigWizard } from './config-wizard';
import { fieldStyle } from './wizard-parts';
import { SearchSheet } from './search-sheet';
import { TabCountButton } from './tab-switcher';
import { TrackingBar } from './tracking-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { titleAlternatives } from '@/detection/core/auto-strategy';
import type { StrategyResult } from '@/detection/core/types';
import { INJECTED_DETECTION } from '@/detection/injected.generated';
import { commandScript, parseInPageMessage, type PickedElement } from '@/detection/messages';
import { clickGuardScript } from './click-guard-script';
import { resolveAddress } from '@/lib/address';
import { allowNavigation, isSameSite, matchesClick, siteOf, type IUserClick } from '@/lib/navigation-guard';
import { nextNumberUrl } from '@/lib/next-chapter';
import { setReadingChromeHidden, useReadingChromeHidden } from '@/lib/reading-chrome';
import { getBrowserSettings, setBrowserSetting, useBrowserSettings } from '@/lib/browser-settings';
import { lastReadKey, recordLastRead, recordVisit } from '@/lib/browsing';
import { useTracking } from '@/lib/use-tracking';
import { Adblock } from '../../../modules/actunime-adblock/src';

/** Signaux de vie privée envoyés à chaque site : Do Not Track et Global Privacy Control. */
const PRIVACY_HEADERS = { DNT: '1', 'Sec-GPC': '1' };

/** Message de clic du script de garde : accepté seulement s'il porte le jeton de l'onglet. */
function readGuardMessage(raw: string, token: string): { href: string | null } | null {
  if (!raw.includes('actunimeGuard')) return null;
  try {
    const value = JSON.parse(raw) as { actunimeGuard?: string; href?: string | null };
    if (value.actunimeGuard === token) return { href: typeof value.href === 'string' ? value.href : null };
  } catch {
    // message étranger
  }
  return null;
}

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

function MenuRow({ icon, label, onPress }: Readonly<{ icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void }>) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.menuRow}>
      <Ionicons name={icon} size={22} color={Colors.text} />
      <ThemedText>{label}</ThemedText>
    </Pressable>
  );
}

interface IBrowserViewProps {
  url: string;
  /** Retour à la page d'accueil du navigateur (menu, ou retour Android depuis la première page) ; l'onglet reste ouvert. */
  onHome: () => void;
  /** Onglet affiché : un onglet en arrière-plan reste monté mais ne gère ni le retour d'Android ni les barres. */
  active: boolean;
  tabCount: number;
  onOpenTabs: () => void;
  /** Titre et adresse courants, pour la liste des onglets. */
  onInfo: (info: { title?: string; url: string }) => void;
}

/** Page web avec barre d'outils et suivi Actunime. Une nouvelle adresse venue de l'extérieur remonte le composant (`key`). */
export function BrowserView({ url: initialUrl, onHome, active, tabCount, onOpenTabs, onInfo }: Readonly<IBrowserViewProps>) {
  const focused = useIsFocused() && active;
  const settings = useBrowserSettings();
  const webview = useRef<WebView>(null);
  const tracking = useTracking(webview);
  // `source` n'est modifié que par une adresse saisie : le mettre à jour à chaque navigation rechargerait la page en boucle.
  const [source, setSource] = useState(initialUrl);
  const [pageUrl, setPageUrl] = useState(initialUrl);
  const [address, setAddress] = useState(initialUrl);
  const [editing, setEditing] = useState(false);
  const [navigation, setNavigation] = useState({ canGoBack: false, canGoForward: false, loading: true });
  const [progress, setProgress] = useState(0);
  const [blocked, setBlocked] = useState(0);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [strategies, setStrategies] = useState<StrategyResult[] | null>(null);
  const [picked, setPicked] = useState<{ seq: number; element: PickedElement } | null>(null);
  const pickSeq = useRef(0);
  const [menuOpen, setMenuOpen] = useState(false);
  // Plein écran de lecture : barre d'outils masquée vers le bas. Après chaque changement on ignore le défilement
  // un instant, car le redimensionnement de la page en provoque un lui-même.
  const barsHidden = useReadingChromeHidden();
  const setBarsHidden = setReadingChromeHidden;
  // Barre complète rappelée d'un appui sur la bande du haut, sans rendre la navigation du bas.
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [readPercent, setReadPercent] = useState(0);
  const lastBarsChange = useRef(0);
  const nextLinkResolver = useRef<((href: string | null) => void) | null>(null);

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

  // Seuil de fin d'épisode : le script le lit à chaque mesure, un changement de réglage vaut aussitôt.
  useEffect(() => {
    tracking.send({ type: 'set-options', episodeThreshold: settings.episodeThreshold / 100 });
  }, [settings.episodeThreshold]); // eslint-disable-line react-hooks/exhaustive-deps -- `send` est stable par WebView

  // Les barres reviennent quand on quitte le navigateur (autre onglet) ou la page.
  useEffect(() => {
    if (!focused) setReadingChromeHidden(false);
    return () => setReadingChromeHidden(false);
  }, [focused]);

  useEffect(() => {
    const subscription = Adblock.onBlocked((event) => setBlocked(event.count));
    return () => subscription.remove();
  }, []);

  // Le réglage fait foi : il s'applique à l'ouverture, et le bouton de la barre le change aussi.
  const shield = settings.adblock;
  useEffect(() => {
    Adblock.setEnabled(settings.adblock);
  }, [settings.adblock]);
  const toggleShield = useCallback(() => {
    setBrowserSetting('adblock', !getBrowserSettings().adblock);
    webview.current?.reload();
  }, []);

  const onNavigationStateChange = useCallback(
    (state: WebViewNavigation) => {
      setNavigation({ canGoBack: state.canGoBack, canGoForward: state.canGoForward, loading: state.loading });
      setPageUrl(state.url);
      if (!state.loading) {
        chainOpen.current = false;
        approved.current = null;
      }
      if (!state.loading) onInfo({ title: state.title || undefined, url: state.url });
      if (!editing) setAddress(state.url);
      if (!state.loading && getBrowserSettings().history) void recordVisit(state.url);
    },
    [editing, onInfo],
  );

  // Redirections de pub : un autre site n'est ouvert que sur un vrai clic de lien visible (voir `navigation-guard`).
  const guardToken = useRef(Math.random().toString(36).slice(2)).current;
  const guardScript = useMemo(() => clickGuardScript(guardToken), [guardToken]);
  const lastClick = useRef<IUserClick | null>(null);
  const chainOpen = useRef(false);
  const approved = useRef<string | null>(null);
  const [refused, setRefused] = useState<string | null>(null);
  const pageUrlRef = useRef(initialUrl);
  pageUrlRef.current = pageUrl;
  const onShouldStart = useCallback(
    (request: { url: string; isTopFrame?: boolean }) => {
      const now = Date.now();
      const isTopFrame = request.isTopFrame ?? true;
      const allowed = allowNavigation({
        target: request.url,
        current: pageUrlRef.current,
        isTopFrame,
        click: lastClick.current,
        now,
        chainOpen: chainOpen.current,
        approved: approved.current,
      });
      if (!allowed) {
        if (isTopFrame && siteOf(request.url)) setRefused(request.url);
        return false;
      }
      if (isTopFrame && matchesClick(request.url, lastClick.current, now)) chainOpen.current = true;
      if (isTopFrame) setRefused(null);
      return true;
    },
    [],
  );
  // Les fenêtres ouvertes par `window.open` sont ignorées, sauf vers le même site (lien en nouvelle fenêtre) :
  // celles-ci s'ouvrent dans la page, jamais dans une fenêtre qui échapperait au blocage.
  const onOpenWindow = useCallback((event: { nativeEvent: { targetUrl: string } }) => {
    const target = event.nativeEvent.targetUrl;
    if (isSameSite(target, pageUrlRef.current)) setSource(target);
  }, []);
  const allowRefused = useCallback(() => {
    if (!refused) return;
    approved.current = refused;
    setSource(refused);
    setRefused(null);
  }, [refused]);

  const submitAddress = useCallback(() => {
    const target = resolveAddress(address);
    setEditing(false);
    if (target) setSource(target);
  }, [address]);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const guard = readGuardMessage(event.nativeEvent.data, guardToken);
      if (guard) {
        lastClick.current = { href: guard.href, at: Date.now() };
        return;
      }
      const message = parseInPageMessage(event.nativeEvent.data);
      if (!message) return;
      if (message.type === 'strategies') return setStrategies(message.results);
      if (message.type === 'picked') {
        pickSeq.current += 1;
        return setPicked({ seq: pickSeq.current, element: message.element });
      }
      if (message.type === 'pick-cancelled') return;
      // Plein écran : on y entre en lisant vers le bas ; remonter dans la page n'en sort pas (relire une planche
      // ratée ne doit pas faire revenir les barres). On en sort en haut de page, en bas de page, ou d'un appui.
      if (message.type === 'scroll-direction') {
        if (message.direction === 'down' && getBrowserSettings().fullscreen && Date.now() - lastBarsChange.current > 600) {
          lastBarsChange.current = Date.now();
          setToolbarOpen(false);
          setBarsHidden(true);
        }
        return;
      }
      if (message.type === 'scroll-state') {
        setReadPercent(message.percent);
        if (message.edge !== 'middle' && Date.now() - lastBarsChange.current > 600) {
          lastBarsChange.current = Date.now();
          setBarsHidden(false);
        }
        return;
      }
      if (message.type === 'next-link') return nextLinkResolver.current?.(message.href);
      void tracking.onMessage(message);
    },
    [tracking, guardToken],
  );

  const runStrategies = useCallback(() => {
    setStrategies(null);
    tracking.send({ type: 'run-strategies' });
  }, [tracking]);

  const current = 'detection' in tracking.tracking ? tracking.tracking.detection : null;

  // Œuvre à choisir : les autres titres de la page sont prêts avant même que l'utilisateur dise que le titre est faux.
  const needsChoice = tracking.tracking.kind === 'confirm';
  useEffect(() => {
    if (needsChoice) tracking.send({ type: 'run-strategies' });
  }, [needsChoice, current?.url]); // eslint-disable-line react-hooks/exhaustive-deps -- `send` est stable par WebView
  const alternatives = needsChoice ? titleAlternatives(strategies ?? [], current?.title) : [];

  // Page de l'œuvre reconnue : la page « Navigateur » propose de la reprendre au même chapitre ou épisode.
  const state = tracking.tracking;
  useEffect(() => {
    if (state.kind !== 'matched') return;
    const { detection, match } = state;
    const number = detection.kind === 'manga' ? detection.chapter : detection.episode;
    if (number === undefined || !detection.url || !getBrowserSettings().history) return;
    void recordLastRead(lastReadKey(detection.kind, match.id), { url: detection.url, number });
  }, [state]);

  const unit = current?.kind === 'manga' ? 'Chapitre' : 'Épisode';
  const currentNumber = current ? (current.kind === 'manga' ? current.chapter : current.episode) : undefined;

  /** Chapitre ou épisode suivant : le lien de la page quand elle en donne un, sinon le numéro suivant dans l'adresse. */
  const goNext = useCallback(async () => {
    setMenuOpen(false);
    const href = await new Promise<string | null>((resolve) => {
      nextLinkResolver.current = resolve;
      tracking.send({ type: 'find-next-link' });
      setTimeout(() => resolve(null), 1500);
    });
    nextLinkResolver.current = null;
    const target = href ?? (currentNumber !== undefined ? nextNumberUrl(pageUrl, currentNumber) : null);
    if (target) setSource(target);
    else Alert.alert('Suite introuvable', `Cette page ne donne pas de lien vers le ${unit.toLowerCase()} suivant.`);
  }, [tracking, currentNumber, pageUrl, unit]);

  const showFullBar = !barsHidden || toolbarOpen || editing;
  const stripTitle = state.kind === 'matched' ? state.match.title : (current?.title ?? tracking.host ?? '');
  const stripNumber = currentNumber !== undefined ? ` · ${current?.kind === 'manga' ? 'Ch.' : 'Ép.'} ${currentNumber}` : '';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        {showFullBar ? (
        <ThemedView type="backgroundElement" style={styles.toolbar}>
          <TabCountButton count={tabCount} onPress={onOpenTabs} />
          <IconButton
            name="chevron-back"
            label="Page précédente"
            onPress={() => webview.current?.goBack()}
            disabled={!navigation.canGoBack}
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
          <IconButton name="ellipsis-vertical" label="Menu du navigateur" onPress={() => setMenuOpen(true)} />
        </ThemedView>
        ) : (
          <View style={styles.strip}>
            <Pressable accessibilityRole="button" accessibilityLabel="Afficher la barre du navigateur" onPress={() => setToolbarOpen(true)} style={styles.stripMain}>
              <ThemedText type="smallBold" numberOfLines={1} style={styles.stripTitle}>
                {stripTitle}
                {stripNumber}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {readPercent} %
              </ThemedText>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Menu du navigateur" onPress={() => setMenuOpen(true)} hitSlop={8} style={styles.stripMenu}>
              <Ionicons name="ellipsis-vertical" size={18} color={Colors.text} />
            </Pressable>
          </View>
        )}
        <View style={styles.progressTrack}>
          {navigation.loading && <View style={[styles.progressBar, { width: `${Math.round(progress * 100)}%` }]} />}
        </View>

        <View style={styles.container}>
          <WebView
            ref={webview}
            source={{ uri: source, headers: PRIVACY_HEADERS }}
            style={styles.container}
            injectedJavaScript={INJECTED_DETECTION}
            injectedJavaScriptBeforeContentLoaded={guardScript}
            onMessage={onMessage}
            onNavigationStateChange={onNavigationStateChange}
            onLoadProgress={({ nativeEvent }) => setProgress(nativeEvent.progress)}
            setSupportMultipleWindows
            onOpenWindow={onOpenWindow}
            onShouldStartLoadWithRequest={onShouldStart}
            thirdPartyCookiesEnabled={false}
            mixedContentMode="never"
            allowsBackForwardNavigationGestures
          />

          {refused && (
            <View style={styles.refused}>
              <ThemedText type="small" numberOfLines={1} style={styles.refusedText}>
                Redirection bloquée : {siteOf(refused)}
              </ThemedText>
              <Pressable accessibilityRole="button" onPress={allowRefused} hitSlop={8}>
                <ThemedText type="smallBold" themeColor="primary">
                  Ouvrir
                </ThemedText>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={() => setRefused(null)} hitSlop={8}>
                <Ionicons name="close" size={18} color={Colors.textSecondary} />
              </Pressable>
            </View>
          )}

          {!wizardOpen && (
            <TrackingBar
              tracking={tracking.tracking}
              notice={tracking.notice}
              host={tracking.host}
              pattern={tracking.pattern}
              alternatives={alternatives}
              onPickTitle={(alternative) => void tracking.pickTitle(alternative.strategy)}
              onQuickAdd={tracking.quickAdd}
              onMarkRead={tracking.markRead}
              onChoose={(media) => void tracking.choose(media)}
              onChange={tracking.change}
              onSearch={() => setSearchOpen(true)}
              onConfigure={() => setWizardOpen(true)}
              onIgnore={() => void tracking.ignoreHost()}
              onUnignore={() => void tracking.unignoreHost()}
              onSkip={(mode) => void tracking.skip(mode)}
              onResume={() => void tracking.resume()}
            />
          )}
        </View>

        <BottomSheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Navigateur">
          <View style={styles.menu}>
            <MenuRow
              icon="home-outline"
              label="Accueil du navigateur"
              onPress={() => {
                setMenuOpen(false);
                onHome();
              }}
            />
            {current && currentNumber !== undefined ? (
              <MenuRow icon="play-skip-forward-outline" label={`${unit} suivant`} onPress={() => void goNext()} />
            ) : null}
            {navigation.canGoForward ? (
              <MenuRow
                icon="chevron-forward"
                label="Page suivante de l’historique"
                onPress={() => {
                  setMenuOpen(false);
                  webview.current?.goForward();
                }}
              />
            ) : null}
            <MenuRow
              icon="share-outline"
              label="Partager ou copier l’adresse"
              onPress={() => {
                setMenuOpen(false);
                void Share.share({ message: pageUrl });
              }}
            />
            <MenuRow
              icon="open-outline"
              label="Ouvrir dans le navigateur du téléphone"
              onPress={() => {
                setMenuOpen(false);
                void Linking.openURL(pageUrl);
              }}
            />
            <MenuRow
              icon="settings-outline"
              label="Réglages du navigateur"
              onPress={() => {
                setMenuOpen(false);
                router.push('/browser-settings');
              }}
            />
          </View>
        </BottomSheet>

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
  refused: {
    position: 'absolute',
    top: Spacing.two,
    left: Spacing.two,
    right: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.medium,
    backgroundColor: Colors.backgroundElement,
  },
  refusedText: { flex: 1 },
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
  menu: { gap: Spacing.one, paddingBottom: Spacing.three },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 48, paddingHorizontal: Spacing.two, borderRadius: Radius.medium },
  strip: {
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.three,
    backgroundColor: 'rgba(11, 22, 51, 0.82)',
  },
  stripMain: { flex: 1, height: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  stripTitle: { flexShrink: 1, fontSize: 12, lineHeight: 16 },
  stripMenu: { width: 40, height: 28, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { height: 2, backgroundColor: Colors.backgroundElement },
  progressBar: { height: 2, backgroundColor: Colors.primary },
});
