import { useSyncExternalStore } from 'react';

import { clearAuth, getAuth, setAuth as persistAuth, type IAuthState } from './storage';

/**
 * État de connexion partagé par tous les écrans. Sans lui, la route de retour de l'autorisation montait un
 * second écran d'accueil qui ne savait pas que la connexion venait d'aboutir.
 */
interface IAuthSnapshot {
  auth: IAuthState | null;
  /** Faux tant que le jeton conservé n'a pas été relu : évite d'afficher « Se connecter » à tort au démarrage. */
  loaded: boolean;
}

let snapshot: IAuthSnapshot = { auth: null, loaded: false };
const listeners = new Set<() => void>();

function publish(next: IAuthSnapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

void getAuth().then((auth) => publish({ auth, loaded: true }));

export async function signIn(auth: IAuthState): Promise<void> {
  await persistAuth(auth);
  publish({ auth, loaded: true });
}

export async function signOut(): Promise<void> {
  await clearAuth();
  publish({ auth: null, loaded: true });
}

/** Le jeton a été refusé par l'API (401) : l'app repasse en « non connecté ». */
export function markSignedOut(): void {
  publish({ auth: null, loaded: true });
}

export function useAuth(): IAuthSnapshot {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => snapshot,
  );
}
