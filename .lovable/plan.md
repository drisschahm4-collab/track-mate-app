# Corriger le mapping ON/OFF des logs Flespi

## Changements dans `supabase/functions/admin-history/index.ts`

1. **Lire `event_name` en priorité** sur `event` (qui est souvent un code numérique chez Flespi).
2. **Ajouter le mapping des codes numériques** des plugin logs Flespi :
   - `1` (create) / `4` (link) → **ON**
   - `3` (delete) / `5` (unlink) → **OFF**
   - `2` (update) → ignoré (pas une bascule)
3. **Élargir les mots-clés texte** : `link`, `unlink`, `attach`, `detach`, `add`, `remove`, `subscribe`, `unsubscribe`, en plus de `assign`/`unassign`.
4. **Filtrer le bruit** : ne garder dans la liste finale que les évènements classés ON ou OFF (les updates de config ne sont pas des bascules vie privée).
5. **Logger la 1ʳᵉ entrée brute** reçue de chaque plugin (`console.log`) pour pouvoir affiner si Flespi utilise d'autres codes propriétaires.

## Changement UI dans `src/pages/Admin.tsx`

- Remplacer le badge `unknown` ambigu par "Autre" en gris (au cas où il resterait des évènements non classés après filtrage).

## Hors scope

- Pas de nouvelle table, pas de changement de route, pas de modif backend autre que la fonction `admin-history`.
