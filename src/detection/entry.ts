/**
 * Point d'entrée du script injecté dans la WebView (bundlé en IIFE par `scripts/build-injected.mjs`).
 * Réutilise le cœur d'extraction de Actunime-Sync (`core/`, copie locale — cf. E56 phase 0) et remplace
 * `chrome.runtime.sendMessage` par `window.ReactNativeWebView.postMessage`.
 *
 * L'app pilote le script par commandes (`window.__actunime.handle`) : pattern appris du site, lancement des
 * stratégies de l'assistant, mode « pointer un élément ».
 */
import { applyLearnedPattern } from './core/learned-engine';
import { detectGenericFromDom, inferKind } from './core/heuristics';
import { createNextButtonObserver } from './core/next-button';
import { createPageCounterObserver } from './core/page-counter';
import { createScrollObserver } from './core/scroll';
import { generateSelector } from './core/selector';
import { runAllStrategies } from './core/strategies';
import type { LearnedPattern } from './core/types';
import type { InPageCommand, InPageMessage, PageDetection } from './messages';

interface IObserver {
  cleanup: () => void;
}

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (message: string) => void };
    __actunime?: { handle: (raw: string) => void };
  }
}

const EVALUATE_DEBOUNCE_MS = 800;
const HIGHLIGHT_COLOR = '#0099ff';

function post(message: InPageMessage) {
  window.ReactNativeWebView?.postMessage(JSON.stringify(message));
}

/** Numéro de chapitre/épisode lu dans l'URL puis dans le titre, quand le JSON-LD n'en donne pas. */
function extractNumber(kind: 'anime' | 'manga'): number | undefined {
  const words = kind === 'manga' ? 'chapter|chapitre|chap|ch|scan' : 'episode|épisode|ep|e';
  const fromUrl = new RegExp(`(?:^|[/_-])(?:${words})[-_/ ]?(\\d+)(?:[-_.](\\d+))?(?:[/_?#.-]|$)`, 'i').exec(
    location.pathname,
  );
  if (fromUrl) return Number(fromUrl[1]);
  const fromTitle = new RegExp(`(?:${words})\\.?\\s*(\\d+)`, 'i').exec(document.title);
  return fromTitle ? Number(fromTitle[1]) : undefined;
}

function detectGeneric(): PageDetection | null {
  const generic = detectGenericFromDom();
  if (!generic?.title) return null;
  const number =
    generic.kind === 'manga'
      ? (generic.chapter ?? extractNumber('manga'))
      : (generic.episode ?? extractNumber('anime'));
  return {
    kind: generic.kind,
    title: generic.seriesTitle ?? generic.title,
    chapter: generic.kind === 'manga' ? number : undefined,
    episode: generic.kind === 'anime' ? number : undefined,
    season: generic.season,
    imageUrl: generic.imageUrl,
    url: location.href,
    host: location.hostname,
    source: 'generic',
  };
}

function detectLearned(pattern: LearnedPattern): PageDetection | null {
  const learned = applyLearnedPattern(pattern);
  if (!learned) return null;
  return {
    kind: learned.kind,
    title: learned.title,
    chapter: learned.chapter,
    episode: learned.episode,
    season: learned.season,
    url: location.href,
    host: location.hostname,
    source: 'learned',
  };
}

/** Clé d'une détection ; `NONE` = rien détecté, état de départ connu de l'app (barre « aucune œuvre détectée »). */
const NONE = 'none';
const UNKNOWN = 'unknown';

function keyOf(d: PageDetection | null): string {
  return d ? `${d.source}|${d.kind}|${d.title}|${d.chapter ?? ''}|${d.episode ?? ''}` : NONE;
}

if (!window.__actunime) {
  let pattern: LearnedPattern | null = null;
  let lastKey = NONE;
  let lastUrl = location.href;
  let observer: IObserver | null = null;
  // Pas de détection avant d'avoir reçu le pattern du site : sinon une détection générique erronée précède la bonne.
  let configured = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  /** Observateur de fin de chapitre selon la configuration du site (défilement par défaut). */
  const attachProgressObserver = (detection: PageDetection) => {
    observer?.cleanup();
    observer = null;
    if (detection.kind !== 'manga') return;
    const config = pattern?.mangaTracking ?? { mode: 'scroll' as const };
    const reached = () => post({ type: 'progress-reached', detection });
    if (config.mode === 'scroll') {
      observer = createScrollObserver({
        threshold: config.threshold ?? 0.9,
        containerSelector: config.selector,
        onReached: reached,
      });
    } else if (config.mode === 'page-counter' && config.selector) {
      observer = createPageCounterObserver({ selector: config.selector, onReached: reached });
    } else if (config.mode === 'next-button' && config.selector) {
      observer = createNextButtonObserver({ selector: config.selector, onClicked: reached });
    }
  };

  const evaluate = () => {
    timer = null;
    const detection = pattern ? detectLearned(pattern) : detectGeneric();
    const key = keyOf(detection);
    if (key === lastKey) return;
    lastKey = key;
    post({ type: 'detection', detection });
    if (detection) attachProgressObserver(detection);
    else {
      observer?.cleanup();
      observer = null;
    }
  };

  const schedule = (delay = EVALUATE_DEBOUNCE_MS) => {
    if (!configured) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(evaluate, delay);
  };

  // ── Mode « pointer un élément » (assistant de configuration) ──────────────
  let picking: { cleanup: () => void } | null = null;

  const stopPick = () => {
    picking?.cleanup();
    picking = null;
  };

  const startPick = () => {
    stopPick();
    const box = document.createElement('div');
    box.style.cssText = `position:fixed;z-index:2147483647;pointer-events:none;border:3px solid ${HIGHLIGHT_COLOR};background:rgba(0,153,255,.18);border-radius:4px;display:none`;
    document.documentElement.appendChild(box);

    const targetAt = (x: number, y: number): HTMLElement | null => {
      const el = document.elementFromPoint(x, y);
      return el instanceof HTMLElement ? el : null;
    };
    const highlight = (el: HTMLElement | null) => {
      if (!el) {
        box.style.display = 'none';
        return;
      }
      const rect = el.getBoundingClientRect();
      box.style.cssText += `;display:block;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px`;
    };
    const onTouch = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      event.preventDefault();
      highlight(targetAt(touch.clientX, touch.clientY));
    };
    const capture = (el: HTMLElement) => {
      const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 200);
      const tokens = (text.match(/\d{1,4}/g) ?? []).map(Number);
      stopPick();
      post({ type: 'picked', element: { selector: generateSelector(el), text, tokens } });
    };
    const onTouchEnd = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      if (!touch) return;
      event.preventDefault();
      event.stopPropagation();
      const el = targetAt(touch.clientX, touch.clientY);
      if (el) capture(el);
    };
    // Souris / stylet : un clic suffit. On bloque l'action de la page pendant le choix.
    const onClick = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.target instanceof HTMLElement) capture(event.target);
    };

    const options = { capture: true, passive: false } as const;
    document.addEventListener('touchstart', onTouch, options);
    document.addEventListener('touchmove', onTouch, options);
    document.addEventListener('touchend', onTouchEnd, options);
    document.addEventListener('click', onClick, true);
    picking = {
      cleanup: () => {
        document.removeEventListener('touchstart', onTouch, options);
        document.removeEventListener('touchmove', onTouch, options);
        document.removeEventListener('touchend', onTouchEnd, options);
        document.removeEventListener('click', onClick, true);
        box.remove();
      },
    };
  };

  window.__actunime = {
    handle(raw: string) {
      let command: InPageCommand;
      try {
        command = JSON.parse(raw) as InPageCommand;
      } catch {
        return;
      }
      switch (command.type) {
        case 'set-pattern':
          configured = true;
          pattern = command.pattern;
          schedule(0);
          break;
        case 'run-strategies':
          post({ type: 'strategies', results: runAllStrategies() });
          break;
        case 'start-pick':
          startPick();
          break;
        case 'stop-pick':
          stopPick();
          post({ type: 'pick-cancelled' });
          break;
      }
    },
  };

  new MutationObserver(() => {
    // Les lecteurs SPA changent d'URL sans recharger la page : on repart d'un état propre.
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      lastKey = UNKNOWN; // force à renvoyer l'état de la nouvelle page, y compris « rien détecté »
    }
    schedule();
  }).observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener('load', () => schedule());
  // L'app répond à `ready` par le pattern du site (ou `null`) : c'est lui qui déclenche la première détection.
  post({ type: 'ready', host: location.hostname, inferredKind: inferKind() });
  // Filet : si l'app ne répond pas (WebView rechargée à froid), on détecte quand même au bout de 3 s.
  setTimeout(() => {
    if (configured) return;
    configured = true;
    schedule(0);
  }, 3000);
}
