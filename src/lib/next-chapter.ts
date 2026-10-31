/**
 * Adresse du chapitre ou de l'épisode suivant, déduite de l'adresse courante quand la page ne donne pas de lien :
 * le numéro courant, repéré dans le chemin (de préférence après « chapter », « chapitre », « episode », « ep »…),
 * est remplacé par le suivant. `null` si le numéro n'apparaît pas dans l'adresse.
 */
const WORDS = 'chapter|chapitre|chap|ch|scan|episode|épisode|ep|e';

export function nextNumberUrl(url: string, current: number): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!Number.isInteger(current) || current < 0) return null;
  const next = String(current + 1);
  const exact = String(current);

  const withWord = new RegExp(`((?:^|[/_-])(?:${WORDS})[-_/ ]?)${exact}(?=$|[/_?#.-])`, 'i');
  if (withWord.test(parsed.pathname)) {
    parsed.pathname = parsed.pathname.replace(withWord, `$1${next}`);
    return parsed.href;
  }

  // sans mot-clé : un segment du chemin qui est exactement le numéro, ou qui se termine par -numéro
  const segments = parsed.pathname.split('/');
  for (let i = segments.length - 1; i >= 0; i--) {
    const segment = segments[i];
    if (segment === exact) segments[i] = next;
    else if (new RegExp(`-${exact}$`).test(segment)) segments[i] = segment.replace(new RegExp(`${exact}$`), next);
    else continue;
    parsed.pathname = segments.join('/');
    return parsed.href;
  }
  return null;
}
