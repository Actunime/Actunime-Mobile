import { describe, expect, it } from 'vitest';

import { initialMode } from './tracking-mode';
import type { TrackingState } from './use-tracking';

const detection = { kind: 'manga', title: 'X', url: 'https://x/1', host: 'x', source: 'auto' } as never;

describe('initialMode', () => {
  it('ouvre le panneau à la première rencontre d’une œuvre à identifier, pas aux chapitres suivants', () => {
    const first: TrackingState = { kind: 'confirm', detection, candidates: [], announce: true };
    const next: TrackingState = { kind: 'confirm', detection, candidates: [], announce: false };
    expect(initialMode(first)).toBe('panel');
    expect(initialMode(next)).toBe('pill');
  });

  it('range une œuvre ou un site mis de côté dans le seul logo', () => {
    expect(initialMode({ kind: 'skipped', detection, mode: 'session' })).toBe('icon');
    expect(initialMode({ kind: 'ignored' })).toBe('icon');
  });

  it('une œuvre reconnue reste une pastille', () => {
    expect(initialMode({ kind: 'matched', detection, match: { kind: 'media', id: 'm', title: 'X' } })).toBe('pill');
    expect(initialMode({ kind: 'idle' })).toBe('pill');
  });
});
