import * as WebBrowser from 'expo-web-browser';

import { api } from './api';
import { AUTH_REDIRECT_URL, WEB_URL } from './config';
import { createPkcePair, createState } from './pkce';
import { signIn } from './auth-store';
import type { IAuthState } from './storage';

const SCOPES = ['profile:read', 'lists:read', 'lists:write', 'progress:write'];

export class AuthError extends Error {}

/** Connexion : consentement sur Actunime-Web (code one-time) puis échange du code avec le verifier PKCE. */
export async function login(): Promise<IAuthState> {
  const { verifier, challenge } = await createPkcePair();
  const state = createState();

  const url = new URL(`${WEB_URL}/auth/extension/authorize`);
  url.searchParams.set('state', state);
  url.searchParams.set('scopes', SCOPES.join(','));
  url.searchParams.set('redirect', AUTH_REDIRECT_URL);
  url.searchParams.set('label', 'Actunime Mobile (Android)');
  url.searchParams.set('code_challenge', challenge);

  const result = await WebBrowser.openAuthSessionAsync(url.toString(), AUTH_REDIRECT_URL);
  if (result.type !== 'success') throw new AuthError('Connexion annulée');

  const callback = new URL(result.url);
  if (callback.searchParams.get('error')) throw new AuthError('Autorisation refusée');
  if (callback.searchParams.get('state') !== state) throw new AuthError('Réponse de connexion invalide');
  const code = callback.searchParams.get('code');
  if (!code) throw new AuthError('Code d’autorisation manquant');

  const exchanged = await api.exchangeCode(code, verifier);
  const auth: IAuthState = {
    accessToken: exchanged.accessToken,
    // marge d'une minute : on préfère redemander une connexion que d'écrire avec un jeton expiré
    expiresAt: Date.now() + exchanged.expiresIn * 1000 - 60_000,
    user: exchanged.user,
  };
  await signIn(auth);
  return auth;
}
