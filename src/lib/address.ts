const SEARCH_URL = 'https://duckduckgo.com/?q=';
const LOCAL_HOST = /^(?:localhost|\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?(?:[/?#].*)?$/i;
const DOMAIN = /^[^\s/]+\.[a-z]{2,}(?::\d+)?(?:[/?#].*)?$/i;

/**
 * Adresse saisie → URL à ouvrir : une URL telle quelle, un nom de domaine en https, une adresse locale
 * (localhost ou IP, serveur de test ou box du réseau) en http, sinon une recherche.
 */
export function resolveAddress(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (/\s/.test(value)) return `${SEARCH_URL}${encodeURIComponent(value)}`;
  if (LOCAL_HOST.test(value)) return `http://${value}`;
  if (DOMAIN.test(value)) return `https://${value}`;
  return `${SEARCH_URL}${encodeURIComponent(value)}`;
}
