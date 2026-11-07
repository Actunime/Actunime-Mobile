import apiClient from '@actunime/client';
import { isAxiosError, type InternalAxiosRequestConfig } from 'axios';

import { ApiError } from './api-error';
import { markSignedOut } from './auth-store';
import { API_URL } from './config';
import { getAccessToken, refreshSession } from './session';
import { clearAuth } from './storage';

/**
 * Client de l'API : la bibliothèque `@actunime/client`, partagée avec le site et le tableau de bord, pour que le
 * mobile suive les contrats de l'API au lieu de les recopier. Ce module ne fait que l'adapter au mobile :
 * jeton Bearer renouvelable (aucun cookie), erreurs en `ApiError`.
 */
interface IRetryableConfig extends InternalAxiosRequestConfig {
  _renewed?: boolean;
}

let configured = false;

export function api() {
  if (configured) return apiClient;
  apiClient.init({ baseUrl: API_URL });
  const http = apiClient.getHttp();
  // Pas de cookie de session : le mobile s'authentifie uniquement par jeton.
  http.defaults.withCredentials = false;

  http.interceptors.request.use(async (config) => {
    const token = await getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  http.interceptors.response.use(undefined, async (error: unknown) => {
    if (!isAxiosError(error)) throw error;
    const status = error.response?.status ?? 0;
    const original = error.config as IRetryableConfig | undefined;
    const sentToken = original?.headers?.Authorization?.toString().replace(/^Bearer /, '') ?? null;

    // Jeton refusé : une seule tentative de renouvellement (partagée entre les requêtes simultanées), puis on rejoue.
    if (status === 401 && original && !original._renewed && sentToken) {
      original._renewed = true;
      const renewed = await refreshSession(sentToken);
      if (renewed && renewed.accessToken !== sentToken) {
        original.headers.Authorization = `Bearer ${renewed.accessToken}`;
        return http.request(original);
      }
    }
    if (status === 401 && sentToken) {
      await clearAuth();
      markSignedOut();
    }
    const body = error.response?.data as { message?: string | string[] } | undefined;
    const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
    throw new ApiError(status, status === 0 ? 'Serveur Actunime inaccessible' : (message ?? `HTTP ${status}`));
  });

  configured = true;
  return apiClient;
}
