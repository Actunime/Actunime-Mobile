import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LearnedPattern } from './core/types';
import type { InPageCommand, InPageMessage } from './messages';

const PAGE_URL = 'https://manhwa.example/manga/solo-leveling/chapitre-45/';

function loadPage(html: string, url = PAGE_URL) {
  window.history.replaceState({}, '', url);
  document.documentElement.innerHTML = html;
}

const FAKE_PAGE = `
  <head><title>Solo Leveling - Chapitre 45 - ManhwaSite</title>
  <meta property="og:type" content="article"><meta property="og:title" content="Solo Leveling - Chapitre 45"></head>
  <body><h1 class="series">Solo Leveling</h1><span class="chap">Chap. 45 / 200</span><p id="other">Texte</p></body>`;

let messages: InPageMessage[];

const send = (command: InPageCommand) => (window as any).__actunime.handle(JSON.stringify(command));

const pattern = (overrides: Partial<LearnedPattern>): LearnedPattern => ({
  host: 'manhwa.example',
  kind: 'manga',
  strategy: 'manual',
  createdAt: '2026-10-18T00:00:00.000Z',
  updatedAt: '2026-10-18T00:00:00.000Z',
  ...overrides,
});

async function install() {
  vi.resetModules();
  delete (window as any).__actunime;
  messages = [];
  (window as any).ReactNativeWebView = { postMessage: (raw: string) => messages.push(JSON.parse(raw)) };
  await import('./entry');
}

describe('script injecté', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    loadPage(FAKE_PAGE);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("annonce la page et n'évalue rien avant d'avoir reçu le pattern du site", async () => {
    await install();
    vi.advanceTimersByTime(2000);

    expect(messages).toEqual([{ type: 'ready', host: 'manhwa.example', inferredKind: 'manga' }]);
  });

  it('détecte le chapitre avec les heuristiques génériques', async () => {
    await install();
    send({ type: 'set-pattern', pattern: null });
    vi.advanceTimersByTime(10);

    const detection = messages.find((m) => m.type === 'detection');
    expect(detection).toMatchObject({
      detection: { kind: 'manga', title: 'Solo Leveling', chapter: 45, source: 'generic', host: 'manhwa.example' },
    });
  });

  it('retombe sur la détection générique si l’app ne répond pas au bout de 3 s', async () => {
    await install();
    vi.advanceTimersByTime(3100);

    expect(messages.some((m) => m.type === 'detection')).toBe(true);
  });

  it('lit le titre et le chapitre indiqués par un pattern manuel', async () => {
    await install();
    send({
      type: 'set-pattern',
      pattern: pattern({ manualSelectors: { title: '.series', episode: { selector: '.chap', tokenIndex: 0 } } }),
    });
    vi.advanceTimersByTime(10);

    expect(messages.find((m) => m.type === 'detection')).toMatchObject({
      detection: { title: 'Solo Leveling', chapter: 45, source: 'learned' },
    });
  });

  it('prend le bon nombre quand l’élément en contient plusieurs', async () => {
    await install();
    send({
      type: 'set-pattern',
      pattern: pattern({ manualSelectors: { title: '.series', episode: { selector: '.chap', tokenIndex: 1 } } }),
    });
    vi.advanceTimersByTime(10);

    expect(messages.find((m) => m.type === 'detection')).toMatchObject({ detection: { chapter: 200 } });
  });

  it('ne signale rien sur une page où le pattern ne trouve pas le titre (la barre reste « aucune œuvre détectée »)', async () => {
    await install();
    send({ type: 'set-pattern', pattern: pattern({ manualSelectors: { title: '.absent' } }) });
    vi.advanceTimersByTime(10);

    expect(messages.some((m) => m.type === 'detection')).toBe(false);
  });

  it('signale la perte de détection quand la page d’un lecteur SPA change', async () => {
    await install();
    send({ type: 'set-pattern', pattern: null });
    vi.advanceTimersByTime(10);
    loadPage('<head><title>Accueil</title></head><body><p>Liste des séries</p></body>', 'https://manhwa.example/');
    document.body.appendChild(document.createElement('div')); // déclenche l'observateur de mutations
    await vi.advanceTimersByTimeAsync(1000);

    const detections = messages.filter((m) => m.type === 'detection');
    expect(detections.at(-1)).toMatchObject({ detection: null });
  });

  it('exécute les stratégies de l’assistant', async () => {
    await install();
    send({ type: 'run-strategies' });

    const result = messages.find((m) => m.type === 'strategies');
    expect(result && 'results' in result && result.results.length).toBeGreaterThan(0);
  });

  it('renvoie le sélecteur et les nombres de l’élément pointé', async () => {
    await install();
    send({ type: 'start-pick' });
    document.querySelector<HTMLElement>('.chap')!.click();

    expect(messages.find((m) => m.type === 'picked')).toMatchObject({
      element: { selector: 'span.chap', text: 'Chap. 45 / 200', tokens: [45, 200] },
    });
  });

  it('ne pointe plus rien après une annulation', async () => {
    await install();
    send({ type: 'start-pick' });
    send({ type: 'stop-pick' });
    document.querySelector<HTMLElement>('.chap')!.click();

    expect(messages.some((m) => m.type === 'picked')).toBe(false);
    expect(messages.some((m) => m.type === 'pick-cancelled')).toBe(true);
  });
});
