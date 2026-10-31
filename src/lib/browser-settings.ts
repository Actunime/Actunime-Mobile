import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

const SETTINGS_KEY = 'actunime.browser.settings';

export interface IBrowserSettings {
  /** Bloqueur de publicités et de traqueurs. */
  adblock: boolean;
  /** Garder les sites visités et la dernière page lue de chaque œuvre (accueil du navigateur). */
  history: boolean;
  /** Mettre ma liste à jour dès la fin du chapitre ou de l'épisode ; sinon, « Marquer comme lu » à la main. */
  autoProgress: boolean;
  /** Masquer la barre d'outils quand on lit vers le bas, la rendre en remontant. */
  fullscreen: boolean;
  /** Sections de l'accueil du navigateur. */
  showResume: boolean;
  showSites: boolean;
  showRecent: boolean;
}

export const DEFAULT_BROWSER_SETTINGS: IBrowserSettings = {
  adblock: true,
  history: true,
  autoProgress: true,
  fullscreen: true,
  showResume: true,
  showSites: true,
  showRecent: true,
};

/** Valeurs lues du stockage : seuls les booléens connus sont repris, le reste retombe sur le défaut (versions futures, données abîmées). */
export function parseSettings(raw: string | null): IBrowserSettings {
  if (!raw) return DEFAULT_BROWSER_SETTINGS;
  try {
    const stored = JSON.parse(raw) as Record<string, unknown>;
    const next = { ...DEFAULT_BROWSER_SETTINGS };
    for (const key of Object.keys(next) as (keyof IBrowserSettings)[]) {
      if (typeof stored[key] === 'boolean') next[key] = stored[key] as boolean;
    }
    return next;
  } catch {
    return DEFAULT_BROWSER_SETTINGS;
  }
}

let current = DEFAULT_BROWSER_SETTINGS;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

void AsyncStorage.getItem(SETTINGS_KEY)
  .then((raw) => {
    current = parseSettings(raw);
    emit();
  })
  .catch(() => undefined);

export const getBrowserSettings = (): IBrowserSettings => current;

export function setBrowserSetting<K extends keyof IBrowserSettings>(key: K, value: IBrowserSettings[K]): void {
  current = { ...current, [key]: value };
  emit();
  void AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(current));
}

/** Réglages du navigateur, partagés entre l'écran de réglages, le navigateur et son accueil (tous montés en même temps). */
export function useBrowserSettings(): IBrowserSettings {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getBrowserSettings,
  );
}
