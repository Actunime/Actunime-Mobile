import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Œuvres que le lecteur ne veut pas suivre. Lire quelques chapitres pour voir si l'œuvre plaît ne doit ni demander
 * « quelle œuvre ? » à chaque page ni écrire dans la liste :
 * - `session` : « Pas pour le moment » — oublié à la fermeture de l'app ;
 * - `forever` : « Ne plus suivre cette œuvre » — mémorisé, jusqu'à ce qu'on la reprenne.
 * La clé est celle des associations (`kind|titre normalisé`, voir `matchKey`).
 */
export type SkipMode = 'session' | 'forever';

const KEY = 'actunime.skippedWorks';
const session = new Set<string>();
/** Œuvres dont le panneau a déjà été montré pendant cette session : il ne se rouvre pas à chaque chapitre. */
const announced = new Set<string>();

export function parseSkipped(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

async function readForever(): Promise<Set<string>> {
  return new Set(parseSkipped(await AsyncStorage.getItem(KEY)));
}

export async function skipModeOf(key: string): Promise<SkipMode | null> {
  if (session.has(key)) return 'session';
  return (await readForever()).has(key) ? 'forever' : null;
}

export async function skipWork(key: string, mode: SkipMode): Promise<void> {
  if (mode === 'session') {
    session.add(key);
    return;
  }
  const forever = await readForever();
  forever.add(key);
  session.delete(key);
  await AsyncStorage.setItem(KEY, JSON.stringify([...forever]));
}

/** Reprend le suivi d'une œuvre, quelle que soit la façon dont elle avait été mise de côté. */
export async function resumeWork(key: string): Promise<void> {
  session.delete(key);
  const forever = await readForever();
  if (forever.delete(key)) await AsyncStorage.setItem(KEY, JSON.stringify([...forever]));
}

/** Vrai la première fois qu'on voit cette œuvre pendant la session : c'est alors seulement qu'on ouvre le panneau. */
export function firstSight(key: string): boolean {
  if (announced.has(key)) return false;
  announced.add(key);
  return true;
}

/** Pour les tests : repart d'une session neuve. */
export function resetSession(): void {
  session.clear();
  announced.clear();
}
