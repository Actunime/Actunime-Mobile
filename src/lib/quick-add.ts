import type { MediaKind } from './api';

export interface IFormatOption {
  value: string;
  label: string;
}

/** Formats proposés à l'ajout rapide (sous-ensemble de `AnimeFormatArray` / `MangaFormatArray` de `@actunime/types`, validé par l'API). */
export const QUICK_ADD_FORMATS: Record<MediaKind, readonly IFormatOption[]> = {
  anime: [
    { value: 'SERIE', label: 'Série' },
    { value: 'SERIE_COURTE', label: 'Série courte' },
    { value: 'FILM', label: 'Film' },
    { value: 'ONA', label: 'ONA' },
    { value: 'OVA', label: 'OVA' },
  ],
  manga: [
    { value: 'MANGA', label: 'Manga' },
    { value: 'MANHWA', label: 'Manhwa' },
    { value: 'MANHUA', label: 'Manhua' },
    { value: 'ONE_SHOT', label: 'One shot' },
    { value: 'OTHER', label: 'Autre' },
  ],
};

/** Format le plus probable d'après l'adresse (« manhwa », « webtoon », « manhua » dans le chemin ou le site). */
export function guessFormat(kind: MediaKind, url: string): string {
  if (kind === 'anime') return 'SERIE';
  const haystack = url.toLowerCase();
  if (/manhua/.test(haystack)) return 'MANHUA';
  if (/manhwa|webtoon|toon/.test(haystack)) return 'MANHWA';
  return 'MANGA';
}

/**
 * Autres titres à transmettre à l'équipe : ceux que la page propose et que le membre n'a pas retenus comme titre
 * principal, sans doublon, 5 au plus (limite de l'API). Ils servent à relier l'œuvre à une fiche existante.
 */
export function aliasesFor(title: string, others: readonly string[]): string[] {
  const key = (value: string) => value.trim().toLowerCase();
  const seen = new Set([key(title)]);
  const out: string[] = [];
  for (const other of others) {
    const trimmed = other.trim();
    if (trimmed.length < 2 || trimmed.length > 200 || seen.has(key(trimmed))) continue;
    seen.add(key(trimmed));
    out.push(trimmed);
    if (out.length === 5) break;
  }
  return out;
}
