import type { WebBrowserAuthSessionResult } from 'expo-web-browser';

/** Attente de l'URL de retour après une fermeture de la session : voir `finishAuthSession`. */
export const CALLBACK_GRACE_MS = 1500;

/**
 * Sur Android, `openAuthSessionAsync` conclut `dismiss` dès que l'app repasse au premier plan, parfois juste
 * avant que l'URL de retour (`actunime://auth/callback?code=…`) n'arrive. Avant de conclure à une annulation,
 * on laisse `CALLBACK_GRACE_MS` à cette URL. `waitForUrl` résout l'URL reçue, ou `null` à l'échéance.
 * Renvoie l'URL de retour, ou `null` si la connexion est bien annulée.
 */
export async function finishAuthSession(
  result: WebBrowserAuthSessionResult,
  waitForUrl: (timeoutMs: number) => Promise<string | null>,
): Promise<string | null> {
  if (result.type === 'success') return result.url;
  if (result.type === 'dismiss') return waitForUrl(CALLBACK_GRACE_MS);
  return null;
}
