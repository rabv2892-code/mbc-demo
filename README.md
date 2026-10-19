# Marouane Business Center

Logiciel de gestion pour le café, l'eau et le transport moto.

## Démarrage local

1. Installer Docker Desktop et Node.js 20+.
2. Copier `.env.example` vers `.env`.
3. Générer un `JWT_SECRET` unique d'au moins 32 caractères (ne pas laisser la valeur d'exemple).
4. Lancer PostgreSQL (port 55434, uniquement sur `127.0.0.1`) :

```bash
npm run db:up
```

5. Installer, migrer et initialiser :

```bash
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

En local, le seed peut créer des comptes de démonstration. Ils ne sont **pas** créés en production et leurs mots de passe ne s'affichent ni dans l'interface ni dans les journaux. Changez-les dès la première connexion.

## Scripts

- `npm run typecheck` — vérification TypeScript
- `npm test` — tests unitaires
- `npm run lint` — ESLint
- `npm run build` — build de production
- `npm run db:migrate:deploy` — appliquer les migrations (`prisma migrate deploy`)
- `npm run db:backup` — sauvegarde SQL via Docker (`backups/`)
- `npm run db:restore -- backups/fichier.sql` — restauration
- `npm run db:studio` — exploration de la base

## Sauvegarde et restauration

Les scripts utilisent le conteneur `mbc-postgres` et n'affichent pas les identifiants.

```bash
npm run db:backup
npm run db:restore -- backups/mbc-AAAA-MM-JJ.sql
```

Sur un VPS, faites une sauvegarde **avant** chaque migration :

```bash
docker exec mbc-postgres pg_dump -U "$POSTGRES_USER" --no-owner --no-acl "$POSTGRES_DB" > backups/pre-migrate.sql
npx prisma migrate deploy
```

## Démo publique temporaire (Render + Neon)

Sans frais au départ, pour une URL de test. **Ne pas copier la base locale.** Aucun compte `admin@mbc.local` sur internet.

1. Créer un dépôt GitHub (après autorisation) à partir de ce projet, **sans** fichiers `.env`.
2. Créer une base Neon Free. Utiliser l’URL **directe** (non pooler) comme `DATABASE_URL`.
3. Créer un Web Service Render Free, brancher le dépôt, Node 20.
   - Build : `npm ci && npx prisma generate && npm run build`
   - Start : `npm run start:hosted` (écoute `PORT`, puis `prisma migrate deploy` + `next start`)
   - Health : `/api/health`
4. Renseigner les variables Render (valeurs dans le tableau de bord, jamais dans Git) : `DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `MBC_ENV=demo`, `APP_TZ=Africa/Conakry`.
5. Une fois le service vert : Shell Render `npm run db:seed`. Optionnel : `SEED_FIXTURE_DATA=true` pour des ventes/achats fictifs.
6. Ouvrir `https://….onrender.com/login` avec le Super Admin créé.

Limites gratuites : endormissement après inactivité, froid au réveil, quota Neon, pas d’uptime garanti. Cookie `secure` dès que `NODE_ENV=production`.

## Mise en production (sans perte de données)

1. Préparer un serveur (VPS) avec Docker et un reverse proxy HTTPS (Caddy ou Nginx).
2. Copier le projet. Créer un `.env` de production **distinct** du `.env` local :
   - `MBC_ENV=production`
   - `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` uniques (jamais `mbc_dev_password`)
   - `JWT_SECRET` unique ≥ 32 caractères
   - `DATABASE_URL` vers le service Postgres interne (pas de port 5432 public)
   - `ADMIN_EMAIL` et `ADMIN_PASSWORD` pour le premier Super Admin (12 caractères minimum)
3. Ne pas publier le port PostgreSQL. Le compose de production écoute l'app sur `127.0.0.1:3000`.
4. Sauvegarder si une base existe déjà, puis :

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
docker compose -f docker-compose.prod.yml exec app npm run db:seed
```

5. Pointer le reverse proxy vers `127.0.0.1:3000`.
6. Vérifier `https://votre-domaine/api/health` puis se connecter avec le Super Admin.
7. Créer vendeur café et livreur depuis **Utilisateurs**. Désactiver tout compte de démonstration restant.

Ne pas exécuter `prisma migrate reset` ni `db push --force-reset` en production.

## Variables d'environnement (noms uniquement)

| Nom | Rôle |
| --- | --- |
| `DATABASE_URL` | Connexion Prisma PostgreSQL |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Compte Postgres (prod ≠ dev) |
| `JWT_SECRET` | Signature des sessions |
| `MBC_ENV` | `production` active les contrôles stricts |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Premier Super Admin (seed) |
| `APP_TZ` | Fuseau, `Africa/Conakry` |
| `COOKIE_NAME` | Cookie httpOnly de session |
| `ALLOW_DEMO_ACCOUNTS` | Démo locale uniquement |

## Règles métier

Les dates, heures, utilisateurs, prix configurés, totaux, bénéfices, stocks et amortissements de vente sont calculés côté serveur. Les montants de vente envoyés par le frontend sont ignorés. Le montant d'une livraison (course) est saisi par le livreur ou le Super Admin, puis contrôlé côté serveur.
