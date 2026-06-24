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

Ce qui marche : hub, routing, PWA, connexion temps reel, salons prives
(creer / rejoindre / liste des joueurs synchronisee, gestion de l'hote).

A venir (mecanique de jeu) :

| Etape | Contenu |
|-------|---------|
| 1 | Mecanique d'une manche : questions, timer, cagnotte en chaine |
| 2 | Plusieurs manches, votes d'elimination, ecran "Maillon Faible" |
| 3 | Comptes + banque de questions (PostgreSQL) |
| 4 | Sons, animations, polish |
| 5 | Parties publiques + matchmaking (Redis) |

## Versions Colyseus

Le serveur est volontairement maintenu en Colyseus **0.16** (schema v3) car le
client officiel `colyseus.js` n'existe pas encore au-dela de 0.16. Ne pas
monter le serveur en 0.17 tant qu'un client 0.17 n'est pas publie : le format
d'encodage du schema differe et l'etat ne se decode plus cote client.

## Icones PWA

`frontend/public/icon-192.png` et `icon-512.png` sont des copies du logo. Pour
une installation PWA propre, generer de vraies icones aux dimensions exactes
(192x192 et 512x512).
