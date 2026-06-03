import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FLESPI_TOKEN = Deno.env.get('FLESPI_TOKEN');
const ADMIN_PASSWORD = Deno.env.get('ADMIN_PASSWORD');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const PLUGIN_IDS = [
  { id: '1100337', label: 'Vie privée' },
  { id: '1110097', label: 'Erase location' },
];

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    const payload = await req.json().catch(() => ({}));
    const { password, type, limit = 200 } = payload as {
      password?: string;
      type?: 'logins' | 'privacy' | 'verify';
      limit?: number;
    };

    if (!ADMIN_PASSWORD) return json({ error: 'ADMIN_PASSWORD non configuré' }, 500);
    if (!password || password !== ADMIN_PASSWORD) {
      return json({ error: 'Mot de passe invalide' }, 401);
    }

    if (type === 'verify') {
      return json({ ok: true });
    }

    if (type === 'logins') {
      const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
      const { data, error } = await supabase
        .from('login_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(Math.min(Math.max(Number(limit) || 200, 1), 1000));
      if (error) return json({ error: error.message }, 500);
      return json({ items: data });
    }

    if (type === 'privacy') {
      if (!FLESPI_TOKEN) return json({ error: 'FLESPI_TOKEN non configuré' }, 500);

      const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
      const { data: storedEvents, error: storedError } = await supabase
        .from('privacy_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(Math.min(Math.max(Number(limit) || 200, 1), 1000));

      if (storedError) return json({ error: storedError.message }, 500);

      const events: Array<{
        timestamp: number;
        plugin_id: string;
        plugin_label: string;
        device_id?: number;
        device_name?: string;
        device_ident?: string;
        action: 'ON' | 'OFF';
        raw_event: string;
        actor_sub?: string;
        actor_email?: string;
        actor_username?: string;
        actor_ip?: string;
        actor_user_agent?: string;
        source?: string;
      }> = [];

      const deviceCache = new Map<number, { name?: string; ident?: string }>();

      for (const event of storedEvents ?? []) {
        const storedDeviceId = event.device_id ? Number(event.device_id) : undefined;
        events.push({
          timestamp: Math.floor(new Date(event.created_at).getTime() / 1000),
          plugin_id: event.plugin_id,
          plugin_label: event.plugin_label,
          device_id: storedDeviceId,
          device_name: event.device_name ?? undefined,
          device_ident: event.device_ident ?? undefined,
          action: event.action as 'ON' | 'OFF',
          raw_event: event.source || 'app',
          actor_sub: event.actor_sub ?? undefined,
          actor_email: event.actor_email ?? undefined,
          actor_username: event.actor_username ?? undefined,
          actor_ip: event.actor_ip ?? undefined,
          actor_user_agent: event.actor_user_agent ?? undefined,
          source: event.source ?? 'app',
        });
        if (storedDeviceId && !deviceCache.has(storedDeviceId)) {
          deviceCache.set(storedDeviceId, { ident: event.device_ident ?? undefined });
        }
      }

      for (const plugin of PLUGIN_IDS) {
        const logsUrl = `https://flespi.io/gw/plugins/${plugin.id}/logs?data=${encodeURIComponent(
          JSON.stringify({ count: Math.min(Number(limit) || 200, 1000), reverse: true }),
        )}`;

        const res = await fetch(logsUrl, {
          headers: { Authorization: `FlespiToken ${FLESPI_TOKEN}` },
        });
        const body = await res.json();
        if (!res.ok) {
          console.error(`[admin-history] plugin ${plugin.id} logs error`, body);
          continue;
        }

        const entries = body.result ?? [];
        if (entries.length > 0) {
          console.log(`[admin-history] plugin ${plugin.id} sample entry`, JSON.stringify(entries[0]));
        }

        for (const entry of entries) {
          const evName = String(entry.event_name || '').toLowerCase();
          const evCode: number | undefined =
            typeof entry.event_code === 'number'
              ? entry.event_code
              : typeof entry.event === 'number'
                ? entry.event
                : undefined;

          let action: 'ON' | 'OFF' | 'SKIP' = 'SKIP';

          // Codes Flespi pour les plugins :
          //   320 = device subscribed (ON)
          //   321 = device unsubscribed (OFF)
          //   322 = subscription updated → considéré ON (POST fields)
          //   323 = unsubscribe variant (OFF)
          //   350/351 = traitement message (ignoré)
          if (evCode === 320 || evCode === 322) action = 'ON';
          else if (evCode === 321 || evCode === 323) action = 'OFF';
          // Fallback générique (anciens codes éventuels)
          else if (evCode === 1 || evCode === 4) action = 'ON';
          else if (evCode === 3 || evCode === 5) action = 'OFF';
          // Mapping par mots-clés texte
          else if (/\b(unassign|unlink|detach|unsubscribe)\b/.test(evName)) action = 'OFF';
          else if (/\b(delete|remove)\b/.test(evName)) action = 'OFF';
          else if (/\b(assign|link|attach|subscribe|add|create)\b/.test(evName)) action = 'ON';

          if (action === 'SKIP') continue;

          const deviceId: number | undefined =
            entry.device_id ?? entry.item_id ?? entry.target_id ?? undefined;

          events.push({
            timestamp: entry.timestamp ?? entry.date ?? 0,
            plugin_id: plugin.id,
            plugin_label: plugin.label,
            device_id: deviceId,
            action,
            raw_event: evName || (evCode !== undefined ? `code:${evCode}` : 'unknown'),
          });

          if (deviceId && !deviceCache.has(deviceId)) {
            deviceCache.set(deviceId, {});
          }
        }
      }

      // Enrichir les devices (best effort, en parallèle)
      await Promise.all(
        Array.from(deviceCache.keys()).map(async (id) => {
          try {
            const r = await fetch(
              `https://flespi.io/gw/devices/${id}?fields=id,name,configuration`,
              { headers: { Authorization: `FlespiToken ${FLESPI_TOKEN}` } },
            );
            const d = await r.json();
            const item = d?.result?.[0];
            if (item) {
              deviceCache.set(id, {
                name: item.name,
                ident: item.configuration?.ident,
              });
            }
          } catch (_) {
            // ignore
          }
        }),
      );

      const enriched = events
        .map((e) => ({
          ...e,
          device_name: e.device_id ? deviceCache.get(e.device_id)?.name : e.device_name,
          device_ident: e.device_id ? deviceCache.get(e.device_id)?.ident : e.device_ident,
        }))
        .sort((a, b) => b.timestamp - a.timestamp);

      // Compute active privacy sessions UNIQUEMENT à partir des événements stockés en DB
      // (source fiable = 'app' / 'app-backfill'). Les logs Flespi sont bruyants
      // (codes 320/322 réémis tardivement) et provoquaient des faux positifs.
      const mainPluginId = PLUGIN_IDS[0].id;
      const latestByDeviceDb = new Map<string, typeof enriched[number]>();
      for (const ev of enriched) {
        if (ev.plugin_id !== mainPluginId) continue;
        if (!ev.source || (ev.source !== 'app' && ev.source !== 'app-backfill')) continue;
        const key = String(ev.device_id ?? ev.device_ident ?? '');
        if (!key) continue;
        if (!latestByDeviceDb.has(key)) latestByDeviceDb.set(key, ev);
      }
      const activeSessions = Array.from(latestByDeviceDb.values())
        .filter((ev) => ev.action === 'ON')
        .map((ev) => ({
          device_id: ev.device_id,
          device_name: ev.device_name,
          device_ident: ev.device_ident,
          since: ev.timestamp,
          actor_email: ev.actor_email,
          actor_username: ev.actor_username,
          actor_sub: ev.actor_sub,
        }))
        .sort((a, b) => a.since - b.since);


      return json({ items: enriched, activeSessions });
    }

    return json({ error: 'type invalide (logins | privacy | verify)' }, 400);
  } catch (e) {
    console.error('[admin-history] error', e);
    return json({ error: e instanceof Error ? e.message : 'Erreur interne' }, 500);
  }
});
