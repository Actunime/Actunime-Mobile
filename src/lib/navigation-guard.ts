/** Garde contre les popups et redirections publicitaires du navigateur intégré. */

/** Délai après un toucher pendant lequel une navigation vers un autre site est jugée voulue. */
export const USER_GESTURE_WINDOW_MS = 1500;

const SECOND_LEVEL = new Set(['co', 'com', 'org', 'net', 'gov', 'edu', 'ac']);

/** Domaine enregistrable approximatif (sans liste des suffixes publics) : `www.a.example.co.uk` → `example.co.uk`. */
export function siteOf(url: string): string | null {
  let host: string;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    host = parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
  if (/^[\d.]+$/.test(host) || host.includes(':')) return host;
  const parts = host.split('.');
  if (parts.length <= 2) return host;
  const keep = parts[parts.length - 1].length === 2 && SECOND_LEVEL.has(parts[parts.length - 2]) ? 3 : 2;
  return parts.slice(-keep).join('.');
}

export function isSameSite(a: string, b: string): boolean {
  const siteA = siteOf(a);
  return siteA !== null && siteA === siteOf(b);
}

interface IGuardInput {
  /** Adresse demandée. */
  target: string;
  /** Page actuellement affichée. */
  current: string;
  /** Navigation du cadre principal (les cadres publicitaires intégrés ne sont pas concernés). */
  isTopFrame: boolean;
  /** Millisecondes depuis le dernier toucher de l'utilisateur sur la page. */
  sinceTouchMs: number;
}

/**
 * Une navigation du cadre principal vers un autre site, sans toucher récent, est une redirection de pub : refusée.
 * Les adresses qui ne sont pas http(s) (intents, applications de pub) sont toujours refusées.
 */
export function allowNavigation({ target, current, isTopFrame, sinceTouchMs }: IGuardInput): boolean {
  if (target === 'about:blank' || target.startsWith('data:') || target.startsWith('blob:')) return true;
  if (siteOf(target) === null) return false;
  if (!isTopFrame) return true;
  if (isSameSite(target, current)) return true;
  return sinceTouchMs <= USER_GESTURE_WINDOW_MS;
}
