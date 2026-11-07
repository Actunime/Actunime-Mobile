# Notices des composants tiers

Actunime Mobile est publié sous licence MIT (voir `LICENSE`). Il s'appuie sur des logiciels et des listes de filtres
tiers, chacun sous sa propre licence.

## Logiciels

| Composant | Rôle | Licence |
|---|---|---|
| [React Native](https://github.com/facebook/react-native), [Expo](https://github.com/expo/expo), [Expo Router](https://docs.expo.dev/router/introduction/) | socle de l'application | MIT |
| [react-native-webview](https://github.com/react-native-webview/react-native-webview) | navigateur intégré (un correctif local ajoute un crochet de filtrage des requêtes, voir `patches/`) | MIT |
| [TanStack Query](https://github.com/TanStack/query) | cache des données serveur | MIT |
| [lucide-react-native](https://github.com/lucide-icons/lucide) | icônes | ISC |
| [socket.io-client-java](https://github.com/socketio/socket.io-client-java) | socket des notifications instantanées (`modules/actunime-notifications`) | MIT |
| [AndroidX WorkManager](https://developer.android.com/jetpack/androidx/releases/work) | vérification régulière des notifications | Apache-2.0 |
| [adblock-rust](https://github.com/brave/adblock-rust) (Brave) | moteur de filtres du bloqueur de publicités (`modules/actunime-adblock/rust`) | MPL-2.0 |
| Cœur de détection d'Actunime Sync (`src/detection/core/`) | reconnaissance du titre, du chapitre et de l'épisode | MIT (même organisation) |

Les dépendances complètes, avec leurs versions, sont dans `package-lock.json` et `modules/actunime-adblock/rust/Cargo.lock`.

## Listes de filtres du bloqueur de publicités

Les listes ne sont **pas** incluses dans ce dépôt ni dans l'APK : l'application les télécharge depuis leurs
publicateurs au premier lancement, puis les rafraîchit. Elles restent la propriété de leurs auteurs et sous leurs
licences :

- [EasyList](https://easylist.to/) et EasyPrivacy : GPLv3+ / CC BY-SA 3.0
- [uBlock Origin filters](https://github.com/uBlockOrigin/uAssets) : GPLv3
- [Liste FR](https://forums.lanik.us/viewforum.php?f=91) : GPLv3+ / CC BY-SA 3.0

## Marques

« Actunime » et son logo appartiennent à leurs auteurs. Les noms de sites et de services cités à titre d'exemple
(Crunchyroll, ADN, Webtoon, MANGA Plus…) appartiennent à leurs propriétaires ; Actunime n'est affilié à aucun d'eux.
