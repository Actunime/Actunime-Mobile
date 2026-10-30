import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

import type { ViewMode } from '@/components/list/list-controls';

const KEY = 'actunime.searchViewMode';
const MODES: ViewMode[] = ['grid', 'dense', 'list', 'rows'];

/** Disposition choisie, partagée par Ma liste et la Recherche comme la préférence `searchViewMode` du site ; « Liste détaillée » sur téléphone par défaut. */
let current: ViewMode = 'list';
let loaded = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

function load() {
  if (loaded) return;
  loaded = true;
  AsyncStorage.getItem(KEY)
    .then((value) => {
      if (value && MODES.includes(value as ViewMode)) {
        current = value as ViewMode;
        emit();
      }
    })
    .catch(() => undefined);
}

export function useViewMode(): [ViewMode, (mode: ViewMode) => void] {
  useEffect(load, []);
  const mode = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
  );
  const set = (next: ViewMode) => {
    current = next;
    emit();
    AsyncStorage.setItem(KEY, next).catch(() => undefined);
  };
  return [mode, set];
}
