import { beforeEach, describe, expect, it } from 'vitest';

import { findNextLink } from './next-link';

const URL_NOW = 'https://manhwa.example/manga/solo/chapitre-45/';
const page = (body: string) => {
  document.body.innerHTML = body;
};

describe('findNextLink', () => {
  beforeEach(() => page(''));

  it('préfère rel="next"', () => {
    page('<a href="/autre">Suivant</a><a rel="next" href="/manga/solo/chapitre-46/">→</a>');
    expect(findNextLink(document, URL_NOW)).toBe('https://manhwa.example/manga/solo/chapitre-46/');
  });

  it('lit le texte « Chapitre suivant » ou « Next »', () => {
    page('<a href="/c-46">Chapitre suivant</a>');
    expect(findNextLink(document, URL_NOW)).toBe('https://manhwa.example/c-46');
    page('<a href="/c-47">Next</a>');
    expect(findNextLink(document, URL_NOW)).toBe('https://manhwa.example/c-47');
  });

  it('lit l’étiquette d’un bouton à icône', () => {
    page('<a href="/c-46" aria-label="Next chapter"><svg></svg></a>');
    expect(findNextLink(document, URL_NOW)).toBe('https://manhwa.example/c-46');
  });

  it('écarte la pagination d’une liste, les ancres et les liens vers la page courante', () => {
    page('<a href="/liste?p=2">Page suivante</a><a href="#top">Suivant</a><a href="/manga/solo/chapitre-45/">Suivant</a>');
    expect(findNextLink(document, URL_NOW)).toBeNull();
  });

  it('renvoie null sans lien', () => {
    page('<p>Rien ici</p>');
    expect(findNextLink(document, URL_NOW)).toBeNull();
  });
});
