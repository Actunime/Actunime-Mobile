import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: vi.fn().mockResolvedValue(null), setItem: vi.fn().mockResolvedValue(undefined) },
}));

import { setBrowserSetting } from './browser-settings';
import { clearDiagnosticLog, formatDiagnosticLog, getDiagnosticEntries, logEvent, MAX_ENTRIES } from './diagnostic-log';

beforeEach(() => {
  setBrowserSetting('diagnostic', true);
  clearDiagnosticLog();
});

describe('journal diagnostic', () => {
  it("n'écrit rien quand le mode est coupé", () => {
    setBrowserSetting('diagnostic', false);
    logEvent('app', 'test');
    expect(getDiagnosticEntries()).toHaveLength(0);
  });

  it('garde les événements les plus récents', () => {
    for (let i = 0; i < MAX_ENTRIES + 5; i += 1) logEvent('page', 'e', { i });
    const list = getDiagnosticEntries();
    expect(list).toHaveLength(MAX_ENTRIES);
    expect(list[list.length - 1].data).toEqual({ i: MAX_ENTRIES + 4 });
  });

  it('borne les valeurs longues', () => {
    logEvent('nav', 'url', { url: 'x'.repeat(1000) });
    expect(String(getDiagnosticEntries()[0].data?.url).length).toBeLessThan(400);
  });

  it('formate une ligne par événement', () => {
    logEvent('app', 'detection', { title: 'Solo', chapter: 3 });
    const text = formatDiagnosticLog(getDiagnosticEntries(), new Date('2026-11-11T18:00:00Z'));
    expect(text).toContain('1 événement(s)');
    expect(text).toMatch(/\d\d:\d\d:\d\d\.\d{3} \[app\] detection \{"title":"Solo","chapter":3\}/);
  });
});
