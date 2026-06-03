# Corriger les sessions actives "fantômes"

## Problème constaté

Les véhicules `867481036721805` et `863540061951175` apparaissent comme **sessions vie privée actives** dans `/admin`, alors que la base `privacy_events` montre clairement un `OFF` (source `app` / `app-backfill`) comme dernier événement pour chacun.

## Cause racine

Dans `supabase/functions/admin-history/index.ts`, la liste `activeSessions` est calculée à partir du tableau **fusionné** `enriched` qui combine :

1. Les événements stockés en base (`privacy_events`, source = `app` → **fiables**)
2. Les logs bruts du plugin Flespi (codes 320/321/322/323/350… → **bruyants et non fiables** : timestamps tardifs, codes ambigus, rotation des logs, etc.)

Quand Flespi retourne un log mappé en `ON` (ex. `event_code:322` "subscription updated" ou un `subscribe` réémis par le plugin) avec un timestamp postérieur au `OFF` applicatif, la dernière action vue pour le device devient `ON` → la session est affichée comme active à tort.

## Correctif (1 fichier)

`supabase/functions/admin-history/index.ts` — calculer `activeSessions` **uniquement** à partir de `storedEvents` (DB), pas du tableau fusionné :

- Filtrer `storedEvents` sur `plugin_id = '1100337'` (plugin principal).
- Pour chaque `device_id` (ou `device_ident` en repli), prendre l'événement le plus récent par `created_at`.
- Garder uniquement ceux dont `action = 'ON'` → vraie session encore ouverte côté app.
- Conserver les champs actuels (`since`, `actor_email`, `actor_username`, `actor_sub`, `device_name`, `device_ident`).

Les logs Flespi continuent d'alimenter la **table historique** (colonne "Événement brut" : `code:320`, `subscribe`…) — seul le calcul "sessions actives" est durci.

## Aucun changement

- Pas de migration SQL.
- Pas de modification du `flespi-proxy` (la journalisation `source=app` reste la source de vérité).
- Pas de changement UI : l'encart "Sessions vie privée actives" se videra automatiquement pour ces 2 véhicules dès le prochain refresh.

## Vérification après build

1. Recharger `/admin` → onglet Vie privée.
2. Les deux IMEI ne doivent plus figurer dans "Sessions vie privée actives".
3. Refaire un cycle ON → OFF sur un véhicule test : la session apparaît à `ON`, puis disparaît immédiatement après `OFF`.
