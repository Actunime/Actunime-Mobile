# Politique de sécurité

## Signaler une vulnérabilité

Merci de **ne pas la publier**. Écris-nous en privé à [actunime@actunime.fr](mailto:actunime@actunime.fr) ou via les
[avis de sécurité GitHub](https://github.com/Actunime/Actunime-Mobile/security/advisories/new) du dépôt, avec :

- ce que tu as observé et comment le reproduire ;
- la version de l'application (Profil → Mises à jour automatiques) et d'Android ;
- l'impact que tu imagines.

Nous répondons dès que possible et te tenons au courant de la correction.

## Ce que l'application garde sur ton téléphone

- Le jeton de connexion, dans le coffre sécurisé d'Android (`expo-secure-store`).
- Tes réglages et ton historique de navigation, uniquement sur l'appareil (« Réglages du navigateur → Effacer l'historique »).
- Rien d'autre : l'application n'embarque ni traqueur publicitaire, ni outil d'analyse d'usage.

## Mises à jour

L'application se met à jour depuis les [releases GitHub](https://github.com/Actunime/Actunime-Mobile/releases) :
l'APK téléchargé est vérifié par son empreinte SHA-256 puis par Android, qui n'installe que ce qui est signé de la même
clé que l'application déjà présente.
