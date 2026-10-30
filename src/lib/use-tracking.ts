import { useCallback, useRef, useState, type RefObject } from 'react';
import type { WebView } from 'react-native-webview';

import { deriveEpisodeUrlRegex } from '@/detection/core/strategies';
import { commandScript, type InPageMessage, type PageDetection } from '@/detection/messages';
import type { LearnedPattern, StrategyId } from '@/detection/core/types';

import { getBrowserSettings } from './browser-settings';
import { getPattern, isHostIgnored, removePattern, savePattern, setHostIgnored } from './patterns';
import type { IMatch } from './storage';
import { confirm, currentProgress, forget, pushProgress, quickAddWork, resolve, type ICandidate, type PushResult } from './sync';

export type TrackingState =
  | { kind: 'idle' }
  | { kind: 'resolving'; detection: PageDetection }
  | { kind: 'confirm'; detection: PageDetection; candidates: ICandidate[] }
  | { kind: 'matched'; detection: PageDetection; match: IMatch; progress?: number }
  | { kind: 'ignored' };

export interface INotice {
  tone: 'success' | 'error' | 'info';
  text: string;
}

const RESULT_TEXT: Record<PushResult, string> = {
  created: 'ajouté à ta liste',
  updated: 'progression mise à jour',
  unchanged: 'déjà à jour',
};

/** Réglage d'un site à partir de la stratégie qui lit bien son titre : sert à la mémorisation automatique et au choix d'un autre titre. */
function patternFor(detection: Pick<PageDetection, 'host' | 'kind' | 'url'>, strategy: StrategyId): LearnedPattern {
  let pathname = '';
  try {
    pathname = new URL(detection.url).pathname;
  } catch {
    // adresse illisible : le réglage s'applique alors à toutes les pages du site
  }
  const now = new Date().toISOString();
  return {
    host: detection.host,
    kind: detection.kind,
    strategy,
    episodeUrlRegex: pathname ? deriveEpisodeUrlRegex(pathname) : undefined,
    mangaTracking: detection.kind === 'manga' ? { mode: 'scroll', threshold: 0.9 } : undefined,
    createdAt: now,
    updatedAt: now,
  };
}

const numberOf = (d: PageDetection) => (d.kind === 'manga' ? d.chapter : d.episode);
const unitOf = (d: PageDetection) => (d.kind === 'manga' ? 'chapitre' : 'épisode');

/**
 * État de suivi d'une page : détection → identification de l'œuvre → écriture de la progression.
 * Les décisions (confirmer, ignorer, configurer le site) viennent de l'utilisateur via la barre de suivi.
 */
export function useTracking(webview: RefObject<WebView | null>) {
  const [tracking, setTracking] = useState<TrackingState>({ kind: 'idle' });
  const [notice, setNotice] = useState<INotice | null>(null);
  const [pattern, setPattern] = useState<LearnedPattern | null>(null);
  const [host, setHost] = useState('');
  const [inferredKind, setInferredKind] = useState<'anime' | 'manga'>('manga');
  // Détection la plus récente : sert aux actions qui ne reçoivent pas la détection en paramètre.
  const latest = useRef<PageDetection | null>(null);

  const send = useCallback(
    (command: Parameters<typeof commandScript>[0]) => webview.current?.injectJavaScript(commandScript(command)),
    [webview],
  );

  const fail = useCallback((err: unknown) => {
    setNotice({ tone: 'error', text: err instanceof Error ? err.message : 'Erreur inattendue' });
  }, []);

  const progressOf = useCallback((detection: PageDetection, match: IMatch) => currentProgress(detection, match), []);

  const push = useCallback(
    async (detection: PageDetection, match: IMatch) => {
      const number = numberOf(detection);
      if (number === undefined) return setNotice({ tone: 'error', text: `Numéro de ${unitOf(detection)} non détecté` });
      try {
        const result = await pushProgress(detection, match);
        setNotice({ tone: 'success', text: `${match.title}, ${unitOf(detection)} ${number} : ${RESULT_TEXT[result]}` });
        setTracking({ kind: 'matched', detection, match, progress: await progressOf(detection, match) });
      } catch (err) {
        fail(err);
      }
    },
    [fail, progressOf],
  );

  /**
   * Page reconnue par la phase automatique et œuvre identifiée : le réglage du site est mémorisé tout seul, sans
   * passer par l'assistant. Corriger reste possible (« Ce n'est pas la bonne œuvre », « Configurer ce site »).
   */
  const rememberSite = useCallback(
    async (detection: PageDetection) => {
      if (detection.source !== 'auto' || !detection.strategy) return;
      if (await getPattern(detection.host)) return;
      const learned = patternFor(detection, detection.strategy);
      await savePattern(learned);
      setPattern(learned);
      send({ type: 'set-pattern', pattern: learned });
      setNotice({ tone: 'info', text: `${detection.host} reconnu automatiquement` });
    },
    [send],
  );

  const identify = useCallback(
    async (detection: PageDetection) => {
      latest.current = detection;
      setTracking({ kind: 'resolving', detection });
      try {
        const resolution = await resolve(detection);
        if (resolution.match) {
          void rememberSite(detection);
          setTracking({
            kind: 'matched',
            detection,
            match: resolution.match,
            progress: await progressOf(detection, resolution.match),
          });
        } else {
          setTracking({ kind: 'confirm', detection, candidates: resolution.candidates });
        }
      } catch (err) {
        fail(err);
        setTracking({ kind: 'confirm', detection, candidates: [] });
      }
    },
    [fail, progressOf, rememberSite],
  );

  const onMessage = useCallback(
    async (message: InPageMessage) => {
      if (message.type === 'ready') {
        setHost(message.host);
        setInferredKind(message.inferredKind);
        setNotice(null);
        setTracking({ kind: 'idle' });
        const [stored, ignored] = await Promise.all([getPattern(message.host), isHostIgnored(message.host)]);
        setPattern(stored);
        if (ignored) return setTracking({ kind: 'ignored' });
        send({ type: 'set-pattern', pattern: stored });
        return;
      }

      if (message.type === 'detection') {
        setNotice(null);
        if (!message.detection) {
          latest.current = null;
          setTracking((current) => (current.kind === 'ignored' ? current : { kind: 'idle' }));
          return;
        }
        if (await isHostIgnored(message.detection.host)) return;
        await identify(message.detection);
        return;
      }

      if (message.type === 'progress-reached') {
        // Fin de chapitre : on n'écrit que si l'œuvre est identifiée, sinon l'utilisateur confirme d'abord.
        if (!getBrowserSettings().autoProgress) {
          return setNotice({ tone: 'info', text: `Fin de ${unitOf(message.detection)} atteinte : touche « Marquer comme lu »` });
        }
        const resolution = await resolve(message.detection).catch(() => null);
        if (resolution?.match) await push(message.detection, resolution.match);
        else setNotice({ tone: 'info', text: 'Fin de chapitre atteinte : choisis l’œuvre pour l’ajouter à ta liste' });
      }
    },
    [identify, push, send],
  );

  const markRead = useCallback(() => {
    if (tracking.kind === 'matched') void push(tracking.detection, tracking.match);
  }, [push, tracking]);

  const choose = useCallback(
    async (candidate: ICandidate) => {
      if (tracking.kind !== 'confirm') return;
      let match: IMatch;
      try {
        match = await confirm(tracking.detection, candidate);
      } catch (err) {
        return fail(err);
      }
      void rememberSite(tracking.detection);
      setTracking({
        kind: 'matched',
        detection: tracking.detection,
        match,
        progress: await progressOf(tracking.detection, match),
      });
    },
    [progressOf, rememberSite, tracking],
  );

  /** « Ce n'est pas la bonne œuvre » : oublie l'association et repropose les candidats. */
  const change = useCallback(() => {
    if (tracking.kind === 'matched') void forget(tracking.detection).then(() => identify(tracking.detection));
  }, [identify, tracking]);

  /** Œuvre et numéro choisis à la main (recherche), quand la détection a échoué ou se trompe. */
  const markManually = useCallback(
    async (candidate: ICandidate, kind: 'anime' | 'manga', number: number) => {
      const base: PageDetection = latest.current ?? {
        kind,
        title: '',
        url: '',
        host,
        source: 'generic',
      };
      const detection: PageDetection = {
        ...base,
        kind,
        title: base.title || candidate.title,
        chapter: kind === 'manga' ? number : undefined,
        episode: kind === 'anime' ? number : undefined,
      };
      const match = await confirm(detection, candidate);
      await push(detection, match);
    },
    [host, push],
  );

  const ignoreHost = useCallback(async () => {
    await setHostIgnored(host, true);
    setTracking({ kind: 'ignored' });
    setNotice(null);
  }, [host]);

  const unignoreHost = useCallback(async () => {
    await setHostIgnored(host, false);
    setTracking({ kind: 'idle' });
    send({ type: 'set-pattern', pattern });
  }, [host, pattern, send]);

  const applyPattern = useCallback(
    async (next: LearnedPattern) => {
      await savePattern(next);
      setPattern(next);
      send({ type: 'set-pattern', pattern: next });
    },
    [send],
  );

  /** Œuvre absente d'Actunime : ajout rapide à ma liste, puis suivi normal. L'équipe relie l'œuvre ensuite. */
  const quickAdd = useCallback(
    async (input: { title: string; format: string; aliases: string[] }) => {
      if (tracking.kind !== 'confirm') return;
      const { detection } = tracking;
      try {
        const match = await quickAddWork(detection, input);
        void rememberSite(detection);
        setTracking({ kind: 'matched', detection, match, progress: await progressOf(detection, match) });
        setNotice({ tone: 'success', text: `« ${input.title} » ajoutée à ta liste, en attente de référencement` });
      } catch (err) {
        fail(err);
      }
    },
    [fail, progressOf, rememberSite, tracking],
  );

  /** « Le titre est faux » : l'utilisateur choisit parmi les titres que la page propose ; le site retient cette source. */
  const pickTitle = useCallback(
    async (strategy: StrategyId) => {
      const detection = latest.current;
      if (!detection) return;
      await applyPattern(patternFor(detection, strategy));
    },
    [applyPattern],
  );

  const resetPattern = useCallback(async () => {
    await removePattern(host);
    setPattern(null);
    send({ type: 'set-pattern', pattern: null });
  }, [host, send]);

  return {
    tracking,
    notice,
    pattern,
    host,
    inferredKind,
    send,
    onMessage,
    markRead,
    choose,
    change,
    markManually,
    ignoreHost,
    unignoreHost,
    applyPattern,
    pickTitle,
    quickAdd,
    resetPattern,
  };
}
