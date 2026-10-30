import { afterEach, describe, expect, it } from 'vitest';

import { pickAutoStrategy, titleAlternatives } from './auto-strategy';
import { runAllStrategies } from './strategies';

/** Page de chapitre telle que comix.to la sert (relevé du 2026-10-30 : adresse, `<title>` et `og:title`). */
function openPage(path: string, title: string, ogTitle?: string) {
  window.history.replaceState({}, '', path);
  document.title = title;
  document.head.innerHTML = ogTitle ? `<meta property="og:title" content="${ogTitle}"><meta property="og:type" content="website">` : '';
}

afterEach(() => {
  window.history.replaceState({}, '', '/');
  document.title = '';
  document.head.innerHTML = '';
});

describe('reconnaissance automatique d’une vraie page', () => {
  it('comix.to : le titre de l’œuvre, pas l’identifiant du chapitre', () => {
    const title = "God-level Assassin, I'm the Shadow · Ch.1";
    openPage('/title/z0l20-god-level-assassin-im-the-shadow/6225159-chapter-1', title, title);
    const results = runAllStrategies();
    const best = pickAutoStrategy(results);
    expect(best?.title).toBe("God-level Assassin, I'm the Shadow");
    expect(best?.episode).toBe(1);
    // et le titre de l'adresse reste proposé comme autre version
    expect(titleAlternatives(results, best?.title).map((alternative) => alternative.title)).toContain('God Level Assassin Im The Shadow');
  });

  it('un site sans titre exploitable dans la page : le titre vient de l’adresse', () => {
    openPage('/manga/one-piece/chapter-1100', 'Lecture');
    expect(pickAutoStrategy(runAllStrategies())).toMatchObject({ id: 'url-tokens', title: 'One Piece', episode: 1100 });
  });

  it('une page d’accueil n’est pas prise pour un chapitre', () => {
    openPage('/', 'Mon site de lecture', 'Mon site de lecture');
    expect(pickAutoStrategy(runAllStrategies())).toBeNull();
  });
});
