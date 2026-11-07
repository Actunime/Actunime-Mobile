import { describe, expect, it } from 'vitest';

import { allowNavigation, isSameSite, matchesClick, siteOf } from './navigation-guard';

describe('siteOf', () => {
  it('réduit au domaine enregistrable', () => {
    expect(siteOf('https://www.a.example.com/x')).toBe('example.com');
    expect(siteOf('https://cdn.example.co.uk/')).toBe('example.co.uk');
    expect(siteOf('intent://foo')).toBeNull();
  });
  it('compare les sites', () => {
    expect(isSameSite('https://a.site.fr/1', 'https://b.site.fr/2')).toBe(true);
    expect(isSameSite('https://site.fr', 'https://pub.com')).toBe(false);
  });
});

describe('allowNavigation', () => {
  const base = { current: 'https://lecteur.fr/ch1', isTopFrame: true, click: null, now: 10_000, chainOpen: false };
  it('autorise le même site', () => {
    expect(allowNavigation({ ...base, target: 'https://www.lecteur.fr/ch2' })).toBe(true);
  });
  it('refuse un autre site sans clic', () => {
    expect(allowNavigation({ ...base, target: 'https://pub.example/' })).toBe(false);
  });
  it('autorise un clic sur un lien visible vers cette adresse', () => {
    const click = { href: 'https://autre.fr/page#x', at: 9_500 };
    expect(allowNavigation({ ...base, target: 'https://autre.fr/page', click })).toBe(true);
  });
  it("refuse un clic détourné vers une autre adresse que celle du lien", () => {
    const click = { href: 'https://autre.fr/', at: 9_500 };
    expect(allowNavigation({ ...base, target: 'https://pub.example/', click })).toBe(false);
  });
  it('refuse un clic hors lien ou sur un lien superposé invisible', () => {
    expect(allowNavigation({ ...base, target: 'https://pub.example/', click: { href: null, at: 9_900 } })).toBe(false);
  });
  it('refuse un clic ancien', () => {
    expect(matchesClick('https://a.fr/', { href: 'https://a.fr/', at: 1_000 }, 10_000)).toBe(false);
  });
  it('suit les redirections d’un clic autorisé', () => {
    expect(allowNavigation({ ...base, target: 'https://suivi.example/r', chainOpen: true })).toBe(true);
  });
  it('autorise une adresse approuvée par l’utilisateur', () => {
    expect(allowNavigation({ ...base, target: 'https://pub.example/', approved: 'https://pub.example/' })).toBe(true);
  });
  it('refuse les schémas non web, même approuvés', () => {
    expect(allowNavigation({ ...base, target: 'intent://x#Intent;end', approved: 'intent://x#Intent;end' })).toBe(false);
  });
  it('laisse passer les sous-cadres', () => {
    expect(allowNavigation({ ...base, target: 'https://pub.example/', isTopFrame: false })).toBe(true);
  });
});
