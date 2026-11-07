/** Garde contre les popups et redirections publicitaires du navigateur intégré. */

/** Un clic sur un lien n'autorise une navigation que pendant ce délai. */
export const CLICK_WINDOW_MS = 3000;

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

function withoutHash(url: string): string {
  const index = url.indexOf('#');
  return index === -1 ? url : url.slice(0, index);
}

/** Dernier clic de l'utilisateur sur un vrai lien visible (`href` null : clic hors lien, ou lien superposé invisible). */
export interface IUserClick {
  href: string | null;
  at: number;
}

/** Le clic récent portait sur un lien visible vers cette adresse. */
export function matchesClick(target: string, click: IUserClick | null, now: number): boolean {
  if (!click?.href || now - click.at > CLICK_WINDOW_MS) return false;
  return withoutHash(click.href) === withoutHash(target);
}

interface IGuardInput {
  target: string;
  current: string;
  /** Navigation du cadre principal (les sous-cadres ne sont pas concernés). */
  isTopFrame: boolean;
  click: IUserClick | null;
  now: number;
  /** Une navigation autorisée par un clic est encore en cours : ses redirections serveur suivent. */
  chainOpen: boolean;
  /** Adresse que l'utilisateur vient d'autoriser malgré le blocage. */
  approved?: string | null;
}

/**
 * Une navigation du cadre principal vers un autre site n'est permise que si l'utilisateur vient de cliquer
 * sur un lien visible qui y mène (ou pour les redirections d'un tel clic). Un script, une superposition
 * transparente ou un `window.open` n'y suffisent pas. Les adresses non web (intents) sont toujours refusées.
 */
export function allowNavigation({ target, current, isTopFrame, click, now, chainOpen, approved }: IGuardInput): boolean {
  if (target === 'about:blank' || target.startsWith('data:') || target.startsWith('blob:')) return true;
  if (siteOf(target) === null) return false;
  if (!isTopFrame) return true;
  if (approved && withoutHash(approved) === withoutHash(target)) return true;
  if (isSameSite(target, current)) return true;
  return chainOpen || matchesClick(target, click, now);
}
