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
  address?: string;
}

export interface VehicleInfo {
  id?: number;
  imei?: string;
  immatriculation?: string;
  privacyEnabled?: boolean;
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
  private?: boolean;
  'gisgraphy.address'?: string;
  ident?: string;
}

export function useFlespiData(refreshInterval: number = 5000) {
  const [vehicleData, setVehicleData] = useState<VehicleData | null>(null);
  const [vehicleInfo, setVehicleInfo] = useState<VehicleInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [targetImei, setTargetImei] = useState<string>();
  const [missingImei, setMissingImei] = useState(false);

  const setImei = useCallback((imei?: string) => {
    setTargetImei(imei?.trim() || undefined);
  }, []);

  const fetchData = useCallback(async () => {
    if (!targetImei) {
      setMissingImei(true);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke('flespi-proxy', {
        body: { imei: targetImei },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.result && data.result.length > 0) {
        const message: FlespiMessage = data.result[0];
        console.info('[Flespi] Raw message:', JSON.stringify(message));
        console.info('[Flespi] Request IMEI:', targetImei, '| Message ident:', message.ident);
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
          address: message['gisgraphy.address'],
        });
        
        // Update privacy status from telemetry message
        const isPrivate = message.private === true;
        setVehicleInfo(prev => prev ? { ...prev, privacyEnabled: isPrivate } : prev);
        
        setLastUpdate(new Date());
        setError(null);
        setMissingImei(false);
        console.info('[Flespi] Telemetry', {
          imei: targetImei,
          latitude: message['position.latitude'],
          longitude: message['position.longitude'],
          speed: message['position.speed'],
          heading: message['position.direction'],
          timestamp: messageTime,
          private: message.private,
          address: message['gisgraphy.address'],
        });
      } else {
        setError('Aucune donnée disponible');
      }
    } catch (err) {
      console.error('[useFlespiData] Error:', err);
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }, [targetImei]);

  const fetchDeviceInfo = useCallback(async () => {
    if (!targetImei) return;

    try {
      const { data: deviceData, error: deviceError } = await supabase.functions.invoke('flespi-proxy', {
        body: { action: 'device-info', imei: targetImei },
      });

      if (deviceError) throw new Error(deviceError.message);

      const info = deviceData?.result?.[0];
      
      setVehicleInfo(prev => ({
        ...prev,
        id: info?.id,
        imei: info?.configuration?.ident,
        immatriculation: info?.name,
        // privacyEnabled is updated by fetchData from telemetry
      }));

      console.info('[Flespi] Device info', {
        deviceId: info?.id,
        imei: info?.configuration?.ident,
        immatriculation: info?.name,
      });
    } catch (err) {
      console.error('[useFlespiData] Device info error:', err);
    }
  }, [targetImei]);

  useEffect(() => {
    fetchData();
    fetchDeviceInfo();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, fetchDeviceInfo, refreshInterval]);

  return {
    vehicleData,
    vehicleInfo,
    loading,
    error,
    lastUpdate,
    refresh: fetchData,
    setImei,
    missingImei,
  };
}
