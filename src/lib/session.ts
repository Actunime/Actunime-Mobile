import { ApiError } from './api-error';
import { markSignedOut, signIn } from './auth-store';
import { API_URL } from './config';
import { clearAuth, getAuth, type IAuthState } from './storage';

/** Marge ajoutée à celle de `sessionFromTokens` : on renouvelle avant que le jeton n'expire en route. */
const EARLY_REFRESH_MS = 30_000;

export interface ITokenResponse {
  accessToken: string;
  expiresIn: number;
  /** Absents tant que l'API de renouvellement n'est pas déployée : la session reste alors sans renouvellement. */
  refreshToken?: string;
  refreshExpiresIn?: number;
}

/** Construit la session à conserver ; une minute de marge : mieux vaut renouveler que d'écrire avec un jeton expiré. */
export function sessionFromTokens(tokens: ITokenResponse, user: IAuthState['user'], now = Date.now()): IAuthState {
  return {
    accessToken: tokens.accessToken,
    expiresAt: now + tokens.expiresIn * 1000 - 60_000,
    ...(tokens.refreshToken
      ? {
          refreshToken: tokens.refreshToken,
          refreshExpiresAt: now + (tokens.refreshExpiresIn ?? 0) * 1000 - 60_000,
        }
      : {}),
    user,
  };
}

let inflight: Promise<IAuthState | null> | null = null;

async function performRefresh(staleToken?: string): Promise<IAuthState | null> {
  const current = await getAuth();
  if (!current) return null;
  // Une requête concurrente a déjà renouvelé la session pendant qu'on attendait : on reprend son jeton.
  if (staleToken && current.accessToken !== staleToken) return current;
  if (!current.refreshToken) return null;

  // Si la réponse se perd (pas de réponse HTTP), on renvoie le même jeton une fois : l'API tolère ce renvoi
  // pendant 30 s, alors qu'abandonner laisserait un jeton déjà tourné côté serveur et perdu côté app.
  let response: Response | null = null;
  for (let attempt = 0; attempt < 2 && !response; attempt++) {
    try {
      response = await fetch(`${API_URL}/auth/extension/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: current.refreshToken }),
        credentials: 'omit',
      });
    } catch {
      // réessai immédiat ; après le second échec la session est conservée et le renouvellement sera retenté plus tard
    }
  }
  if (!response) throw new ApiError(0, 'Serveur Actunime inaccessible');

  if (response.status === 401 || response.status === 400 || response.status === 403) {
    // Expiré, révoqué ou déjà utilisé (rotation) : plus aucun moyen de rester connecté.
    await clearAuth();
    markSignedOut();
    return null;
  }
  if (!response.ok) throw new ApiError(response.status, `HTTP ${response.status}`);

  const renewed = sessionFromTokens((await response.json()) as ITokenResponse, current.user);
  await signIn(renewed);
  return renewed;
}

/**
 * Renouvelle la session avec le jeton de renouvellement. Les appels simultanés partagent un seul renouvellement
 * (la rotation invalide l'ancien jeton : deux appels en parallèle déconnecteraient le membre).
 * `staleToken` : le jeton d'accès refusé ou expiré, pour reconnaître une session déjà renouvelée.
 * Renvoie `null` quand il n'y a rien à renouveler ou que le renouvellement est refusé.
 */
export function refreshSession(staleToken?: string): Promise<IAuthState | null> {
  inflight ??= performRefresh(staleToken).finally(() => {
    inflight = null;
  });
  return inflight;
}

/** Jeton d'accès à envoyer, renouvelé au besoin ; `null` si le membre n'est pas connecté. */
export async function getAccessToken(): Promise<string | null> {
  const auth = await getAuth();
  if (!auth) return null;
  if (!auth.refreshToken || auth.expiresAt - EARLY_REFRESH_MS > Date.now()) return auth.accessToken;
  try {
    const renewed = await refreshSession(auth.accessToken);
    return renewed?.accessToken ?? null;
  } catch (err) {
    // Réseau ou serveur indisponible : si le jeton d'accès vaut encore, on s'en sert plutôt que d'échouer.
    if (auth.expiresAt > Date.now()) return auth.accessToken;
    throw err;
  }
}
