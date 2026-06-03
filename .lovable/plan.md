# Améliorer les logs Vie Privée

## Objectif
Pouvoir savoir clairement **qui** (quel client/utilisateur) a activé le mode vie privée et **s'il a oublié de le désactiver**, directement dans `/admin`.

## Ce qu'on va ajouter

### 1. Enrichir la table `privacy_events`
Ajouter des colonnes pour mieux tracer :
- `actor_username` (texte) — nom d'utilisateur Cognito lisible (en plus du sub déjà présent)
- `actor_ip` (texte) — IP de la requête (depuis les headers de l'edge function)
- `actor_user_agent` (texte) — navigateur/appareil utilisé

### 2. Edge function `flespi-proxy`
- Lire `x-forwarded-for` et `user-agent` depuis les headers de la requête
- Recevoir `actor_username` depuis le frontend
- Enregistrer ces infos dans `privacy_events`

### 3. Frontend (`Dashboard.tsx` + `integrations/flespi`)
- Envoyer aussi le `username` (préfere `email` ou `cognito:username`) en plus du `sub` lors d'un toggle ON/OFF

### 4. UI `/admin` — onglet Vie privée
Refondre le tableau avec colonnes plus utiles :
| Date | Véhicule (IMEI) | Action | Auteur (email / username) | Appareil | Source |

Et surtout : **nouvelle section "Sessions vie privée actives"** en haut de l'onglet :
- Pour chaque véhicule, calcule la **dernière action ON sans OFF correspondant**
- Affiche : véhicule, qui l'a activé, depuis combien de temps (ex: "activé il y a 3h 24min par john@xxx.com")
- Badge rouge si > 24h (probablement oublié)
- Bouton "Forcer désactivation" (optionnel, on peut le laisser pour plus tard)

## Détails techniques

**Calcul des sessions actives** (côté `admin-history`) :
```
Pour chaque device_id:
  events = privacy_events triés desc
  dernier = events[0]
  si dernier.action == 'ON' → session active depuis dernier.created_at
```

**Migration SQL** : ajout des 3 colonnes (nullable, pas de breaking change).

## Hors scope
- Pas de notification email automatique (peut venir après)
- Pas de désactivation automatique forcée
- Pas de changement à la logique Flespi elle-même
