import { describe, expect, it } from 'vitest';

import { scrollState } from './scroll-state';

describe('scrollState', () => {
  it('en haut, au milieu et en bas', () => {
    expect(scrollState(0, 1000)).toEqual({ edge: 'top', percent: 0 });
    expect(scrollState(500, 1000)).toEqual({ edge: 'middle', percent: 50 });
    expect(scrollState(996, 1000)).toEqual({ edge: 'bottom', percent: 100 });
  });

  it('une page plus courte que l’écran n’est jamais « en bas »', () => {
    expect(scrollState(0, 0)).toEqual({ edge: 'top', percent: 0 });
    expect(scrollState(5, 0)).toEqual({ edge: 'middle', percent: 0 });
  });
});
