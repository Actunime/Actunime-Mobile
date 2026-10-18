import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { INJECTED_DETECTION } from '@/detection/injected.generated';
import { parseInPageMessage, type PageDetection } from '@/detection/messages';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ISearchMedia } from '@/lib/api';
import { confirm, pushProgress, resolve, titleOf, type PushResult } from '@/lib/sync';
import type { IMatch } from '@/lib/storage';

const RESULT_LABEL: Record<PushResult, string> = {
  created: 'ajouté à ta liste',
  updated: 'progression mise à jour',
  unchanged: 'déjà à jour',
};

export default function BrowserScreen() {
  const theme = useTheme();
  const { url } = useLocalSearchParams<{ url: string }>();
  const webview = useRef<WebView>(null);
  const [detection, setDetection] = useState<PageDetection | null>(null);
  const [match, setMatch] = useState<IMatch | null>(null);
  const [candidates, setCandidates] = useState<ISearchMedia[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const fail = (err: unknown) => setStatus(err instanceof Error ? err.message : 'Erreur inattendue');

  const push = useCallback(async (page: PageDetection, target: IMatch) => {
    try {
      const result = await pushProgress(page, target);
      const number = page.kind === 'manga' ? `chapitre ${page.chapter}` : `épisode ${page.episode}`;
      setStatus(`${target.title}, ${number} : ${RESULT_LABEL[result]}`);
    } catch (err) {
      fail(err);
    }
  }, []);

  const onMessage = useCallback(
    async (event: WebViewMessageEvent) => {
      const message = parseInPageMessage(event.nativeEvent.data);
      if (!message) return;

      if (message.type === 'detection') {
        setDetection(message.detection);
        setMatch(null);
        setCandidates([]);
        setStatus(null);
        if (!message.detection) return;
        try {
          const resolution = await resolve(message.detection);
          setMatch(resolution.match);
          setCandidates(resolution.candidates);
          if (!resolution.match && resolution.candidates.length === 0) setStatus('Introuvable sur Actunime');
        } catch (err) {
          fail(err);
        }
        return;
      }

      // Fin de chapitre atteinte : on n'écrit que si l'œuvre est identifiée (sinon l'utilisateur confirme d'abord).
      setDetection(message.detection);
      const resolution = await resolve(message.detection).catch(() => null);
      if (resolution?.match) await push(message.detection, resolution.match);
      else setStatus('Fin de chapitre atteinte, mais l’œuvre n’est pas confirmée');
    },
    [push],
  );

  const choose = useCallback(
    async (media: ISearchMedia) => {
      if (!detection) return;
      const chosen = await confirm(detection, media);
      setMatch(chosen);
      setCandidates([]);
    },
    [detection],
  );

  const number = detection?.kind === 'manga' ? detection.chapter : detection?.episode;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container}>
        <ThemedView type="backgroundElement" style={styles.bar}>
          <Pressable onPress={() => router.back()}>
            <ThemedText>Retour</ThemedText>
          </Pressable>
          <Pressable onPress={() => webview.current?.goBack()}>
            <ThemedText>Page précédente</ThemedText>
          </Pressable>
        </ThemedView>

        <WebView
          ref={webview}
          source={{ uri: url }}
          style={styles.container}
          injectedJavaScript={INJECTED_DETECTION}
          onMessage={onMessage}
          setSupportMultipleWindows={false}
          allowsBackForwardNavigationGestures
        />

        {detection && (
          <ThemedView type="backgroundElement" style={styles.panel}>
            <ThemedText type="smallBold">
              {detection.title}
              {number !== undefined
                ? ` · ${detection.kind === 'manga' ? 'chapitre' : 'épisode'} ${number}`
                : ''}
            </ThemedText>

            {match ? (
              <>
                <ThemedText type="small">Reconnu : {match.title}</ThemedText>
                {number !== undefined && (
                  <Pressable
                    onPress={() => push(detection, match)}
                    style={[styles.button, { backgroundColor: theme.text }]}
                  >
                    <ThemedText style={{ color: theme.background }}>Marquer comme lu</ThemedText>
                  </Pressable>
                )}
              </>
            ) : (
              candidates.length > 0 && (
                <>
                  <ThemedText type="small">C’est quelle œuvre ?</ThemedText>
                  {candidates.map((media) => (
                    <Pressable key={media.id ?? media._id} onPress={() => choose(media)}>
                      <ThemedText type="link">{titleOf(media)}</ThemedText>
                    </Pressable>
                  ))}
                </>
              )
            )}
            {status && <ThemedText type="small">{status}</ThemedText>}
          </ThemedView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bar: { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing.two },
  panel: { padding: Spacing.three, gap: Spacing.two },
  button: { paddingVertical: Spacing.two, borderRadius: Spacing.two, alignItems: 'center' },
});
