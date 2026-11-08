import AsyncStorage from '@react-native-async-storage/async-storage';
import type { IMemberAppearanceBody } from '@actunime/validations';
import { useSyncExternalStore } from 'react';

const KEY = 'actunime.theme.prefs';

/** Réglages du lecteur (comme `usePreferences` du site) et brouillon de l'éditeur de thème. */
export interface IThemePrefs {
  /** Appliquer mon thème enregistré à toute l'app. */
  applyOwnTheme: boolean;
  /** Afficher le thème des autres membres sur leur profil. */
  showProfileThemes: boolean;
}

interface IThemeState extends IThemePrefs {
  /** Thème en cours d'édition : aperçu fidèle sur toute l'app, même pour un avantage pas encore débloqué. */
  draft: IMemberAppearanceBody | null;
}

let state: IThemeState = { applyOwnTheme: true, showProfileThemes: true, draft: null };
const listeners = new Set<() => void>();

function publish(next: IThemeState) {
  state = next;
  listeners.forEach((listener) => listener());
}

void AsyncStorage.getItem(KEY)
  .then((raw) => {
    if (!raw) return;
    const saved = JSON.parse(raw) as Partial<IThemePrefs>;
    publish({ ...state, applyOwnTheme: saved.applyOwnTheme !== false, showProfileThemes: saved.showProfileThemes !== false });
  })
  .catch(() => undefined);

export function setThemePref(patch: Partial<IThemePrefs>): void {
  publish({ ...state, ...patch });
  void AsyncStorage.setItem(KEY, JSON.stringify({ applyOwnTheme: state.applyOwnTheme, showProfileThemes: state.showProfileThemes })).catch(() => undefined);
}

export function setThemeDraft(draft: IMemberAppearanceBody | null): void {
  publish({ ...state, draft });
}

export function useThemeState(): IThemeState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}
