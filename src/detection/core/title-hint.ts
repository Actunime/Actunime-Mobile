/**
 * Pages de lecture qui ne disent pas de quelle œuvre il s'agit (lecteur dessiné sur un canevas, titre générique de
 * l'onglet) : le titre vient de la page de la série visitée juste avant sur le même site, le numéro du sélecteur de
 * chapitre (« #001 »). Logique pure ; la mémoire du titre est dans le script injecté.
 */
const VIEWER_URL = /\/(viewer|reader|read|lire|chapter|chapitre|episode|watch)(\/|-|$|\?)/i;

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
