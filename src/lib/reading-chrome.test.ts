import { afterEach, describe, expect, it, vi } from 'vitest';

import { getReadingChromeHidden, setReadingChromeHidden } from './reading-chrome';

describe('reading-chrome', () => {
  afterEach(() => setReadingChromeHidden(false));

  it('part visible et se masque puis se rend', () => {
    expect(getReadingChromeHidden()).toBe(false);
    setReadingChromeHidden(true);
    expect(getReadingChromeHidden()).toBe(true);
    setReadingChromeHidden(false);
    expect(getReadingChromeHidden()).toBe(false);
  });
});
