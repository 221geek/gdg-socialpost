# Todo

## [2026-10-25] Publication X bloquée « En cours » + back-office vidéos

### Diagnostic (lecture du code)
- « En cours » = statut `dispatching`. Le worker le pose **avant** d'appeler n8n, et seul le callback
  `POST /v1/internal/deliveries/:id` en sort. Le workflow n8n versionné est un stub : rien ne poste sur X
  ni ne rappelle l'API → la publication reste bloquée indéfiniment.
- Les retries BullMQ ne servent à rien : au 2e essai le statut est `dispatching` ≠ `scheduled`, le job
  sort sans rien faire et passe « completed ».
- Aucun journal par publication : seul `dispatch_failed` est consigné, et seulement après 5 échecs.
- Le jeton X OAuth2 expire après ~2 h et n'est jamais rafraîchi.
- Le scope `media.write` (obligatoire pour l'upload vidéo v2) n'est pas demandé → reconnexion X nécessaire.
- UI : liste en lignes avec vignette, panneau latéral ; pas de lancement immédiat, pas de relance, pas de journal,
  rien n'est modifiable une fois `dispatching`.

### Plan
- [x] Worker : publication X native (refresh token, upload vidéo chunked v2, POST /2/tweets), autres plateformes → n8n
- [x] Journal d'événements par publication (chaque étape, erreurs X détaillées) + `GET /v1/publications/:id/events`
- [x] Retries corrects (claim idempotent, statut `failed` + message), récupération des publications bloquées
- [x] Actions API : publier maintenant, relancer
- [x] Scope OAuth `media.write`
- [x] UI Publications : grille de vidéos lisibles directement, détails/journal/modifier/publier maintenant inline
- [x] Vérif : `tsc`, build Vite, test local Mongo+Redis avec faux serveur X, navigateur

### Résultat
- Bug supplémentaire trouvé au test : CORS n'autorisait que GET/HEAD/POST → PATCH (modifier) et DELETE (déconnexion) bloqués en prod. Corrigé.
- Testé localement (Mongo + Redis isolé + faux serveur X) : publication programmée, refresh du jeton, upload 15 Mo en 4 segments,
  callback n8n, scope manquant, relance d'une publication bloquée (cas de 13 h), refus de relance d'une diffusion active, retry auto après 503.
- UI vérifiée dans le navigateur : grille vidéo, filtres, détails + journal live, modifier, publier maintenant, relancer, mobile.

### Reste à faire côté prod
- [ ] Ajouter X_CLIENT_ID / X_CLIENT_SECRET au service worker dans Coolify
- [ ] Ajouter `media.write` aux permissions de l'app dans la console X si nécessaire, puis reconnecter X dans Paramètres
- [ ] Déployer API + worker + frontend, puis « Relancer » la publication de 13 h

## [2026-10-25] Supprimer, reprogrammer, discussion par publication
- [x] API : `DELETE /v1/publications/:id` (retire le job, le journal et la discussion ; refusé pendant une diffusion active)
- [x] API : reprogrammer (PATCH) aussi une diffusion bloquée > 20 min
- [x] API : `GET/POST /v1/publications/:id/comments` + `commentCount` dans la liste
- [x] API : erreurs de validation → 422 lisible (au lieu d'un 500 brut)
- [x] UI : fenêtre à 3 colonnes (vidéo · contenu + journal · actions + discussion), Reprogrammer, Supprimer
- [x] Testé en local : 2 comptes qui commentent, reprogrammation d'une publication bloquée, suppression (job Redis retiré)
