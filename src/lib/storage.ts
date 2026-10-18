import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export interface IAuthState {
  accessToken: string;
  expiresAt: number;
  user: { id: string; username: string; displayName?: string; avatarUrl?: string | null };
}

const AUTH_KEY = 'actunime.auth';
const MATCHES_KEY = 'actunime.matches';

export async function getAuth(): Promise<IAuthState | null> {
  const raw = await SecureStore.getItemAsync(AUTH_KEY);
  if (!raw) return null;
  try {
    const auth = JSON.parse(raw) as IAuthState;
    return auth.expiresAt > Date.now() ? auth : null;
  } catch {
    return null;
  }
}

export function setAuth(auth: IAuthState): Promise<void> {
  return SecureStore.setItemAsync(AUTH_KEY, JSON.stringify(auth));
}

export function clearAuth(): Promise<void> {
  return SecureStore.deleteItemAsync(AUTH_KEY);
}

/**
 * Association « série détectée → œuvre Actunime » confirmée par l'utilisateur (clé : kind|titre normalisé).
 * `media` : œuvre validée (`id` = identifiant de l'œuvre). `pending` : œuvre encore en attente de validation,
 * suivie par une entrée de ma liste (`id` = identifiant de l'entrée).
 */
export interface IMatch {
  kind: 'media' | 'pending';
  id: string;
  title: string;
}

/** Les associations enregistrées par les premières versions n'avaient que `mediaId` : on les lit comme `media`. */
function normalizeMatch(raw: Partial<IMatch> & { mediaId?: string }): IMatch {
  return { kind: raw.kind ?? 'media', id: (raw.id ?? raw.mediaId) as string, title: raw.title ?? '' };
}

export async function getMatches(): Promise<Record<string, IMatch>> {
  const raw = await AsyncStorage.getItem(MATCHES_KEY);
  const stored = raw ? (JSON.parse(raw) as Record<string, Partial<IMatch> & { mediaId?: string }>) : {};
  return Object.fromEntries(Object.entries(stored).map(([key, value]) => [key, normalizeMatch(value)]));
}

export async function saveMatch(key: string, match: IMatch): Promise<void> {
  const matches = await getMatches();
  matches[key] = match;
  await AsyncStorage.setItem(MATCHES_KEY, JSON.stringify(matches));
}

export async function forgetMatch(key: string): Promise<void> {
  const matches = await getMatches();
  delete matches[key];
  await AsyncStorage.setItem(MATCHES_KEY, JSON.stringify(matches));
}
