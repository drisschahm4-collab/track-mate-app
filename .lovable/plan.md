

## Plan : Supprimer le device des deux plugins lors de la désactivation

### Problème actuel

| Action | Plugin 1100337 | Plugin 1110097 |
|--------|----------------|----------------|
| Activer | POST (assigner + private=true) | POST (assigner) |
| Désactiver | POST (private=false) ❌ | DELETE ✅ |

Le plugin 1100337 garde le device assigné avec `private=false` au lieu de le supprimer.

### Nouvelle logique souhaitée

| Action | Plugin 1100337 | Plugin 1110097 |
|--------|----------------|----------------|
| Activer | POST (assigner + private=true) | POST (assigner) |
| Désactiver | **DELETE** (retirer) | DELETE (retirer) |

### Modification

**Fichier** : `supabase/functions/flespi-proxy/index.ts`

**Ligne 170-181** - Changer la logique du plugin principal :

```typescript
// AVANT
const mainPluginUrl = `https://flespi.io/gw/plugins/${PLUGIN_ID}/devices/${deviceSelector}`;
const mainResponse = await fetch(mainPluginUrl, {
  method: 'POST',
  body: JSON.stringify({ fields: { private: privateField } }),
});

// APRÈS
const mainPluginUrl = `https://flespi.io/gw/plugins/${PLUGIN_ID}/devices/${deviceSelector}`;
const mainMethod = privateField ? 'POST' : 'DELETE';
const mainResponse = await fetch(mainPluginUrl, {
  method: mainMethod,
  body: mainMethod === 'POST' ? JSON.stringify({ fields: { private: true } }) : undefined,
});
```

### Détails techniques

```text
┌─────────────────────┐
│  Désactiver Privacy │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────┐
│  Edge Function: assign-privacy  │
│  private = false                │
└──────────┬──────────────────────┘
           │
     ┌─────┴─────┐
     ▼           ▼
┌─────────┐  ┌─────────┐
│ 1100337 │  │ 1110097 │
│ DELETE  │  │ DELETE  │
└─────────┘  └─────────┘
```

### Résultat attendu

- **Activer** : Les deux plugins reçoivent le device (POST)
- **Désactiver** : Les deux plugins retirent le device (DELETE)

