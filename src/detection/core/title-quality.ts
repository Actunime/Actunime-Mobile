/**
 * Un titre d'œuvre plausible : assez de lettres, pas un identifiant. Les adresses de sites de lecture contiennent
 * souvent un numéro (`/6225159-chapter-1`) ou un code (`z0l20`) qui ne doivent jamais passer pour le titre.
 */
export function isPlausibleTitle(title: string | undefined): title is string {
  if (!title) return false;
  const value = title.trim();
  if (value.length < 3) return false;
  // trois lettres de suite au moins : écarte « 6225159 », « 12-3 », « ... »
  if (!/\p{L}{3,}/u.test(value)) return false;
  const digits = (value.match(/\d/g) ?? []).length;
  const letters = (value.match(/\p{L}/gu) ?? []).length;
  // un code type « z0l20 » ou « a9f3c1b2 » : peu de lettres, beaucoup de chiffres, pas d'espace
  if (!/\s/.test(value) && digits > 0 && digits >= letters / 2 && value.length <= 12) return false;
  return true;
}

/** Forme comparable d'un titre (minuscules, sans accents ni ponctuation) pour repérer deux propositions identiques. */
export function titleKey(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}
