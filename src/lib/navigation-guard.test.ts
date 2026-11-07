import { describe, expect, it } from 'vitest';

import { allowNavigation, isSameSite, siteOf } from './navigation-guard';

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
  const base = { current: 'https://lecteur.fr/ch1', isTopFrame: true, sinceTouchMs: 10_000 };
  it('autorise le même site sans toucher', () => {
    expect(allowNavigation({ ...base, target: 'https://www.lecteur.fr/ch2' })).toBe(true);
  });
  it('refuse un autre site sans toucher récent', () => {
    expect(allowNavigation({ ...base, target: 'https://pub.example/' })).toBe(false);
  });
  it('autorise un autre site juste après un toucher', () => {
    expect(allowNavigation({ ...base, target: 'https://autre.fr/', sinceTouchMs: 300 })).toBe(true);
  });
  it('refuse les schémas non web, même après un toucher', () => {
    expect(allowNavigation({ ...base, target: 'intent://x#Intent;end', sinceTouchMs: 0 })).toBe(false);
  });
  it('laisse passer les cadres intégrés', () => {
    expect(allowNavigation({ ...base, target: 'https://pub.example/', isTopFrame: false })).toBe(true);
  });
});
