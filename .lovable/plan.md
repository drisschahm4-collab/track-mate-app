# Espace admin — historique connexions & vie privée

## Objectif

Créer une route `/admin` réservée à un seul compte (le tien) affichant :
1. L'historique des connexions des chauffeurs (qui, quand, depuis quel appareil)
2. L'historique des bascules ON/OFF du mode vie privée, lu depuis Flespi

## Identification de l'admin

Un seul admin = ton compte. Identifié par un **email admin stocké en secret** (`ADMIN_EMAIL`) côté Lovable Cloud :
- Vérification côté UI (afficher/masquer la route)
- Vérification stricte côté edge function (autorité de la décision)

Tu pourras changer l'email plus tard sans redéploiement.

## Historique des connexions

Flespi ne loggue pas les logins app — il faut une petite table côté Lovable Cloud.

Nouvelle table `login_events` :
- `user_sub` (Cognito sub)
- `username`
- `email`
- `user_agent`
- `created_at`

Insertion à chaque connexion réussie depuis `AuthGate`. RLS : insertion ouverte à l'utilisateur authentifié, lecture réservée à l'edge function admin (service_role).

## Historique vie privée (Flespi)

Lu en direct via Flespi, sans table locale. L'edge function `flespi-proxy` reçoit deux nouvelles actions :

- `plugin-logs` → `GET /gw/plugins/{1100337|1110097}/logs?data={...}` pour récupérer les évènements d'assignation/désassignation du plugin (= activation/désactivation vie privée par device).
- `plugin-devices` → `GET /gw/plugins/1100337/devices/all` pour lister les devices actuellement en mode privé.

L'historique affichera : IMEI / nom device, action (ON/OFF = assign/unassign), timestamp Flespi, plugin concerné.

Limite assumée : on ne voit que ce que Flespi conserve dans ses logs plugin (rétention Flespi). Pas de rétro-actif au-delà.

## Page /admin

Route protégée par un garde :
1. Vérifie qu'un utilisateur est connecté
2. Compare son email à `ADMIN_EMAIL` (via un appel à une edge function `admin-check`)
3. Si non-admin → redirection vers `/`

Contenu :
- **Onglet "Connexions"** : table paginée des `login_events` (date, user, email, UA)
- **Onglet "Vie privée"** : table fusionnée des évènements Flespi des deux plugins (date, IMEI, device, action ON/OFF, plugin)
- Filtres : par utilisateur / IMEI, par plage de dates
- Bouton refresh

## Fichiers concernés

```text
Nouveau    src/pages/Admin.tsx
Nouveau    src/components/admin/LoginHistoryTable.tsx
Nouveau    src/components/admin/PrivacyHistoryTable.tsx
Nouveau    src/hooks/useIsAdmin.ts
Nouveau    supabase/functions/admin-check/index.ts
Nouveau    supabase/functions/admin-history/index.ts   (login_events + proxy Flespi logs)
Modifié    supabase/functions/flespi-proxy/index.ts    (actions plugin-logs, plugin-devices)
Modifié    src/App.tsx                                 (route /admin)
Modifié    src/components/auth/AuthGate.tsx            (insert login_events)
Modifié    src/components/Header.tsx                   (lien Admin si admin)
Migration  table public.login_events + RLS + GRANT
Secret     ADMIN_EMAIL
```

## Détails techniques

**Garde admin**  
`useIsAdmin()` appelle `admin-check` qui lit le JWT, récupère l'email du user, le compare à `Deno.env.get('ADMIN_EMAIL')` et renvoie `{ isAdmin: boolean }`. Aucune logique admin n'est portée par le client.

**Table login_events**
```sql
CREATE TABLE public.login_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_sub text NOT NULL,
  username text,
  email text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.login_events TO authenticated;
GRANT ALL    ON public.login_events TO service_role;
ALTER TABLE public.login_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can insert own login" ON public.login_events
  FOR INSERT TO authenticated WITH CHECK (true);
-- Lecture : aucun SELECT pour authenticated → seul service_role (edge function admin) lit.
CREATE INDEX login_events_created_at_idx ON public.login_events (created_at DESC);
```

**Flespi plugin logs (exemple)**
```
GET https://flespi.io/gw/plugins/1100337/logs?data={"count":200,"reverse":true}
```
Réponse contient des entrées typées `assign` / `unassign` avec `device_id` et `timestamp`. L'edge `admin-history` enrichit chaque ligne avec le `name`/`ident` du device via `/gw/devices/{id}?fields=id,name,configuration`.

**Tracking login**  
Dans `AuthGate`, à la transition « non connecté → connecté », un `insert` dans `login_events` avec `user_sub`, `username`, `email`, `navigator.userAgent`. Best-effort : un échec ne bloque pas l'app.

## Hors scope

- Pas de rôles multi-admin (1 seul admin pour l'instant)
- Pas de log historique pré-déploiement (Flespi only, futures bascules)
- Pas d'export CSV (peut être ajouté ensuite si besoin)
