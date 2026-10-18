# Actunime Mobile

App Android (React Native + Expo) : navigateur intégré qui détecte ce que tu lis ou regardes sur d'autres sites
et met ta liste Actunime à jour. Équivalent mobile de Actunime-Sync.

Cadrage : `E123` (prototype) et `E56` (feuille de route) dans le vault Obsidian, décision `ADR-014`.

## Développement

```bash
npm install
npm run build:injected   # bundle le script de détection (cœur copié de Actunime-Sync)
npm run type-check
npx expo prebuild --platform android   # génère /android (non versionné)
```

Variables : `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_WEB_URL` (repli sur `localhost` en développement).

## Connexion

Flux code + PKCE : l'app ouvre `/auth/extension/authorize` d'Actunime-Web avec `redirect=actunime://auth/callback`
et un `code_challenge`, puis échange le code avec le `code_verifier` sur `POST /auth/extension/exchange`.
Le jeton est conservé dans `expo-secure-store`.

## Distribution

Push sur `beta` : le workflow `release.yml` construit l'APK, le signe (clé en secrets) et l'attache à une release GitHub.
Installation : télécharger l'APK sur la tablette et autoriser l'installation depuis cette source.

Le dossier `src/detection/core/` est une copie de `Actunime-Sync/src/content/` (heuristiques, nettoyage de titre,
observateur de défilement). Toute correction du cœur doit être reportée des deux côtés.
