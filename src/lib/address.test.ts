import { describe, expect, it } from 'vitest';

import { resolveAddress } from './address';

describe('resolveAddress', () => {
  it('garde une URL complète telle quelle', () => {
    expect(resolveAddress(' https://site.com/a?b=1 ')).toBe('https://site.com/a?b=1');
  });

  it('ajoute https:// à un nom de domaine', () => {
    expect(resolveAddress('manga-site.com/lire/12')).toBe('https://manga-site.com/lire/12');
    expect(resolveAddress('localhost.dev:8080')).toBe('https://localhost.dev:8080');
  });

  it('ouvre en http une adresse locale (IP ou localhost)', () => {
    expect(resolveAddress('10.0.2.2:8099/weird/read/')).toBe('http://10.0.2.2:8099/weird/read/');
    expect(resolveAddress('192.168.1.20')).toBe('http://192.168.1.20');
    expect(resolveAddress('localhost:3000')).toBe('http://localhost:3000');
  });

  it('lance une recherche pour tout le reste', () => {
    expect(resolveAddress('solo leveling')).toBe('https://duckduckgo.com/?q=solo%20leveling');
    expect(resolveAddress('motseul')).toBe('https://duckduckgo.com/?q=motseul');
  });

  it('ignore une saisie vide', () => {
    expect(resolveAddress('   ')).toBeNull();
  });
});
