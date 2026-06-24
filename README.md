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

## Base de donnees (banque de questions)

La banque de questions vit dans PostgreSQL (Drizzle ORM). Si la base n'est pas
disponible, le serveur retombe automatiquement sur une liste de secours en
memoire, donc le jeu fonctionne meme sans Postgres.

Pour l'activer en local :

```bash
# 1. Copier les variables d'environnement (a la racine et dans backend/)
cp .env.example .env
cp backend/.env.example backend/.env
# puis renseigner un mot de passe dans .env et le repercuter dans backend/.env (DATABASE_URL)

# 2. Lancer Postgres (mappe sur le port 5433 de l'hote par defaut)
docker compose up -d postgres

# 3. Creer la table puis la remplir
yarn workspace mellianjeux-backend db:push
yarn workspace mellianjeux-backend db:seed
```

Le port hote de Postgres est configurable via `POSTGRES_PORT` dans `.env`
(5433 par defaut, pour ne pas entrer en conflit avec un Postgres systeme).

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
| 3b | Comptes joueurs (auth, historique) | a venir |
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
