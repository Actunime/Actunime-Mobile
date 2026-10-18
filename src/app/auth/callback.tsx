import { router } from 'expo-router';
import { useEffect } from 'react';

/**
 * Retour de l'autorisation (`actunime://auth/callback?code=…`). `openAuthSessionAsync` lit déjà le code dans
 * l'URL ; cette route existe pour qu'Expo Router n'affiche pas « Unmatched Route », puis revient à l'écran
 * d'où la connexion est partie (ou à l'accueil si l'app vient d'être ouverte par ce lien).
 */
export default function AuthCallback() {
  useEffect(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, []);

  return null;
}
