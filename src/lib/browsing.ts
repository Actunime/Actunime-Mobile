import AsyncStorage from '@react-native-async-storage/async-storage';

const SITES_KEY = 'actunime.browser.sites';
const LAST_READ_KEY = 'actunime.browser.lastRead';

/** Au plus ce nombre de sites non épinglés sont gardés ; les épinglés ne sont jamais écartés. */
export const MAX_RECENT_SITES = 8;
/** Au plus ce nombre d'œuvres gardent leur dernière page. */
export const MAX_LAST_READS = 100;

export interface IBrowserSite {
  host: string;
  /** Dernière page visitée sur ce site (le raccourci rouvre la racine du site, pas cette page). */
  url: string;
  at: number;
  pinned?: boolean;
}

export interface ILastRead {
  url: string;
  /** Numéro du chapitre ou de l'épisode atteint. */
  number: number;
  host: string;
  at: number;
}

/** Clé d'une œuvre : `anime:<id>` ou `manga:<id>` (identifiant de l'œuvre, ou de l'entrée si elle est en attente). */
export const lastReadKey = (kind: 'anime' | 'manga', id: string): string => `${kind}:${id}`;

/** Hôte d'une adresse web, sans `www.` ; `null` pour tout ce qui n'est pas http(s) (page vide, recherche interne…). */
export function hostOf(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.host.replace(/^www\./, '') || null;
  } catch {
    return null;
  }
}

/** Les moteurs de recherche ne sont pas des sites de lecture : les ranger parmi les sites récents n'apporterait rien. */
const IGNORED_HOSTS = new Set(['duckduckgo.com', 'google.com', 'bing.com']);

/** Ajoute ou rafraîchit un site : les épinglés d'abord, puis les plus récents ; les plus anciens non épinglés sortent. */
export function upsertSite(sites: IBrowserSite[], url: string, now = Date.now()): IBrowserSite[] {
  const host = hostOf(url);
  if (!host || IGNORED_HOSTS.has(host)) return sites;
  const rest = sites.filter((site) => site.host !== host);
  const existing = sites.find((site) => site.host === host);
  const next = [{ host, url, at: now, ...(existing?.pinned ? { pinned: true } : {}) }, ...rest];
  return capSites(next);
}

export function togglePinned(sites: IBrowserSite[], host: string): IBrowserSite[] {
  return capSites(sites.map((site) => (site.host === host ? { ...site, pinned: !site.pinned } : site)));
}

export function removeSite(sites: IBrowserSite[], host: string): IBrowserSite[] {
  return sites.filter((site) => site.host !== host);
}

function capSites(sites: IBrowserSite[]): IBrowserSite[] {
  const pinned = sites.filter((site) => site.pinned);
  const recent = sites.filter((site) => !site.pinned).sort((a, b) => b.at - a.at).slice(0, MAX_RECENT_SITES);
  return [...pinned.sort((a, b) => b.at - a.at), ...recent];
}

/** Racine d'un site : ce qu'ouvre un raccourci. */
export const siteHome = (site: Pick<IBrowserSite, 'host' | 'url'>): string => {
  try {
    return `${new URL(site.url).protocol}//${site.host}/`;
  } catch {
    return `https://${site.host}/`;
  }
};

/** Garde la page la plus avancée : revenir lire un ancien chapitre ne fait pas reculer « Reprendre ». */
export function mergeLastRead(all: Record<string, ILastRead>, key: string, entry: ILastRead): Record<string, ILastRead> {
  const current = all[key];
  if (current && current.number > entry.number) return all;
  const next = { ...all, [key]: entry };
  const keys = Object.keys(next);
  if (keys.length <= MAX_LAST_READS) return next;
  const oldest = keys.sort((a, b) => next[a]!.at - next[b]!.at).slice(0, keys.length - MAX_LAST_READS);
  for (const old of oldest) delete next[old];
  return next;
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export const getSites = (): Promise<IBrowserSite[]> => readJson<IBrowserSite[]>(SITES_KEY, []);
const saveSites = (sites: IBrowserSite[]) => AsyncStorage.setItem(SITES_KEY, JSON.stringify(sites));

export async function recordVisit(url: string): Promise<void> {
  const sites = await getSites();
  const next = upsertSite(sites, url);
  if (next !== sites) await saveSites(next);
}

export async function pinSite(host: string): Promise<IBrowserSite[]> {
  const next = togglePinned(await getSites(), host);
  await saveSites(next);
  return next;
}

export async function forgetSite(host: string): Promise<IBrowserSite[]> {
  const next = removeSite(await getSites(), host);
  await saveSites(next);
  return next;
}

export const getLastReads = (): Promise<Record<string, ILastRead>> => readJson<Record<string, ILastRead>>(LAST_READ_KEY, {});

export async function recordLastRead(key: string, entry: Omit<ILastRead, 'host' | 'at'>): Promise<void> {
  const host = hostOf(entry.url);
  if (!host) return;
  const all = await getLastReads();
  const next = mergeLastRead(all, key, { ...entry, host, at: Date.now() });
  if (next !== all) await AsyncStorage.setItem(LAST_READ_KEY, JSON.stringify(next));
}

/** « aujourd'hui », « hier », « il y a 3 j » : repère de reprise, pas une date exacte. */
export function agoLabel(at: number, now = Date.now()): string {
  const days = Math.floor((now - at) / 86_400_000);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return 'hier';
  if (days < 30) return `il y a ${days} j`;
  return `il y a ${Math.floor(days / 30)} mois`;
}
