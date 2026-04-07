

## Diagnostic

Les logs montrent clairement le problème :

```
[DvD] Querying index dvDSByDvDDriverSub for "d169201e-5031-7079-88d0-3a017fc2370a" → 0 items
[DvD] Querying index dvDSByDvDDriverSub for "hugo" → 0 items
```

L'index `dvDSByDvDDriverSub` ne trouve rien ni par le **sub Cognito** ni par le **username**. Cela signifie que le champ `dvDDriverSub` dans la table DvD contient un identifiant différent — probablement le `sub` du modèle **Driver** (pas le sub Cognito).

**Cause racine** : Le sub Cognito de l'utilisateur "hugo" (`d169201e-...`) ≠ le `sub` stocké dans le modèle Driver ≠ la valeur de `dvDDriverSub` dans la table DvD.

## Plan de correction

### Étape 1 — Ajouter une recherche par le modèle Driver

Ajouter une requête GraphQL pour chercher le Driver par username, afin de récupérer son `sub` côté Driver :

```graphql
query DriversByUsername($username: String!) {
  driversByUsername(username: $username) {
    items { sub, username }
  }
}
```

### Étape 2 — Résolution en 3 étapes dans `useVehicleResolver.ts`

| Étape | Recherche par | Quand |
|-------|--------------|-------|
| 1 | Cognito `userSub` | Toujours |
| 2 | `username` | Si étape 1 = 0 |
| 3 | Driver `sub` (récupéré via `driversByUsername`) | Si étape 2 = 0 |

### Étape 3 — Ajouter des logs de diagnostic

Logger le `driverSub` trouvé via le Driver pour faciliter le debug futur.

### Fichier modifié

`src/hooks/useVehicleResolver.ts`

### Résultat attendu

L'utilisateur "hugo" se connecte → le système cherche par sub Cognito (0 résultat) → cherche par username "hugo" (0 résultat) → cherche le Driver par username "hugo", récupère son `sub` → cherche les DvD par ce sub → trouve le véhicule assigné.

