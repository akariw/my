# Petits Pas 👣

Application Android pour aider les **enfants autistes de 1 à 5 ans** à se préparer à la vie sociale,
à utiliser **avec un parent ou un professionnel**.

> Petits Pas est un outil éducatif de soutien. Il ne remplace ni un diagnostic ni l'accompagnement
> par des professionnels (médecin, orthophoniste, psychomotricien, éducateur, CRA…).

## Les activités

| | Activité | À quoi ça sert |
|---|---|---|
| 😊 | **Mes émotions** | Découvrir 7 émotions (image + phrase lue à voix haute + exemple), imiter la tête, puis jeu « Trouve le visage… » (2 à 4 images). |
| 📖 | **Histoires** | 8 histoires sociales illustrées, pas à pas : dire bonjour, prêter un jouet, attendre son tour, jouer avec un ami, crèche/école, docteur, trop de bruit, se laver les mains. |
| 🗓️ | **Ma journée** | Emploi du temps visuel « Maintenant / Ensuite » pour rendre la journée prévisible. L'enfant valide chaque étape. |
| 💬 | **Je dis** | Tableau de communication : un appui sur une image = la phrase est dite (j'ai faim, aide-moi, pause, câlin, trop de bruit…). |
| 🧱 | **Chacun son tour** | Construire une tour à deux (enfant / adulte) pour apprendre le tour de rôle : « À moi ! », « À toi ! ». |
| 🍃 | **Coin calme** | Bulle de respiration guidée (inspire / souffle) pour revenir au calme. |

**Espace parents** (rester appuyé 2 secondes sur le cadenas) : prénom de l'enfant, accords fille/garçon,
voix et vitesse, difficulté du jeu, préparation de la journée, conseils d'utilisation.

## Choix de conception

- Tout est **lu à voix haute** (synthèse vocale en français) : l'enfant n'a pas besoin de savoir lire.
- Couleurs douces, gros boutons, pas de sons d'échec, pas de clignotement, animations lentes
  (et désactivées si le téléphone demande moins d'animations).
- Les phrases sont courtes, au présent, à la première personne (méthode des histoires sociales).
- On ne force jamais le regard ni le contact.
- Aucune publicité, aucun compte, **fonctionne sans internet**. Les données restent sur le téléphone.

## Installer l'application sur un téléphone Android

1. Sur GitHub, ouvrez l'onglet **Actions** → **APK Android (Petits Pas)** → la dernière exécution réussie.
2. Téléchargez l'artefact **petits-pas-apk** (un fichier zip), puis décompressez-le : il contient `petits-pas.apk`.
3. Copiez `petits-pas.apk` sur le téléphone et ouvrez-le. Android demandera d'autoriser
   l'installation d'applications de source inconnue : acceptez pour cette fois.

Pour que la voix fonctionne, le téléphone doit avoir une voix française
(Paramètres → Accessibilité → Synthèse vocale → « Synthèse vocale Google », langue Français).

## Développement

L'app est écrite en HTML/CSS/JavaScript (`www/`) et emballée pour Android avec [Capacitor](https://capacitorjs.com).

```sh
npm install
npm run serve          # tester dans le navigateur : http://localhost:8000
npx cap sync android   # copier www/ dans le projet Android
npx cap open android   # ouvrir dans Android Studio pour compiler / lancer
```

- `www/js/data.js` : tout le contenu (émotions, histoires, pictogrammes, phrases). Les mots écrits
  `[content|contente]` s'accordent selon le réglage fille/garçon.
- `www/js/app.js` : les écrans et la logique.
- `assets/` : icône et écran de démarrage (régénérer avec `npx @capacitor/assets generate --android`).

## Idées pour la suite

- Ajouter ses propres photos (la maison, la crèche, la famille) dans les histoires et l'emploi du temps.
- Pictogrammes ARASAAC, très utilisés en orthophonie.
- Enregistrer la voix d'un parent à la place de la synthèse vocale.
- Publication sur le Google Play Store (nécessite un compte développeur et une clé de signature de production).
