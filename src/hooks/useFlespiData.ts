import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface VehicleData {
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  timestamp: number;
  isOnline: boolean;
  batteryLevel?: number;
  ignition?: boolean;
  altitude?: number;
}

export interface FlespiMessage {
  'position.latitude'?: number;
  'position.longitude'?: number;
  'position.speed'?: number;
  'position.direction'?: number;
  'position.altitude'?: number;
  timestamp?: number;
  'battery.level'?: number;
  'engine.ignition.status'?: boolean;
  server_timestamp?: number;
}

export function useFlespiData(refreshInterval: number = 5000) {
  const [vehicleData, setVehicleData] = useState<VehicleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('flespi-proxy', {
        body: {},
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.result && data.result.length > 0) {
        const message: FlespiMessage = data.result[0];
        const now = Date.now() / 1000;
        const messageTime = message.timestamp || message.server_timestamp || 0;
        const isOnline = (now - messageTime) < 300; // 5 minutes threshold

        setVehicleData({
          latitude: message['position.latitude'] || 0,
          longitude: message['position.longitude'] || 0,
          speed: message['position.speed'] || 0,
          heading: message['position.direction'] || 0,
          altitude: message['position.altitude'] || 0,
          timestamp: messageTime,
          isOnline,
          batteryLevel: message['battery.level'],
          ignition: message['engine.ignition.status'],
        });
        setLastUpdate(new Date());
        setError(null);
      } else {
        setError('Aucune donnée disponible');
      }
    } catch (err) {
      console.error('[useFlespiData] Error:', err);
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  return { vehicleData, loading, error, lastUpdate, refresh: fetchData };
}
