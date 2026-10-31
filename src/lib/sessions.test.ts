import { describe, expect, it } from 'vitest';

import { parseUserAgent, sessionName } from './sessions';

describe('parseUserAgent', () => {
  it('reconnaît le navigateur et le système', () => {
    expect(parseUserAgent('Mozilla/5.0 (Linux; Android 14) AppleWebKit Chrome/120 Mobile Safari/537')).toEqual({ browser: 'Chrome', os: 'Android' });
    expect(parseUserAgent('Mozilla/5.0 (Windows NT 10.0) Gecko Firefox/121')).toEqual({ browser: 'Firefox', os: 'Windows' });
    expect(parseUserAgent('Mozilla/5.0 (Windows NT 10.0) Chrome/120 Edg/120')).toEqual({ browser: 'Edge', os: 'Windows' });
  });

  it('rend null sans User-Agent', () => {
    expect(parseUserAgent(undefined)).toEqual({ browser: null, os: null });
  });
});

describe('sessionName', () => {
  it('préfère les champs de l’API, puis le User-Agent, puis le type', () => {
    expect(sessionName({ browser: 'Chrome', os: 'Linux' })).toBe('Chrome · Linux');
    expect(sessionName({ userAgent: 'Mozilla/5.0 (Windows NT 10.0) Firefox/121' })).toBe('Firefox · Windows');
    expect(sessionName({ deviceType: 'mobile' })).toBe('mobile');
    expect(sessionName({})).toBe('Appareil inconnu');
  });
});
