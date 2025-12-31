import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const FLESPI_TOKEN = Deno.env.get('FLESPI_TOKEN');
const PLUGIN_ID = '1100337';
const DEFAULT_DEVICE_ID = Deno.env.get('FLESPI_DEVICE_ID') || '5369063';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const payload = await req.json().catch(() => undefined);
    const action = url.searchParams.get('action') || payload?.action || 'device-data';
    const imei = url.searchParams.get('imei') || payload?.imei;
    const desiredPrivacy = payload?.private;
    const overrideDeviceId = url.searchParams.get('deviceId') || payload?.deviceId;

    console.log(`[Flespi Proxy] Action: ${action}`);

    if (!FLESPI_TOKEN) {
      console.error('[Flespi Proxy] FLESPI_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'FLESPI_TOKEN not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let flespiUrl: string;
    let method = 'GET';
    let body: string | undefined;

    const resolveDeviceId = async (): Promise<string> => {
      if (overrideDeviceId) return overrideDeviceId;
      if (!imei) {
        throw new Response(
          JSON.stringify({ error: 'IMEI required for device lookup' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const encodedIdent = encodeURIComponent(`"${imei}"`);
      const lookupUrl = `https://flespi.io/gw/devices/configuration.ident=${encodedIdent}?fields=id`;
      const lookup = await fetch(lookupUrl, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `FlespiToken ${FLESPI_TOKEN}`,
        },
      });

      const lookupData = await lookup.json();
      const foundId = lookupData?.result?.[0]?.id;
      if (!foundId) {
        throw new Response(
          JSON.stringify({ error: 'Device not found for provided IMEI' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return String(foundId);
    };

    const needsResolvedDevice = ['device-data', 'device-telemetry', 'device-info', 'plugin-execute', 'history'].includes(action);
    const deviceId = needsResolvedDevice ? await resolveDeviceId() : (overrideDeviceId || DEFAULT_DEVICE_ID);

    switch (action) {
      case 'device-data':
        // Get latest messages from device
        flespiUrl = `https://flespi.io/gw/devices/${deviceId}/messages?data={"count":1}`;
        break;
      
      case 'device-telemetry':
        // Get device telemetry (current state)
        flespiUrl = `https://flespi.io/gw/devices/${deviceId}/telemetry/all`;
        break;

      case 'device-info':
        // Get device info (include plugins to know privacy state)
        flespiUrl = `https://flespi.io/gw/devices/${deviceId}?fields=id,name,configuration,plugins`;
        break;

      case 'plugin-execute':
        // Execute plugin command on device
        flespiUrl = `https://flespi.io/gw/plugins/${PLUGIN_ID}/devices/${deviceId}`;
        method = 'POST';
        body = JSON.stringify(payload || {});
        break;

      case 'find-device': {
        if (!imei) {
          return new Response(
            JSON.stringify({ error: 'Missing IMEI' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const encodedIdent = encodeURIComponent(`"${imei}"`);
        flespiUrl = `https://flespi.io/gw/devices/configuration.ident=${encodedIdent}?fields=id,name,cid,configuration`;
        break;
      }

      case 'assign-privacy': {
        const deviceSelector = overrideDeviceId || (imei ? `configuration.ident=${encodeURIComponent(`"${imei}"`)}` : undefined);
        if (!deviceSelector) {
          return new Response(
            JSON.stringify({ error: 'Missing deviceId or IMEI for privacy assignment' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const privateField = typeof desiredPrivacy === 'boolean' ? desiredPrivacy : true;
        flespiUrl = `https://flespi.io/gw/plugins/${PLUGIN_ID}/devices/${deviceSelector}`;
        method = 'POST';
        body = JSON.stringify({ fields: { private: privateField } });
        break;
      }

      case 'history':
        // Get message history (last hour)
        const from = Math.floor(Date.now() / 1000) - 3600;
        const to = Math.floor(Date.now() / 1000);
        flespiUrl = `https://flespi.io/gw/devices/${deviceId}/messages?data={"from":${from},"to":${to}}`;
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    console.log(`[Flespi Proxy] Calling: ${method} ${flespiUrl}`);

    const flespiResponse = await fetch(flespiUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `FlespiToken ${FLESPI_TOKEN}`,
      },
      body: method === 'POST' ? body : undefined,
    });

    const data = await flespiResponse.json();
    
    console.log(`[Flespi Proxy] Response status: ${flespiResponse.status}`);

    if (!flespiResponse.ok) {
      console.error('[Flespi Proxy] Flespi API error:', data);
      return new Response(
        JSON.stringify({ error: 'Flespi API error', details: data }),
        { status: flespiResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[Flespi Proxy] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
