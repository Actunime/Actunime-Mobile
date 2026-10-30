import { describe, expect, it } from 'vitest';

import { DEFAULT_BROWSER_SETTINGS, parseSettings } from './browser-settings';

describe('parseSettings', () => {
  it('rend les défauts sans donnée ou avec une donnée abîmée', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_BROWSER_SETTINGS);
    expect(parseSettings('pas du json')).toEqual(DEFAULT_BROWSER_SETTINGS);
  });

  it('reprend les booléens connus et ignore le reste', () => {
    const settings = parseSettings(JSON.stringify({ adblock: false, history: 'oui', inconnu: false }));
    expect(settings).toEqual({ ...DEFAULT_BROWSER_SETTINGS, adblock: false });
  });
});
