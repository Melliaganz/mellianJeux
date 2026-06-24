# Les Mellianjeux

Plateforme de jeux multijoueurs en ligne. La page d'accueil est un hub qui
liste les jeux disponibles. Premier jeu : **Le Maillon Faible**.

## Stack

- **frontend/** : React + Vite, installable en PWA. Hub + un module par jeu.
- **backend/** : serveur de jeu temps reel Colyseus (Node + TypeScript). Le
  serveur fait autorite sur l'etat des parties.
- **docker-compose.yml** : PostgreSQL + Redis, pour les etapes ulterieures
  (comptes, banque de questions, matchmaking public). Inutile pour demarrer.

Gestion de paquets : **Yarn Berry (v4)** en workspaces, linker `node-modules`.
Un seul `yarn install` a la racine installe le back et le front.

## Demarrage (dev)

Depuis la racine, installer une fois :

```bash
yarn install
```

Puis lancer le back et le front dans deux terminaux :

```bash
yarn dev:back     # http://localhost:2567  (monitor : /colyseus)
yarn dev:front    # http://localhost:5173
```

### Tester le multijoueur

Ouvrir deux onglets sur http://localhost:5173, aller sur Le Maillon Faible.
Premier onglet : "Creer une partie privee", un code (roomId) s'affiche.
Second onglet : coller le code puis "Rejoindre". Les deux joueurs apparaissent
dans la liste, synchronisee en temps reel.

## Environnements dev / prod

Le backend charge sa config selon `NODE_ENV` : `backend/.env.development`
(defaut) ou `backend/.env.production`, avec `backend/.env` en fallback. Chaque
environnement pointe vers sa propre base Postgres (`mellianjeux_dev` et
`mellianjeux_prod`), pour ne pas melanger les comptes et les donnees.

Les scripts `db:push` / `db:seed` et le serveur ciblent la base de l'environnement
courant :

```bash
yarn workspace mellianjeux-backend db:push                      # base dev
NODE_ENV=production yarn workspace mellianjeux-backend db:push  # base prod
```

## Base de donnees (questions + comptes)

PostgreSQL (Drizzle ORM) stocke la banque de questions et les comptes joueurs.
Pour les questions, si la base est indisponible le serveur retombe sur une liste
de secours en memoire ; le jeu reste jouable sans Postgres (mais sans comptes).

Pour l'activer en local :

```bash
# 1. Copier les variables d'environnement
cp .env.example .env                                # variables Docker (Postgres)
cp backend/.env.example backend/.env.development    # config dev
cp backend/.env.example backend/.env.production     # config prod (adapter DATABASE_URL)
# puis renseigner un mot de passe dans .env et le repercuter dans les DATABASE_URL

# 2. Lancer Postgres (mappe sur le port 5433 de l'hote par defaut)
docker compose up -d postgres

# 3. Creer les tables puis remplir les questions (base dev)
yarn workspace mellianjeux-backend db:push
yarn workspace mellianjeux-backend db:seed
```

Au premier demarrage, `docker/init/01-databases.sql` cree `mellianjeux_dev` et
`mellianjeux_prod`. Si un volume Postgres existe deja, ce script ne se rejoue
pas : faire `docker compose down -v` puis `up` (perte des donnees locales), ou
creer les deux bases a la main avec `CREATE DATABASE`.

Le port hote de Postgres est configurable via `POSTGRES_PORT` dans `.env`
(5433 par defaut, pour ne pas entrer en conflit avec un Postgres systeme).

## Comptes joueurs (auth)

Inscription / connexion par email + mot de passe (`POST /auth/register`,
`/auth/login`, `/auth/logout`, `GET /auth/me`). Le mot de passe est hashe avec
scrypt (`node:crypto`, sans dependance native) et la session est un jeton opaque
pose en cookie `httpOnly` (seul son hash est stocke en base).

Comme le cookie `httpOnly` n'est pas lisible cote client et que la connexion
Colyseus est cross-origin, l'authentification du salon passe par un **ticket WS**
a usage unique : le front authentifie recupere un ticket via `GET /auth/ws-ticket`
puis le transmet a Colyseus, ou `onAuth` le valide. L'auth reste optionnelle : on
peut toujours jouer en invite avec un simple pseudo.

## Build de production

```bash
yarn build        # construit backend + frontend
```

## Ajouter un nouveau jeu

1. **Backend** : creer `backend/src/rooms/<jeu>/<Jeu>Room.ts` puis l'enregistrer
   dans `backend/src/rooms/registry.ts` avec un identifiant unique.
2. **Frontend** : creer `frontend/src/games/<jeu>/<Jeu>Page.tsx` puis l'ajouter
   au tableau `GAMES` dans `frontend/src/games/registry.ts` avec le **meme**
   identifiant.

Le hub et le routing prennent le jeu en compte automatiquement.

## Etat actuel

Ce qui marche : hub, routing, PWA, salons prives temps reel, une manche complete
(questions, timer, cagnotte en chaine, banque, validation par l'animateur),
plusieurs manches avec votes d'elimination, ecran "Maillon Faible" et fin de
partie. Banque de questions servie depuis PostgreSQL.

| Etape | Contenu | Etat |
|-------|---------|------|
| 1 | Mecanique d'une manche : questions, timer, cagnotte en chaine | fait |
| 2 | Plusieurs manches, votes d'elimination, ecran "Maillon Faible" | fait |
| 3 | Banque de questions (PostgreSQL) | fait |
| 3b | Comptes joueurs (auth email/mot de passe, environnements dev/prod) | fait |
| 4 | Sons, animations, polish | a venir |
| 5 | Parties publiques + matchmaking (Redis) | a venir |

## Versions Colyseus

Le serveur est volontairement maintenu en Colyseus **0.16** (schema v3) car le
client officiel `colyseus.js` n'existe pas encore au-dela de 0.16. Ne pas
monter le serveur en 0.17 tant qu'un client 0.17 n'est pas publie : le format
d'encodage du schema differe et l'etat ne se decode plus cote client.

## Icones PWA

`frontend/public/icon-192.png` et `icon-512.png` sont des copies du logo. Pour
une installation PWA propre, generer de vraies icones aux dimensions exactes
(192x192 et 512x512).
