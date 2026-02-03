

## Plan : Ajouter le plugin 1110097 (Erase location) au toggle vie privée

### Contexte

Actuellement, quand on toggle la vie privée :
- **Plugin 1100337** : "Vie Privée" → véhicule assigné avec `private: true/false`

Tu veux ajouter :
- **Plugin 1110097** : "Vie Privée - Erase location" → véhicule assigné/retiré en même temps

### Logique

| Action | Plugin 1100337 | Plugin 1110097 |
|--------|----------------|----------------|
| Activer vie privée | POST avec `private: true` | POST (assigner le device) |
| Désactiver vie privée | POST avec `private: false` | DELETE (retirer le device) |

### Modifications

#### 1. Edge Function (`supabase/functions/flespi-proxy/index.ts`)

Ajouter une constante pour le second plugin :
```typescript
const PLUGIN_ID = '1100337';
const ERASE_PLUGIN_ID = '1110097';  // Nouveau
```

Modifier le case `assign-privacy` pour :
1. Appeler le plugin 1100337 (existant)
2. Appeler le plugin 1110097 :
   - Si `private: true` → POST pour assigner
   - Si `private: false` → DELETE pour retirer

### Détails techniques

```text
┌─────────────────┐
│  Toggle Privacy │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Edge Function: assign-privacy  │
└────────┬───────────────┬────────┘
         │               │
         ▼               ▼
┌─────────────────┐ ┌─────────────────────┐
│ Plugin 1100337  │ │ Plugin 1110097      │
│ POST private=X  │ │ POST (on) / DEL (off)│
└─────────────────┘ └─────────────────────┘
```

### Fichiers modifiés

| Fichier | Modification |
|---------|--------------|
| `supabase/functions/flespi-proxy/index.ts` | Ajouter appel au plugin 1110097 dans `assign-privacy` |

### Résultat attendu

- **Activer** : Les deux plugins reçoivent le device
- **Désactiver** : Plugin 1100337 reçoit `private: false`, Plugin 1110097 retire le device

