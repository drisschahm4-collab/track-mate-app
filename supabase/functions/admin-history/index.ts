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

      const events: Array<{
        timestamp: number;
        plugin_id: string;
        plugin_label: string;
        device_id?: number;
        device_name?: string;
        device_ident?: string;
        action: 'ON' | 'OFF' | 'OTHER';
        raw_event: string;
      }> = [];

      const deviceCache = new Map<number, { name?: string; ident?: string }>();

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

        for (const entry of body.result ?? []) {
          const ev = String(entry.event || entry.event_name || '').toLowerCase();
          let action: 'ON' | 'OFF' | 'OTHER' = 'OTHER';
          if (ev.includes('assign') && !ev.includes('un')) action = 'ON';
          else if (ev.includes('unassign') || ev.includes('delete')) action = 'OFF';
          else if (ev.includes('create')) action = 'ON';
          else if (ev.includes('remove')) action = 'OFF';

          const deviceId: number | undefined =
            entry.device_id ?? entry.item_id ?? entry.target_id ?? undefined;

          events.push({
            timestamp: entry.timestamp ?? entry.date ?? 0,
            plugin_id: plugin.id,
            plugin_label: plugin.label,
            device_id: deviceId,
            action,
            raw_event: ev || 'unknown',
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
          device_name: e.device_id ? deviceCache.get(e.device_id)?.name : undefined,
          device_ident: e.device_id ? deviceCache.get(e.device_id)?.ident : undefined,
        }))
        .sort((a, b) => b.timestamp - a.timestamp);

      return json({ items: enriched });
    }

    return json({ error: 'type invalide (logins | privacy | verify)' }, 400);
  } catch (e) {
    console.error('[admin-history] error', e);
    return json({ error: e instanceof Error ? e.message : 'Erreur interne' }, 500);
  }
});
