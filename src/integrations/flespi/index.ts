import { supabase } from "@/integrations/supabase/client";

type FlespiApiResult<T = unknown> = {
  result?: T[];
  errors?: unknown;
} & Record<string, unknown>;

export interface FlespiDevice {
  id: number;
  name?: string;
  cid?: number;
  configuration?: Record<string, unknown>;
}

export const findDeviceIdByImei = async (imei: string): Promise<number | null> => {
  const { data, error } = await supabase.functions.invoke<FlespiApiResult<FlespiDevice>>("flespi-proxy", {
    body: { action: "find-device", imei },
  });

  if (error) {
    throw error;
  }

  const device = data?.result?.[0];
  return device?.id ?? null;
};

export const assignPrivacyPlugin = async (params: { deviceId?: number; imei?: string; private?: boolean }) => {
  const { data, error } = await supabase.functions.invoke("flespi-proxy", {
    body: {
      action: "assign-privacy",
      deviceId: params.deviceId,
      imei: params.imei,
      private: params.private,
    },
  });

  if (error) {
    throw error;
  }

  return data;
};

export const verifyPrivacyAssignment = async (deviceId: number) => {
  const { data, error } = await supabase.functions.invoke<FlespiApiResult>("flespi-proxy", {
    body: {
      action: "device-info",
      deviceId,
    },
  });

  if (error) {
    throw error;
  }

  return data?.result?.[0]?.plugins ?? null;
};
