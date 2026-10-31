import { describe, expect, it } from 'vitest';

import { isViewerUrl, numberFromSelectorText, readTitleHint } from './title-hint';

const page = (html: string) => {
  const doc = document.implementation.createHTMLDocument('x');
  doc.body.innerHTML = html;
  return doc;
};

describe('isViewerUrl', () => {
  it('reconnaît les pages de lecture', () => {
    expect(isViewerUrl('https://mangaplus.shueisha.co.jp/viewer/7000358')).toBe(true);
    expect(isViewerUrl('https://site.example/fr/read/solo-12')).toBe(true);
    expect(isViewerUrl('https://mangaplus.shueisha.co.jp/titles/100037')).toBe(false);
    expect(isViewerUrl('pas une adresse')).toBe(false);
  });
});

describe('readTitleHint', () => {
  it('prend le premier titre de page qui ressemble à une œuvre', () => {
    expect(readTitleHint(page('<h1>  Chainsaw   Man </h1>'))).toBe('Chainsaw Man');
    expect(readTitleHint(page('<h1>MANGA Plus</h1><h2>Jujutsu Kaisen</h2>'))).toBe('Jujutsu Kaisen');
  });

  it('écarte la navigation, le nom du site et les titres trop longs', () => {
    expect(readTitleHint(page('<h1>Accueil</h1>'))).toBeNull();
    expect(readTitleHint(page(`<h1>${'x'.repeat(120)}</h1>`))).toBeNull();
    expect(readTitleHint(page('<p>rien</p>'))).toBeNull();
  });
});

describe('numberFromSelectorText', () => {
  it('lit « #001 » dans le haut de la page', () => {
    expect(numberFromSelectorText('MANGA Plus #001 FR')).toBe(1);
    expect(numberFromSelectorText('#232 Chapitre')).toBe(232);
    expect(numberFromSelectorText('aucun numéro ici')).toBeUndefined();
  });
});
