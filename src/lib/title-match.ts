/**
 * Comparaison approximative de titres : copie de `Actunime-Sync/src/background/matcher.ts`
 * (mêmes seuils, pour que l'extension et l'app reconnaissent les mêmes œuvres).
 */

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\w\s]/g, '')
    .trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

/** Ressemblance de 0 à 1 entre deux titres (distance de Levenshtein normalisée). */
export function similarity(a: string, b: string): number {
  const x = normalize(a);
  const y = normalize(b);
  if (x === y) return 1;
  const max = Math.max(x.length, y.length);
  return max === 0 ? 0 : 1 - levenshtein(x, y) / max;
}

/** Deux titres désignent-ils la même œuvre ? Identiques, l'un contenu dans l'autre (4 lettres min.), ou très proches. */
export function fuzzyTitleMatch(detected: string, candidate: string): boolean {
  const d = detected.trim().toLowerCase();
  const c = candidate.trim().toLowerCase();
  if (!d || !c) return false;
  if (d === c) return true;
  if (c.includes(d) && d.length >= 4) return true;
  if (d.includes(c) && c.length >= 4) return true;
  return similarity(d, c) >= 0.85;
}
