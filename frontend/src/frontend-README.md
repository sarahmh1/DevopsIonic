Frontend - projetIonic (Ionic / Angular)
=====================================

Ce fichier explique rapidement comment lancer et tester le frontend Ionic inclus
dans ce dépôt.

Où se trouvent les sources
- Le code client est dans `src/` (Angular + Ionic).
- Les pages clés: `src/app/pages/register`, `src/app/pages/notifications`,
  `src/app/pages/event-form`.

Configuration importante
- Le frontend lit l'URL de l'API depuis `src/environments/environment.ts` via
  `environment.apiUrl`. Par défaut, en développement, c'est probablement
  `http://localhost:3000/api`.

Lancer en développement
- Installer les dépendances si nécessaire (depuis la racine du projet):

```powershell
npm install
```

- Démarrer l'application Ionic en mode développement (serve):

```powershell
npx ionic serve
```

Remarques pour Windows / PowerShell
- Si le backend tourne sur un port différent (ex. 3001), mettez à jour
  `src/environments/environment.ts` pour pointer vers `http://localhost:3001/api`.

Tester le flux notifications (rapide)
1. Lancer backend et frontend.
2. Créer un compte organisateur (page Inscription) et se connecter.
3. Créer un événement en tant qu'organisateur.
4. Créer un compte participant, se connecter, et s'inscrire à l'événement.
5. Se reconnecter en tant qu'organisateur et ouvrir la page Notifications :
   vous devriez voir une notification non lue et le badge.

Notes techniques
- `src/app/services/api.service.ts` contient toutes les méthodes API (login,
  register, events, notifications). Elles retournent des Promises (via
  `firstValueFrom`) pour simplifier l'usage dans les pages.
- `src/app/app.component.ts` initialise le polling des notifications (uniquement
  pour les organisateurs) et stocke le `user` et `token` dans `@ionic/storage`.

Si vous voulez que je rajoute des exemples curl/postman pour chaque endpoint,
ou des tests unitaires légers, dites-le et je les ajoute.
