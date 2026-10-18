import AsyncStorage from '@react-native-async-storage/async-storage';

import type { LearnedPattern } from '@/detection/core/types';

const PATTERNS_KEY = 'actunime.patterns';
const IGNORED_HOSTS_KEY = 'actunime.ignoredHosts';

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Patterns appris par site (assistant de configuration) : 100 % locaux, jamais envoyés à l'API (ADR-008). */
export async function getPattern(host: string): Promise<LearnedPattern | null> {
  return (await readJson<Record<string, LearnedPattern>>(PATTERNS_KEY, {}))[host] ?? null;
}

export async function savePattern(pattern: LearnedPattern): Promise<void> {
  const patterns = await readJson<Record<string, LearnedPattern>>(PATTERNS_KEY, {});
  patterns[pattern.host] = pattern;
  await AsyncStorage.setItem(PATTERNS_KEY, JSON.stringify(patterns));
}

export async function removePattern(host: string): Promise<void> {
  const patterns = await readJson<Record<string, LearnedPattern>>(PATTERNS_KEY, {});
  delete patterns[host];
  await AsyncStorage.setItem(PATTERNS_KEY, JSON.stringify(patterns));
}

export async function isHostIgnored(host: string): Promise<boolean> {
  return (await readJson<string[]>(IGNORED_HOSTS_KEY, [])).includes(host);
}

export async function setHostIgnored(host: string, ignored: boolean): Promise<void> {
  const hosts = new Set(await readJson<string[]>(IGNORED_HOSTS_KEY, []));
  if (ignored) hosts.add(host);
  else hosts.delete(host);
  await AsyncStorage.setItem(IGNORED_HOSTS_KEY, JSON.stringify([...hosts]));
}
