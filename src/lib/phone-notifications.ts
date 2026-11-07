import { useEffect } from 'react';

import { PhoneNotifications } from '../../modules/actunime-notifications/src';
import { useAuth } from './auth-store';
import { API_URL } from './config';

/**
 * Garde la partie native au courant de la session : la tâche périodique et le service instantané utilisent le même
 * jeton d'accès que l'app, copié à chaque connexion ou renouvellement, et oublié à la déconnexion.
 */
export function useSyncPhoneNotifications(): void {
  const { auth, loaded } = useAuth();
  const token = auth?.accessToken;
  const expiresAt = auth?.expiresAt ?? 0;
  useEffect(() => {
    if (!loaded) return;
    try {
      if (token) PhoneNotifications.setCredentials(API_URL, token, expiresAt);
      else PhoneNotifications.clearCredentials();
    } catch {
      // module natif absent (aperçu web, tests) : rien à synchroniser
    }
  }, [loaded, token, expiresAt]);
}
