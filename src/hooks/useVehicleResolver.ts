import { useState, useEffect, useCallback } from 'react';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import { amplifyConfig } from '@/amplify/config';

// ===== Types =====
export type VehicleSource = 'DvD' | 'accessibleVehicles' | 'company' | 'listVehicles' | 'manual' | 'cognito' | 'username' | 'storage';

export interface ResolvedVehicle {
  immat: string;
  nomVehicule?: string | null;
  marque?: string | null;
  imei?: string | null;
  flespiId?: string | null;
  deviceName?: string | null;
  source: VehicleSource;
  companyId?: string | null;
}

export interface VehicleResolverState {
  loading: boolean;
  error: string | null;
  vehicles: ResolvedVehicle[];
  selectedVehicle: ResolvedVehicle | null;
  diagnostics: {
    runId: string;
    sub: string | null;
    stepA_dvd: { count: number; items: string[] };
    stepB_user: { found: boolean; accessibleVehicles: string[] };
    stepC_driver: { found: boolean; companyId: string | null; vehicleCount: number; vehicles: string[] };
    stepD_listVehicles: { attempted: boolean; vehicleCount: number; deviceCount: number; vehicles: string[] };
    errors: string[];
  };
}

// ===== GraphQL Queries =====
const DVD_BY_DRIVER = /* GraphQL */ `
  query DvdsByDriver($sub: String!) {
    dvDSByDvDDriverSub(dvDDriverSub: $sub, limit: 20) {
      items {
        id
        dvDVehicleImmat
        dvDDriverSub
        assignmentDate
        unassignmentDate
      }
    }
  }
`;

const GET_USER = /* GraphQL */ `
  query GetUser($sub: String!) {
    getUser(sub: $sub) {
      sub
      firstname
      lastname
      accessibleVehicles
    }
  }
`;

const GET_DRIVER = /* GraphQL */ `
  query GetDriver($sub: String!) {
    getDriver(sub: $sub) {
      sub
      firstname
      lastname
      companyDriversId
    }
  }
`;

const VEHICLES_BY_COMPANY = /* GraphQL */ `
  query VehiclesByCompany($companyId: ID!) {
    vehiclesByCompanyVehiclesId(companyVehiclesId: $companyId, limit: 50) {
      items {
        immat
        nomVehicule
        marque
        vehicleDeviceImei
      }
    }
  }
`;

const GET_VEHICLE = /* GraphQL */ `
  query GetVehicle($immat: String!) {
    getVehicle(immat: $immat) {
      immat
      nomVehicule
      marque
      vehicleDeviceImei
    }
  }
`;

// ===== Step D: Admin fallback - list all vehicles/devices =====
const LIST_VEHICLES = /* GraphQL */ `
  query ListVehicles($limit: Int) {
    listVehicles(limit: $limit) {
      items {
        immat
        nomVehicule
        marque
        vehicleDeviceImei
        companyVehiclesId
      }
    }
  }
`;

const LIST_DEVICES = /* GraphQL */ `
  query ListDevices($limit: Int) {
    listDevices(limit: $limit) {
      items {
        imei
        name
        flespi_id
        enabled
      }
    }
  }
`;

const GET_DEVICE = /* GraphQL */ `
  query GetDevice($imei: String!) {
    getDevice(imei: $imei) {
      imei
      name
      flespi_id
    }
  }
`;

// ===== Amplify Setup =====
let configured = false;
const ensureAmplifyConfigured = () => {
  if (!configured) {
    Amplify.configure(amplifyConfig);
    configured = true;
  }
};

let client: ReturnType<typeof generateClient> | null = null;
const getClient = () => {
  ensureAmplifyConfigured();
  if (!client) {
    client = generateClient();
  }
  return client;
};

// ===== Helper: Fetch Device by IMEI =====
async function fetchDevice(imei: string): Promise<{ imei: string; name?: string; flespi_id?: string } | null> {
  try {
    console.log('[VehicleResolve] 🔌 Fetching device:', imei);
    const response = await getClient().graphql({
      query: GET_DEVICE,
      variables: { imei },
      authMode: 'userPool',
    });

    const data = 'data' in response ? response.data : null;
    const typedData = data as { getDevice?: { imei: string; name?: string; flespi_id?: string } | null } | null;
    const device = typedData?.getDevice;
    
    console.log('[VehicleResolve] 📱 Device result:', device ? { imei: device.imei, name: device.name, flespiId: device.flespi_id } : 'null');
    return device || null;
  } catch (err) {
    console.error('[VehicleResolve] ❌ Device fetch error:', err);
    return null;
  }
}

// ===== Helper: Fetch Vehicle + Device =====
async function fetchVehicleWithDevice(immat: string, source: VehicleSource, companyId?: string | null): Promise<ResolvedVehicle | null> {
  try {
    console.log('[VehicleResolve] 🚗 Fetching vehicle:', immat);
    const response = await getClient().graphql({
      query: GET_VEHICLE,
      variables: { immat },
      authMode: 'userPool',
    });

    const data = 'data' in response ? response.data : null;
    const typedData = data as { getVehicle?: { immat: string; nomVehicule?: string; marque?: string; vehicleDeviceImei?: string } | null } | null;
    const vehicle = typedData?.getVehicle;

    if (!vehicle) {
      console.warn('[VehicleResolve] ⚠️ Vehicle not found:', immat);
      return null;
    }

    console.log('[VehicleResolve] 🚙 Vehicle found:', { immat: vehicle.immat, name: vehicle.nomVehicule, deviceImei: vehicle.vehicleDeviceImei });

    let device = null;
    if (vehicle.vehicleDeviceImei) {
      device = await fetchDevice(vehicle.vehicleDeviceImei);
    }

    return {
      immat: vehicle.immat,
      nomVehicule: vehicle.nomVehicule,
      marque: vehicle.marque,
      imei: device?.imei || vehicle.vehicleDeviceImei,
      flespiId: device?.flespi_id,
      deviceName: device?.name,
      source,
      companyId,
    };
  } catch (err) {
    console.error('[VehicleResolve] ❌ Vehicle fetch error for', immat, ':', err);
    return null;
  }
}

// ===== Main Hook =====
export function useVehicleResolver(sub: string | undefined, groups: string[] | undefined) {
  const [state, setState] = useState<VehicleResolverState>({
    loading: false,
    error: null,
    vehicles: [],
    selectedVehicle: null,
  diagnostics: {
      runId: '',
      sub: null,
      stepA_dvd: { count: 0, items: [] },
      stepB_user: { found: false, accessibleVehicles: [] },
      stepC_driver: { found: false, companyId: null, vehicleCount: 0, vehicles: [] },
      stepD_listVehicles: { attempted: false, vehicleCount: 0, deviceCount: 0, vehicles: [] },
      errors: [],
    },
  });

  const resolve = useCallback(async () => {
    if (!sub) {
      console.warn('[VehicleResolve] ⚠️ No sub provided, skipping resolution');
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'No user sub available',
        diagnostics: { ...prev.diagnostics, sub: null },
      }));
      return;
    }

    const runId = Date.now().toString(36);
    console.log(`[VehicleResolve] ========== START RUN ${runId} ==========`);
    console.log('[VehicleResolve] 👤 Sub:', sub);
    console.log('[VehicleResolve] 👥 Groups:', JSON.stringify(groups));

    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      vehicles: [],
      selectedVehicle: null,
      diagnostics: {
        runId,
        sub,
        stepA_dvd: { count: 0, items: [] },
        stepB_user: { found: false, accessibleVehicles: [] },
        stepC_driver: { found: false, companyId: null, vehicleCount: 0, vehicles: [] },
        stepD_listVehicles: { attempted: false, vehicleCount: 0, deviceCount: 0, vehicles: [] },
        errors: [],
      },
    }));

    const errors: string[] = [];
    let resolvedVehicles: ResolvedVehicle[] = [];

    // ===== STEP A: DvD by Driver Sub =====
    console.log('[VehicleResolve] 🔍 Step A: Checking DvD assignments...');
    try {
      const dvdResponse = await getClient().graphql({
        query: DVD_BY_DRIVER,
        variables: { sub },
        authMode: 'userPool',
      });

      if ('errors' in dvdResponse && dvdResponse.errors?.length) {
        const errMsg = (dvdResponse.errors as any[])[0]?.message || 'DvD query error';
        console.error('[VehicleResolve] ❌ Step A GraphQL error:', errMsg);
        errors.push(`DvD: ${errMsg}`);
      }

      const dvdData = 'data' in dvdResponse ? dvdResponse.data : null;
      const typedDvdData = dvdData as { dvDSByDvDDriverSub?: { items?: Array<{ id: string; dvDVehicleImmat?: string | null; unassignmentDate?: string | null }> } } | null;
      const dvdItems = typedDvdData?.dvDSByDvDDriverSub?.items?.filter(Boolean) ?? [];

      // Filter active assignments (no unassignment date)
      const activeDvds = dvdItems.filter(d => !d.unassignmentDate && d.dvDVehicleImmat);
      console.log('[VehicleResolve] 📦 Step A result:', JSON.stringify({ total: dvdItems.length, active: activeDvds.length, immats: activeDvds.map(d => d.dvDVehicleImmat) }));

      setState(prev => ({
        ...prev,
        diagnostics: { ...prev.diagnostics, stepA_dvd: { count: activeDvds.length, items: activeDvds.map(d => d.dvDVehicleImmat || '') } },
      }));

      if (activeDvds.length > 0) {
        console.log('[VehicleResolve] ✅ Step A: Found DvD assignments, fetching vehicle details...');
        const vehiclePromises = activeDvds.map(d => fetchVehicleWithDevice(d.dvDVehicleImmat!, 'DvD'));
        const vehicles = (await Promise.all(vehiclePromises)).filter((v): v is ResolvedVehicle => v !== null);
        resolvedVehicles = vehicles;
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'DvD fetch error';
      console.error('[VehicleResolve] ❌ Step A error:', errMsg);
      errors.push(`DvD: ${errMsg}`);
    }

    // ===== STEP B: User.accessibleVehicles (if Step A empty) =====
    if (resolvedVehicles.length === 0) {
      console.log('[VehicleResolve] 🔍 Step B: Checking User.accessibleVehicles...');
      try {
        const userResponse = await getClient().graphql({
          query: GET_USER,
          variables: { sub },
          authMode: 'userPool',
        });

        if ('errors' in userResponse && userResponse.errors?.length) {
          const errMsg = (userResponse.errors as any[])[0]?.message || 'User query error';
          console.error('[VehicleResolve] ❌ Step B GraphQL error:', errMsg);
          errors.push(`User: ${errMsg}`);
        }

        const userData = 'data' in userResponse ? userResponse.data : null;
        const typedUserData = userData as { getUser?: { sub: string; accessibleVehicles?: string[] | null } | null } | null;
        const user = typedUserData?.getUser;
        const accessibleVehicles = user?.accessibleVehicles || [];

        console.log('[VehicleResolve] 📦 Step B result:', JSON.stringify({ found: !!user, accessibleVehicles }));

        setState(prev => ({
          ...prev,
          diagnostics: { ...prev.diagnostics, stepB_user: { found: !!user, accessibleVehicles } },
        }));

        if (accessibleVehicles.length > 0) {
          console.log('[VehicleResolve] ✅ Step B: Found accessible vehicles, fetching details...');
          const vehiclePromises = accessibleVehicles.map(immat => fetchVehicleWithDevice(immat, 'accessibleVehicles'));
          const vehicles = (await Promise.all(vehiclePromises)).filter((v): v is ResolvedVehicle => v !== null);
          resolvedVehicles = vehicles;
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'User fetch error';
        console.error('[VehicleResolve] ❌ Step B error:', errMsg);
        errors.push(`User: ${errMsg}`);
      }
    }

    // ===== STEP C: Driver -> Company -> Vehicles (if Steps A & B empty) =====
    if (resolvedVehicles.length === 0) {
      console.log('[VehicleResolve] 🔍 Step C: Checking Driver -> Company -> Vehicles...');
      try {
        const driverResponse = await getClient().graphql({
          query: GET_DRIVER,
          variables: { sub },
          authMode: 'userPool',
        });

        if ('errors' in driverResponse && driverResponse.errors?.length) {
          const errMsg = (driverResponse.errors as any[])[0]?.message || 'Driver query error';
          console.error('[VehicleResolve] ❌ Step C Driver GraphQL error:', errMsg);
          errors.push(`Driver: ${errMsg}`);
        }

        const driverData = 'data' in driverResponse ? driverResponse.data : null;
        const typedDriverData = driverData as { getDriver?: { sub: string; companyDriversId?: string | null } | null } | null;
        const driver = typedDriverData?.getDriver;
        const companyId = driver?.companyDriversId;

        console.log('[VehicleResolve] 👷 Driver result:', JSON.stringify({ found: !!driver, companyId: companyId ?? null }));

        if (driver && companyId) {
          console.log('[VehicleResolve] 🏢 Fetching vehicles for company:', companyId);

          const vehiclesResponse = await getClient().graphql({
            query: VEHICLES_BY_COMPANY,
            variables: { companyId },
            authMode: 'userPool',
          });

          if ('errors' in vehiclesResponse && vehiclesResponse.errors?.length) {
            const errMsg = (vehiclesResponse.errors as any[])[0]?.message || 'Company vehicles query error';
            console.error('[VehicleResolve] ❌ Step C Vehicles GraphQL error:', errMsg);
            errors.push(`CompanyVehicles: ${errMsg}`);
          }

          const vehiclesData = 'data' in vehiclesResponse ? vehiclesResponse.data : null;
          const typedVehiclesData = vehiclesData as { vehiclesByCompanyVehiclesId?: { items?: Array<{ immat: string; nomVehicule?: string; marque?: string; vehicleDeviceImei?: string }> } } | null;
          const companyVehicles = typedVehiclesData?.vehiclesByCompanyVehiclesId?.items?.filter(Boolean) ?? [];

          console.log('[VehicleResolve] 🚗 Company vehicles:', JSON.stringify({ count: companyVehicles.length, immats: companyVehicles.map(v => v.immat) }));

          setState(prev => ({
            ...prev,
            diagnostics: { ...prev.diagnostics, stepC_driver: { found: true, companyId, vehicleCount: companyVehicles.length, vehicles: companyVehicles.map(v => v.immat) } },
          }));

          if (companyVehicles.length > 0) {
            console.log('[VehicleResolve] ✅ Step C: Found company vehicles, enriching with device info...');
            const enrichedVehicles: ResolvedVehicle[] = await Promise.all(
              companyVehicles.map(async (v) => {
                let device = null;
                if (v.vehicleDeviceImei) {
                  device = await fetchDevice(v.vehicleDeviceImei);
                }
                return {
                  immat: v.immat,
                  nomVehicule: v.nomVehicule,
                  marque: v.marque,
                  imei: device?.imei || v.vehicleDeviceImei,
                  flespiId: device?.flespi_id,
                  deviceName: device?.name,
                  source: 'company' as VehicleSource,
                  companyId,
                };
              })
            );
            resolvedVehicles = enrichedVehicles;
          }
        } else {
          setState(prev => ({
            ...prev,
            diagnostics: { ...prev.diagnostics, stepC_driver: { found: !!driver, companyId: companyId || null, vehicleCount: 0, vehicles: [] } },
          }));
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Driver/Company fetch error';
        console.error('[VehicleResolve] ❌ Step C error:', errMsg);
        errors.push(`Driver/Company: ${errMsg}`);
      }
    }

    // ===== STEP D: Admin fallback - listVehicles + listDevices =====
    if (resolvedVehicles.length === 0 && groups?.includes('admin')) {
      console.log('[VehicleResolve] 🔍 Step D: Admin fallback - listing all vehicles and devices...');
      try {
        // Fetch all vehicles
        const vehiclesResponse = await getClient().graphql({
          query: LIST_VEHICLES,
          variables: { limit: 100 },
          authMode: 'userPool',
        });

        if ('errors' in vehiclesResponse && vehiclesResponse.errors?.length) {
          const errMsg = (vehiclesResponse.errors as any[])[0]?.message || 'listVehicles query error';
          console.error('[VehicleResolve] ❌ Step D listVehicles GraphQL error:', errMsg);
          errors.push(`listVehicles: ${errMsg}`);
        }

        const vehiclesData = 'data' in vehiclesResponse ? vehiclesResponse.data : null;
        const typedVehiclesData = vehiclesData as { listVehicles?: { items?: Array<{ immat: string; nomVehicule?: string; marque?: string; vehicleDeviceImei?: string; companyVehiclesId?: string }> } } | null;
        const allVehicles = typedVehiclesData?.listVehicles?.items?.filter(Boolean) ?? [];

        console.log('[VehicleResolve] 🚗 Step D listVehicles result:', JSON.stringify({ count: allVehicles.length, immats: allVehicles.map(v => v.immat) }));

        // Fetch all devices for mapping
        const devicesResponse = await getClient().graphql({
          query: LIST_DEVICES,
          variables: { limit: 100 },
          authMode: 'userPool',
        });

        if ('errors' in devicesResponse && devicesResponse.errors?.length) {
          const errMsg = (devicesResponse.errors as any[])[0]?.message || 'listDevices query error';
          console.error('[VehicleResolve] ❌ Step D listDevices GraphQL error:', errMsg);
          errors.push(`listDevices: ${errMsg}`);
        }

        const devicesData = 'data' in devicesResponse ? devicesResponse.data : null;
        const typedDevicesData = devicesData as { listDevices?: { items?: Array<{ imei: string; name?: string; flespi_id?: string; enabled?: boolean }> } } | null;
        const allDevices = typedDevicesData?.listDevices?.items?.filter(Boolean) ?? [];

        console.log('[VehicleResolve] 📱 Step D listDevices result:', JSON.stringify({ count: allDevices.length, imeis: allDevices.map(d => d.imei) }));

        // Create device map for quick lookup
        const deviceMap = new Map(allDevices.map(d => [d.imei, d]));

        setState(prev => ({
          ...prev,
          diagnostics: { 
            ...prev.diagnostics, 
            stepD_listVehicles: { 
              attempted: true, 
              vehicleCount: allVehicles.length, 
              deviceCount: allDevices.length, 
              vehicles: allVehicles.map(v => v.immat) 
            } 
          },
        }));

        if (allVehicles.length > 0) {
          console.log('[VehicleResolve] ✅ Step D: Found vehicles via listVehicles, enriching with device info...');
          const enrichedVehicles: ResolvedVehicle[] = allVehicles.map((v) => {
            const device = v.vehicleDeviceImei ? deviceMap.get(v.vehicleDeviceImei) : null;
            return {
              immat: v.immat,
              nomVehicule: v.nomVehicule,
              marque: v.marque,
              imei: device?.imei || v.vehicleDeviceImei,
              flespiId: device?.flespi_id,
              deviceName: device?.name,
              source: 'listVehicles' as VehicleSource,
              companyId: v.companyVehiclesId,
            };
          });
          resolvedVehicles = enrichedVehicles;
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'listVehicles/listDevices fetch error';
        console.error('[VehicleResolve] ❌ Step D error:', errMsg);
        errors.push(`Step D: ${errMsg}`);
      }
    }

    // ===== FINAL RESULT =====
    console.log(`[VehicleResolve] ========== END RUN ${runId} ==========`);
    console.log('[VehicleResolve] 📊 Final result:', JSON.stringify({ vehicleCount: resolvedVehicles.length, sources: resolvedVehicles.map(v => v.source), errors }));

    // Auto-select if only one vehicle
    const selectedVehicle = resolvedVehicles.length === 1 ? resolvedVehicles[0] : null;

    setState(prev => ({
      ...prev,
      loading: false,
      error: errors.length > 0 && resolvedVehicles.length === 0 ? errors.join('; ') : null,
      vehicles: resolvedVehicles,
      selectedVehicle,
      diagnostics: { ...prev.diagnostics, errors },
    }));
  }, [sub, groups]);

  // Run resolution when sub changes
  useEffect(() => {
    if (sub) {
      resolve();
    }
  }, [sub, resolve]);

  // Select a vehicle manually (for multi-vehicle case)
  const selectVehicle = useCallback((immat: string) => {
    setState(prev => {
      const vehicle = prev.vehicles.find(v => v.immat === immat);
      console.log('[VehicleResolve] 🎯 User selected vehicle:', immat, vehicle ? '✅' : '❌');
      return { ...prev, selectedVehicle: vehicle || null };
    });
  }, []);

  return {
    ...state,
    resolve,
    selectVehicle,
  };
}
