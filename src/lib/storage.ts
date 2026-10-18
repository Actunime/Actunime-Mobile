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

/** Associations « série détectée → média Actunime » confirmées par l'utilisateur (clé : kind|titre normalisé). */
export interface IMatch {
  mediaId: string;
  title: string;
}

export async function getMatches(): Promise<Record<string, IMatch>> {
  const raw = await AsyncStorage.getItem(MATCHES_KEY);
  return raw ? (JSON.parse(raw) as Record<string, IMatch>) : {};
}

export async function saveMatch(key: string, match: IMatch): Promise<void> {
  const matches = await getMatches();
  matches[key] = match;
  await AsyncStorage.setItem(MATCHES_KEY, JSON.stringify(matches));
}
