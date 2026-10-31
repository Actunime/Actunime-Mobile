/**
 * Lien « chapitre / épisode suivant » d'une page de lecture, trouvé dans le document : `rel="next"` d'abord
 * (le plus fiable), puis un lien dont le texte ou l'étiquette dit « suivant » / « next ». Les liens de pagination
 * d'une liste (« page suivante ») sont écartés : on cherche l'œuvre suivante dans la lecture, pas la page de résultats.
 */
const NEXT_WORDS = /(?:chapitre|chapter|chap\.?|épisode|episode|ep\.?)?\s*(?:suivant|next)\b|[›»→]\s*$|^\s*[›»→]/i;
const PAGINATION = /\bpage\s+(?:suivante|next)\b|next\s+page|pagination/i;

function usableHref(anchor: HTMLAnchorElement, currentUrl: string): string | null {
  const raw = anchor.getAttribute('href');
  if (!raw || raw.startsWith('#') || /^(?:javascript|mailto|tel):/i.test(raw)) return null;
  try {
    const target = new URL(raw, currentUrl);
    if (!/^https?:$/.test(target.protocol)) return null;
    target.hash = '';
    const here = new URL(currentUrl);
    here.hash = '';
    return target.href === here.href ? null : target.href;
  } catch {
    return null;
  }
}

export function findNextLink(doc: Document, currentUrl: string): string | null {
  for (const element of Array.from(doc.querySelectorAll<HTMLAnchorElement | HTMLLinkElement>('a[rel~="next"], link[rel~="next"]'))) {
    const href = element.getAttribute('href');
    if (!href) continue;
    const anchor = doc.createElement('a');
    anchor.setAttribute('href', href);
    const resolved = usableHref(anchor, currentUrl);
    if (resolved) return resolved;
  }

  for (const anchor of Array.from(doc.querySelectorAll<HTMLAnchorElement>('a[href]'))) {
    const label = `${anchor.textContent ?? ''} ${anchor.getAttribute('aria-label') ?? ''} ${anchor.getAttribute('title') ?? ''}`
      .replace(/\s+/g, ' ')
      .trim();
    if (!label || label.length > 60 || PAGINATION.test(label) || !NEXT_WORDS.test(label)) continue;
    const resolved = usableHref(anchor, currentUrl);
    if (resolved) return resolved;
  }
  return null;
}
