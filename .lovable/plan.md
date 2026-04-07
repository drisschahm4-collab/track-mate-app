
Constat

- L’authentification fonctionne : la session replay montre bien le passage du formulaire de connexion vers l’écran “Recherche de vos véhicules…”.
- Le blocage arrive après le login, au moment où l’app essaie de retrouver le véhicule du client.

Source du problème

1. `src/hooks/useVehicleResolver.ts` utilise `listDvDS` puis filtre côté client.
   - C’est fragile et trop coûteux.
2. La recherche est coupée avant la fin.
   - Le code limite à `MAX_ITERATIONS = 25`.
   - Les logs montrent pourtant : `Page 25 ... hasMore: true`.
   - Donc l’app s’arrête alors qu’il reste encore des DvD à lire.
3. La requête DvD inclut `company`, alors que certaines lignes ont une société manquante.
   - Les logs montrent : `Cannot return null for non-nullable type: 'Company' within parent 'DvD'`.
   - Résultat : certaines lignes DvD deviennent `null` et sont supprimées avant le filtre.
4. Le matching actuel est incomplet.
   - Il compare seulement `userSub` et `username`.
   - Or les logs montrent des `dvDDriverSub` de formats différents (UUID, numériques, etc.).
   - Donc il y a probablement une incohérence entre l’identifiant Cognito du client et l’identifiant stocké dans DvD.
5. `src/components/Dashboard.tsx` affiche un faux chargement infini.
   - Quand aucun IMEI n’est trouvé, l’écran continue d’afficher “Veuillez patienter pendant la résolution”.
   - L’utilisateur croit donc que “ça ne se connecte jamais”, alors que la résolution a déjà échoué ou fini sans résultat.

Plan de correction

1. Remplacer la stratégie actuelle par une recherche ciblée sur l’index `dvDSByDvDDriverSub` au lieu de scanner `listDvDS`.
2. Faire une résolution par étapes :
   - essai avec `userSub`
   - essai avec `username`
   - si besoin, essai avec un identifiant métier supplémentaire
3. Retirer `company` de la requête DvD côté frontend, car ce champ n’est pas nécessaire pour retrouver l’IMEI et provoque des pertes de résultats.
4. Supprimer le plafond artificiel des 25 pages si un fallback paginé reste nécessaire.
5. Corriger l’UI dans `Dashboard.tsx` pour afficher 3 états distincts :
   - résolution en cours
   - aucun véhicule trouvé
   - erreur technique
6. Ajouter un fallback visible :
   - message “aucun véhicule assigné”
   - bouton réessayer
   - éventuellement saisie manuelle IMEI

Détails techniques

- Fichiers concernés :
  - `src/hooks/useVehicleResolver.ts`
  - `src/components/Dashboard.tsx`
- Preuves relevées dans le code/logs :
  - `Filtered by sub "...": 0/2489`
  - `Page 25 ... hasMore: true`
  - `Cannot return null for non-nullable type: 'Company'`
- Conclusion :
  - le vrai problème n’est pas la connexion utilisateur,
  - mais une résolution DvD incomplète, plus un écran qui reste bloqué sur un faux état de chargement.
