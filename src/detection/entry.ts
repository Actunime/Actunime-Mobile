/**
 * Point d'entrée du script injecté dans la WebView (bundlé en IIFE par `scripts/build-injected.mjs`).
 * Réutilise le cœur d'extraction de Actunime-Sync (`core/`, copie locale — cf. E56 phase 0) et remplace
 * `chrome.runtime.sendMessage` par `window.ReactNativeWebView.postMessage`.
 */
import { detectGenericFromDom } from './core/heuristics';
import { createScrollObserver, type ScrollObserver } from './core/scroll';
import type { InPageMessage, PageDetection } from './messages';

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (message: string) => void };
    __actunimeDetectionInstalled?: boolean;
  }
}

const EVALUATE_DEBOUNCE_MS = 800;

function post(message: InPageMessage) {
  window.ReactNativeWebView?.postMessage(JSON.stringify(message));
}

/** Numéro de chapitre/épisode lu dans l'URL puis dans le titre, quand le JSON-LD n'en donne pas. */
function extractNumber(kind: 'anime' | 'manga', title: string | undefined): number | undefined {
  const words = kind === 'manga' ? 'chapter|chapitre|chap|ch|scan' : 'episode|épisode|ep|e';
  const fromUrl = new RegExp(`(?:^|[/_-])(?:${words})[-_/ ]?(\\d+)(?:[-_.](\\d+))?(?:[/_?#.-]|$)`, 'i').exec(
    location.pathname,
  );
  if (fromUrl) return Number(fromUrl[1]);
  const fromTitle = new RegExp(`(?:${words})\\.?\\s*(\\d+)`, 'i').exec(document.title);
  if (fromTitle) return Number(fromTitle[1]);
  void title;
  return undefined;
}

function detect(): PageDetection | null {
  const generic = detectGenericFromDom();
  if (!generic?.title) return null;
  const number =
    generic.kind === 'manga'
      ? (generic.chapter ?? extractNumber('manga', generic.title))
      : (generic.episode ?? extractNumber('anime', generic.title));
  return {
    kind: generic.kind,
    title: generic.seriesTitle ?? generic.title,
    chapter: generic.kind === 'manga' ? number : undefined,
    episode: generic.kind === 'anime' ? number : undefined,
    season: generic.season,
    imageUrl: generic.imageUrl,
    url: location.href,
    host: location.hostname,
  };
}

function keyOf(d: PageDetection | null): string {
  return d ? `${d.kind}|${d.title}|${d.chapter ?? ''}|${d.episode ?? ''}` : '';
}

if (!window.__actunimeDetectionInstalled) {
  window.__actunimeDetectionInstalled = true;

  let lastKey = '';
  let lastUrl = location.href;
  let scrollObserver: ScrollObserver | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const evaluate = () => {
    timer = null;
    const detection = detect();
    const key = keyOf(detection);
    if (key === lastKey) return;
    lastKey = key;

    scrollObserver?.cleanup();
    scrollObserver = null;

    post({ type: 'detection', detection });
    if (detection?.kind === 'manga') {
      scrollObserver = createScrollObserver({
        threshold: 0.9,
        onReached: () => post({ type: 'progress-reached', detection }),
      });
    }
  };

  const schedule = () => {
    if (timer) return;
    timer = setTimeout(evaluate, EVALUATE_DEBOUNCE_MS);
  };

  new MutationObserver(() => {
    // Les lecteurs SPA changent d'URL sans recharger la page : on repart d'un état propre.
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      lastKey = '';
    }
    schedule();
  }).observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener('load', schedule);
  schedule();
}
