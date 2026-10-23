# Relay

Relay est un studio de planification de publications sociales. Le frontend est dans `src/`; l’API et le worker sont dans `api/`.

## Architecture retenue

```text
React/Vite → API Fastify → MongoDB
                     ↓
                 Redis / BullMQ → worker → n8n → plateformes sociales
```

- **MongoDB** est la source de vérité : médias, publications, connexions et événements de livraison.
- **Redis + BullMQ** conservent les tâches différées et isolent l’API des traitements longs.
- **Le worker** réclame une publication une seule fois puis appelle le webhook n8n.
- **n8n** orchestre les appels propres à chaque plateforme et peut rappeler l’API sur `POST /v1/internal/deliveries/:publicationId` pour consigner les résultats.

La publication est idempotente grâce à un identifiant de job déterministe et à une transition atomique `scheduled → dispatching` dans MongoDB.

## Lancer la stack locale

1. Copiez `.env.example` vers `.env` et remplacez les secrets.
2. Lancez `docker compose up --build`.
3. Ouvrez le frontend avec `npm run dev` puis l’API à `http://localhost:4000` et n8n à `http://localhost:5678`.
4. Importez [le workflow d’exemple](./n8n/relay-publish.example.json) dans n8n et connectez les branches Instagram, TikTok, LinkedIn et YouTube avec les identifiants propres à l’instance.

## Instance n8n hébergée

Le workflow **Relay — publication dispatch** est publié sur l’instance n8n fournie. Son webhook de production est `POST https://n8n-gdg.abdoulazizdione.cloud/webhook/relay-publish`.

Utilisez [.env.remote.example](./.env.remote.example) pour faire pointer l’API et le worker vers cette instance. Avant toute mise en production, protégez le webhook par Header Auth dans n8n avec la même valeur que `N8N_SHARED_SECRET`, puis ajoutez un callback HTTP Request par destination vers l’API afin de consigner les publications réussies ou échouées.

Les branches de publication attendent les applications développeur et autorisations OAuth de Meta/Instagram, TikTok, LinkedIn et Google/YouTube. Ces comptes ne doivent jamais être ajoutés au dépôt : configurez-les uniquement comme credentials chiffrés dans n8n.

## Contrat d’API initial

| Route | Usage |
| --- | --- |
| `GET /health` | Vérifier l’API et MongoDB |
| `GET/POST /v1/assets` | Lister ou référencer les médias |
| `POST /v1/assets/upload` | Importer une image ou une vidéo dans le volume de l’API |
| `GET/POST /v1/publications` | Lire et créer les brouillons |
| `POST /v1/publications/:id/schedule` | Programmer une publication et créer le job différé |
| `POST /v1/internal/deliveries/:publicationId` | Callback sécurisé de n8n par plateforme |

Les fichiers ne transitent pas par MongoDB. Par défaut, ils sont enregistrés dans le volume persistant de l’API (`UPLOAD_DIR`) et servis sous `/media`. Pour plusieurs instances de l’API, remplacez cet adaptateur par un stockage objet S3/R2 : MongoDB reste dédiée aux métadonnées et aux requêtes produit.

## Production Coolify

Créez MongoDB, Redis, l’application `api/` (port `4000`, volume `/data/uploads`) et le worker `api/` avec la commande `node dist/worker.js` dans le même environnement. Configurez `PUBLIC_API_URL` avec le domaine de l’API et construisez le frontend avec `VITE_API_URL` égal à cette URL. Les deux services backend partagent `MONGODB_URI`, `REDIS_URL`, `N8N_PUBLISH_WEBHOOK_URL` et `N8N_SHARED_SECRET`.
