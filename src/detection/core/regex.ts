const MAX_REGEX_LENGTH = 256;

/** Heuristique anti-ReDoS (quantificateurs imbriqués) : copie de `Actunime-Sync/src/shared/learned-patterns-io.ts`. */
const REDOS_HEURISTIC = /\([^)]*[+*][^)]*\)\s*[+*{]|\([^)]*\|[^)]*\)\s*[+*{]/;

export function isValidRegex(source: string): boolean {
  if (typeof source !== 'string') return false;
  if (source.length === 0 || source.length > MAX_REGEX_LENGTH) return false;
  if (REDOS_HEURISTIC.test(source)) return false;
  try {
    new RegExp(source);
    return true;
  } catch {
    return false;
  }
}
