import type { ISession } from './api';

/** Navigateur et système lus du `User-Agent` d'une session (même lecture que la page « Appareils » du site). */
export function parseUserAgent(ua?: string): { browser: string | null; os: string | null } {
  if (!ua) return { browser: null, os: null };
  let browser: string | null = null;
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';

  let os: string | null = null;
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  return { browser, os };
}

/** Nom lisible d'une session : navigateur et système (champs de l'API, sinon lus du `User-Agent`). */
export function sessionName(session: Pick<ISession, 'browser' | 'os' | 'userAgent' | 'deviceType'>): string {
  const parsed = parseUserAgent(session.userAgent);
  const name = [session.browser ?? parsed.browser, session.os ?? parsed.os].filter(Boolean).join(' · ');
  return name || session.deviceType || 'Appareil inconnu';
}
