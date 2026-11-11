import { useCallback, useRef, useState, type RefObject } from 'react';
import type { WebView } from 'react-native-webview';

import { deriveEpisodeUrlRegex } from '@/detection/core/strategies';
import { commandScript, type InPageMessage, type PageDetection } from '@/detection/messages';
import type { LearnedPattern, StrategyId } from '@/detection/core/types';

import { getBrowserSettings } from './browser-settings';
import { logEvent } from './diagnostic-log';
import { progressNotice } from './notices';
import { getPattern, isHostIgnored, removePattern, savePattern, setHostIgnored } from './patterns';
import type { IMatch } from './storage';
import { skipModeOf, skipWork, resumeWork, firstSight, type SkipMode } from './skipped-works';
import { progressAllowed } from './tracking-guards';
import { confirm, currentProgress, forget, markPreviousSeen, matchKey, pushProgress, quickAddWork, resolve, StaleMatchError, type ICandidate } from './sync';

export type TrackingState =
  | { kind: 'idle' }
  | { kind: 'resolving'; detection: PageDetection }
  /** `announce` : première fois qu'on voit cette œuvre pendant la session (le panneau s'ouvre ; ensuite, une simple pastille). */
  | { kind: 'confirm'; detection: PageDetection; candidates: ICandidate[]; announce: boolean }
  | { kind: 'matched'; detection: PageDetection; match: IMatch; progress?: number }
  /** Œuvre que le lecteur ne suit pas (pour le moment, ou jusqu'à nouvel ordre) : rien n'est demandé ni écrit. */
  | { kind: 'skipped'; detection: PageDetection; mode: SkipMode }
  | { kind: 'ignored' };

export interface INotice {
  tone: 'success' | 'error' | 'info';
  text: string;
}

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

const briefOf = (d: PageDetection) => ({ src: d.source, kind: d.kind, title: d.title, ch: d.chapter, ep: d.episode, url: d.url });

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
  // « Génération » de la page : chaque nouvelle page ou détection l'incrémente. Un résultat asynchrone (recherche de l'œuvre,
  // écriture de la progression) qui revient après un changement de page est périmé : il ne doit rien écraser.
  const generation = useRef(0);

  const send = useCallback(
    (command: Parameters<typeof commandScript>[0]) => webview.current?.injectJavaScript(commandScript(command)),
    [webview],
  );

  const fail = useCallback((err: unknown) => {
    logEvent('app', 'erreur', { message: err instanceof Error ? err.message : String(err) });
    setNotice({ tone: 'error', text: err instanceof Error ? err.message : 'Erreur inattendue' });
  }, []);

  const progressOf = useCallback((detection: PageDetection, match: IMatch) => currentProgress(detection, match), []);

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
      setNotice({ tone: 'info', text: 'Site reconnu automatiquement' });
    },
    [send],
  );

  /** Commencer la suite (vidéo lancée, chapitre entamé) compte les précédents comme vus : la liste suit, et on le dit. */
  const inferPrevious = useCallback(async (detection: PageDetection, match: IMatch, progress: number | undefined) => {
    if (!getBrowserSettings().markPrevious) return;
    const done = await markPreviousSeen(detection, match, progress).catch(() => null);
    if (!done) return;
    const unit = unitOf(detection);
    const label = done.from === done.to ? `${unit} ${done.to} compté comme vu` : `${unit}s ${done.from} à ${done.to} comptés comme vus`;
    setNotice({ tone: 'success', text: label.charAt(0).toUpperCase() + label.slice(1) });
    setTracking((current) =>
      current.kind === 'matched' && current.match.id === match.id ? { ...current, progress: done.to } : current,
    );
  }, []);

  const identify = useCallback(
    async (detection: PageDetection) => {
      latest.current = detection;
      const mine = generation.current;
      const current = () => mine === generation.current;
      setTracking({ kind: 'resolving', detection });
      try {
        const resolution = await resolve(detection);
        if (!current()) return logEvent('app', 'identification-périmée', { title: detection.title });
        logEvent('app', 'identification', {
          title: detection.title,
          match: resolution.match ? { id: resolution.match.id, title: resolution.match.title } : null,
          candidats: resolution.candidates.slice(0, 5).map((c) => c.title),
        });
        if (resolution.match) {
          const progress = await progressOf(detection, resolution.match);
          if (!current()) return;
          void rememberSite(detection);
          setTracking({ kind: 'matched', detection, match: resolution.match, progress });
        } else {
          setTracking({ kind: 'confirm', detection, candidates: resolution.candidates, announce: firstSight(matchKey(detection)) });
        }
      } catch (err) {
        if (!current()) return;
        fail(err);
        setTracking({ kind: 'confirm', detection, candidates: [], announce: firstSight(matchKey(detection)) });
      }
    },
    [fail, progressOf, rememberSite],
  );

  const push = useCallback(
    async (detection: PageDetection, match: IMatch) => {
      const number = numberOf(detection);
      if (number === undefined) return setNotice({ tone: 'error', text: `Numéro de ${unitOf(detection)} non détecté` });
      const mine = generation.current;
      try {
        logEvent('app', 'écriture-progression', { title: detection.title, number, match: match.id });
        const result = await pushProgress(detection, match);
        setNotice({ tone: 'success', text: progressNotice(detection.kind, number, result) });
        const progress = await progressOf(detection, match);
        // La progression est écrite quoi qu'il arrive ; l'affichage ne change que si on est toujours sur cette page.
        if (mine === generation.current) setTracking({ kind: 'matched', detection, match, progress });
      } catch (err) {
        if (err instanceof StaleMatchError) {
          // association périmée : on l'oublie et on retrouve l'œuvre (liste, catalogue, ou choix de l'utilisateur)
          await forget(detection);
          if (mine !== generation.current) return;
          setNotice({ tone: 'info', text: err.message });
          return identify(detection);
        }
        fail(err);
      }
    },
    [fail, progressOf, identify],
  );

  const onMessage = useCallback(
    async (message: InPageMessage) => {
      if (message.type === 'debug') return logEvent('page', message.event, message.data);
      if (message.type === 'ready') logEvent('app', 'ready', { host: message.host, kind: message.inferredKind });
      else if (message.type === 'detection') logEvent('app', 'détection-reçue', message.detection ? briefOf(message.detection) : { detection: null });
      else if (message.type === 'progress-started' || message.type === 'progress-reached') {
        logEvent('app', message.type, { ...briefOf(message.detection), affichée: latest.current ? briefOf(latest.current).title : null });
      }
      if (message.type === 'ready') {
        // Nouvelle page : plus rien de ce qui se calculait pour la précédente ne doit s'afficher.
        const mine = ++generation.current;
        latest.current = null;
        setHost(message.host);
        setInferredKind(message.inferredKind);
        setNotice(null);
        const [stored, ignored] = await Promise.all([getPattern(message.host), isHostIgnored(message.host)]);
        if (mine !== generation.current) return;
        setPattern(stored);
        logEvent('app', 'réglage-site', { host: message.host, pattern: stored?.strategy ?? null, ignoré: ignored });
        if (ignored) return setTracking({ kind: 'ignored' });
        setTracking({ kind: 'idle' });
        send({ type: 'set-pattern', pattern: stored });
        send({ type: 'set-options', episodeThreshold: getBrowserSettings().episodeThreshold / 100 });
        return;
      }

      if (message.type === 'detection') {
        const mine = ++generation.current;
        setNotice(null);
        if (!message.detection) {
          latest.current = null;
          setTracking((current) => (current.kind === 'ignored' ? current : { kind: 'idle' }));
          return;
        }
        const detection = message.detection;
        latest.current = detection;
        if (await isHostIgnored(detection.host)) return logEvent('app', 'site-ignoré', { host: detection.host });
        // Œuvre mise de côté : ni question, ni écriture dans la liste ; juste de quoi la reprendre.
        const skipped = await skipModeOf(matchKey(detection));
        if (mine !== generation.current) return;
        if (skipped) {
          logEvent('app', 'œuvre-mise-de-côté', { title: detection.title, mode: skipped });
          return setTracking({ kind: 'skipped', detection, mode: skipped });
        }
        await identify(detection);
        return;
      }

      // Les messages de progression ne valent que pour la page affichée : une œuvre mise de côté, ou une page déjà
      // quittée, n'écrit rien dans la liste.
      if ((message.type === 'progress-started' || message.type === 'progress-reached') && !(await progressAllowed(message.detection, latest.current))) {
        return logEvent('app', 'progression-refusée', { title: message.detection.title, type: message.type });
      }

      if (message.type === 'progress-started') {
        // Lecture réellement entamée : seulement pour une œuvre déjà identifiée, sans rien demander à l'utilisateur.
        if (!getBrowserSettings().markPrevious) return;
        const resolution = await resolve(message.detection).catch(() => null);
        if (!resolution?.match) return;
        await inferPrevious(message.detection, resolution.match, await progressOf(message.detection, resolution.match));
        return;
      }

      if (message.type === 'progress-reached') {
        // Fin de chapitre : on n'écrit que si l'œuvre est identifiée, sinon l'utilisateur confirme d'abord.
        const settings = getBrowserSettings();
        // Un épisode suit son propre réglage (fin d'épisode) ; un chapitre, « mise à jour à la fin ».
        if (message.detection.kind === 'anime' && settings.episodeEnd === 'off') return;
        if (message.detection.kind === 'anime' ? settings.episodeEnd === 'ask' : !settings.autoProgress) {
          return setNotice({ tone: 'info', text: `Fin de ${unitOf(message.detection)} atteinte : touche « Marquer comme lu »` });
        }
        const resolution = await resolve(message.detection).catch(() => null);
        if (resolution?.match) await push(message.detection, resolution.match);
        else setNotice({ tone: 'info', text: 'Fin de chapitre atteinte : choisis l’œuvre pour l’ajouter à ta liste' });
      }
    },
    [identify, push, send, inferPrevious, progressOf],
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

  /** « Pas pour le moment » (la session) ou « Ne plus suivre cette œuvre » (mémorisé) : l'œuvre n'est plus ni demandée ni suivie. */
  const skip = useCallback(
    async (mode: SkipMode) => {
      const detection = 'detection' in tracking ? tracking.detection : latest.current;
      if (!detection) return;
      generation.current += 1;
      await skipWork(matchKey(detection), mode);
      setNotice(null);
      setTracking({ kind: 'skipped', detection, mode });
    },
    [tracking],
  );

  /** Reprendre le suivi d'une œuvre mise de côté : elle est de nouveau identifiée comme une page ordinaire. */
  const resume = useCallback(async () => {
    if (tracking.kind !== 'skipped') return;
    await resumeWork(matchKey(tracking.detection));
    generation.current += 1;
    await identify(tracking.detection);
  }, [identify, tracking]);

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

  /** Œuvre absente d'Actunime : ajout rapide à ma liste, puis suivi normal. L'œuvre est reliée à une fiche plus tard. */
  const quickAdd = useCallback(
    async (input: { title: string; format: string; aliases: string[] }) => {
      if (tracking.kind !== 'confirm') return;
      const { detection } = tracking;
      try {
        const match = await quickAddWork(detection, input);
        void rememberSite(detection);
        setTracking({ kind: 'matched', detection, match, progress: await progressOf(detection, match) });
        setNotice({ tone: 'success', text: 'Ajoutée à ta liste' });
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
    skip,
    resume,
    ignoreHost,
    unignoreHost,
    applyPattern,
    pickTitle,
    quickAdd,
    resetPattern,
  };
}
