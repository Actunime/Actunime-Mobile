/** URLs injectées au build (`EXPO_PUBLIC_*`, inlinées par Metro) ; repli sur l'API locale en développement. */
export const API_URL = process.env.EXPO_PUBLIC_API_URL?.trim() || 'http://localhost:3000';
export const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL?.trim() || 'http://localhost:3002';

/** Redirection de retour de l'autorisation ; le schéma `actunime:` est accepté par `authorize.tsx` côté Web. */
export const AUTH_REDIRECT_URL = 'actunime://auth/callback';
