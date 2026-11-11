/**
 * Pages de lecture qui ne disent pas de quelle œuvre il s'agit (lecteur dessiné sur un canevas, titre générique de
 * l'onglet) : le titre vient de la page de la série visitée juste avant sur le même site, le numéro du sélecteur de
 * chapitre (« #001 »). Logique pure ; la mémoire du titre est dans le script injecté.
 */
const VIEWER_URL = /\/(viewer|reader|read|lire|chapter|chapitre|episode|watch)(\/|-|$|\?)/i;

/** Pages de liste ou de navigation : leur premier titre est celui d'une œuvre quelconque, jamais celui de la série ouverte. */
const LISTING_SEGMENT = /^(updates?|ranking|rankings?|search|recherche|home|accueil|genres?|categories|category|tags?|latest|popular|new|library|bookmarks?|favorites?|favoris|history|settings|login|account|news|series|titles?|manga|webtoons?|all)$/i;

/** Titres de page qui ne sont pas ceux d'une œuvre : navigation, nom du site. */
const NOT_A_TITLE = /^(accueil|home|menu|search|rechercher|recherche|connexion|se connecter|login|sign in|favoris|favorites?|chapitres?|chapters?|manga ?plus|webtoons?|crunchyroll|adn)$/i;

export const isViewerUrl = (url: string): boolean => {
  try {
    return VIEWER_URL.test(new URL(url).pathname);
  } catch {
    return false;
  }
};

/** Titre d'œuvre lu en tête d'une page de série : premier `h1`, sinon premier `h2`. */
export function readTitleHint(doc: Document): string | null {
  for (const selector of ['h1', 'h2']) {
    const text = doc.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
    if (text && text.length >= 2 && text.length <= 80 && !NOT_A_TITLE.test(text)) return text;
  }
  return null;
}

/** Numéro de chapitre ou d'épisode d'un sélecteur « #001 » lu dans le haut du texte de la page. */
export function numberFromSelectorText(text: string): number | undefined {
  const match = /(?:^|\s)#\s*(\d{1,4})(?:\s|$)/.exec(text.slice(0, 3000));
  return match ? Number(match[1]) : undefined;
}

/**
 * Page d'une série (`/titles/100037`, `/manga/solo-leveling`) : au moins un segment d'adresse, le dernier n'étant pas
 * un mot de navigation. L'accueil et les listes sont écartés, sinon le titre retenu serait celui d'une œuvre au hasard.
 */
export function isSeriesPageUrl(url: string): boolean {
  try {
    const segments = new URL(url).pathname.split('/').filter(Boolean);
    if (segments.length === 0) return false;
    return !LISTING_SEGMENT.test(segments[segments.length - 1]);
  } catch {
    return false;
  }
}

/**
 * Le titre retenu ne vaut que si on arrive de la page de la série (ou d'un autre chapitre de la même lecture), ou si
 * on ne sait pas d'où on vient. Arriver d'ailleurs (accueil, liste, autre série) : mieux vaut ne rien détecter qu'une
 * mauvaise œuvre.
 */
export function hintApplies(hintUrl: string, previousUrl: string | null): boolean {
  if (!previousUrl) return true;
  if (previousUrl === hintUrl) return true;
  return isViewerUrl(previousUrl);
}
