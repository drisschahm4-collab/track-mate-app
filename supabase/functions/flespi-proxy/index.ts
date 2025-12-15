import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const FLESPI_TOKEN = Deno.env.get('FLESPI_TOKEN');
const PLUGIN_ID = '1100337';
const DEVICE_ID = '5369063';

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
    const action = url.searchParams.get('action') || 'device-data';

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

    switch (action) {
      case 'device-data':
        // Get latest messages from device
        flespiUrl = `https://flespi.io/gw/devices/${DEVICE_ID}/messages?data={"count":1}`;
        break;
      
      case 'device-telemetry':
        // Get device telemetry (current state)
        flespiUrl = `https://flespi.io/gw/devices/${DEVICE_ID}/telemetry/all`;
        break;

      case 'device-info':
        // Get device info
        flespiUrl = `https://flespi.io/gw/devices/${DEVICE_ID}`;
        break;

      case 'plugin-execute':
        // Execute plugin command on device
        flespiUrl = `https://flespi.io/gw/plugins/${PLUGIN_ID}/devices/${DEVICE_ID}`;
        method = 'POST';
        const reqBody = await req.json().catch(() => ({}));
        body = JSON.stringify(reqBody);
        break;

      case 'history':
        // Get message history (last hour)
        const from = Math.floor(Date.now() / 1000) - 3600;
        const to = Math.floor(Date.now() / 1000);
        flespiUrl = `https://flespi.io/gw/devices/${DEVICE_ID}/messages?data={"from":${from},"to":${to}}`;
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
