import { useSyncExternalStore } from 'react';

/**
 * Plein écran de lecture du navigateur : quand il est actif, la barre d'outils du navigateur et la navigation du
 * bas se masquent ensemble (il ne reste que le haut du bouton central pour les rappeler). Un état partagé, car les
 * deux barres vivent dans des composants distincts.
 */
let hidden = false;
const listeners = new Set<() => void>();

export function setReadingChromeHidden(next: boolean) {
  if (hidden === next) return;
  hidden = next;
  listeners.forEach((listener) => listener());
}

export const getReadingChromeHidden = () => hidden;

export function useReadingChromeHidden(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => hidden,
    () => false,
  );
}
