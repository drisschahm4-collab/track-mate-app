import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/api";
import { amplifyConfig } from "@/amplify/config";

type DvdItem = {
  id: string;
  dvDVehicleImmat?: string | null;
  dvDDriverSub?: string | null;
  assignmentDate?: string | null;
  unassignmentDate?: string | null;
  vehicle?: {
    immat: string;
    nomVehicule?: string | null;
    marque?: string | null;
    device?: {
      imei: string;
      name?: string | null;
    } | null;
  } | null;
};

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

const GET_VEHICLE_WITH_DEVICE = /* GraphQL */ `
  query GetVehicle($immat: String!) {
    getVehicle(immat: $immat) {
      immat
      nomVehicule
      marque
      realImmat
      vehicleDeviceImei
    }
  }
`;

const GET_DEVICE = /* GraphQL */ `
  query GetDevice($imei: String!) {
    getDevice(imei: $imei) {
      imei
      name
    }
  }
`;

export async function fetchDvdByDriverSub(sub: string): Promise<DvdItem[]> {
  console.log('[DvD API] 🔍 Fetching DvD for driver sub:', sub);

  // Étape 1: Récupérer les DvDs
  const dvdResponse = await getClient().graphql({
    query: DVD_BY_DRIVER,
    variables: { sub },
    authMode: "userPool",
  });

  console.log('[DvD API] 📦 Raw DvD response:', JSON.stringify(dvdResponse, null, 2));

  const dvdData = 'data' in dvdResponse ? dvdResponse.data : null;
  const typedDvdData = dvdData as { dvDSByDvDDriverSub?: { items?: Array<{
    id: string;
    dvDVehicleImmat?: string | null;
    dvDDriverSub?: string | null;
    assignmentDate?: string | null;
    unassignmentDate?: string | null;
  }> } } | null;

  const dvdItems = typedDvdData?.dvDSByDvDDriverSub?.items?.filter(Boolean) ?? [];
  console.log('[DvD API] ✅ DvD items count:', dvdItems.length);

  // Si pas de DvD, fallback sur User.accessibleVehicles
  if (dvdItems.length === 0) {
    console.warn('[DvD API] ⚠️ No DvD entries - checking User.accessibleVehicles...');

    try {
      const userResponse = await getClient().graphql({
        query: GET_USER,
        variables: { sub },
        authMode: "userPool",
      });

      console.log('[DvD API] 📦 User response:', JSON.stringify(userResponse, null, 2));

      const userData = 'data' in userResponse ? userResponse.data : null;
      const typedUserData = userData as { getUser?: {
        sub: string;
        firstname?: string | null;
        lastname?: string | null;
        accessibleVehicles?: string[] | null;
      } | null } | null;

      const user = typedUserData?.getUser;
      const accessibleVehicles = user?.accessibleVehicles || [];

      console.log('[DvD API] 🚗 Accessible vehicles:', accessibleVehicles);

      if (accessibleVehicles.length === 0) {
        console.warn('[DvD API] ⚠️ No accessible vehicles - driver has no assigned vehicle');
        return [];
      }

      // Créer des "pseudo-DvD" à partir des véhicules accessibles
      const pseudoDvdItems = accessibleVehicles.map((immat) => ({
        id: `pseudo-${sub}-${immat}`,
        dvDVehicleImmat: immat,
        dvDDriverSub: sub,
        assignmentDate: null,
        unassignmentDate: null,
      }));

      console.log('[DvD API] ✅ Created pseudo-DvD from accessible vehicles:', pseudoDvdItems.length);

      // Continuer avec les pseudo-DvD
      const enrichedFromUser = await enrichDvdItems(pseudoDvdItems);
      return enrichedFromUser;
    } catch (userErr) {
      console.error('[DvD API] ❌ Error fetching user:', userErr);
      return [];
    }
  }

  // Enrichir les DvD normaux
  const enrichedItems = await enrichDvdItems(dvdItems);
  return enrichedItems;
}

// Fonction helper pour enrichir les items DvD avec Vehicle et Device
async function enrichDvdItems(
  dvdItems: Array<{
    id: string;
    dvDVehicleImmat?: string | null;
    dvDDriverSub?: string | null;
    assignmentDate?: string | null;
    unassignmentDate?: string | null;
  }>
): Promise<DvdItem[]> {
  const enrichedItems: DvdItem[] = await Promise.all(
    dvdItems.map(async (dvdItem) => {
      if (!dvdItem.dvDVehicleImmat) {
        console.warn('[DvD API] ⚠️ DvD entry has no vehicle immat:', dvdItem.id);
        return dvdItem;
      }

      try {
        console.log('[DvD API] 🚗 Fetching vehicle:', dvdItem.dvDVehicleImmat);

        const vehicleResponse = await getClient().graphql({
          query: GET_VEHICLE_WITH_DEVICE,
          variables: { immat: dvdItem.dvDVehicleImmat },
          authMode: "userPool",
        });

        console.log('[DvD API] 📦 Vehicle response for', dvdItem.dvDVehicleImmat, ':', JSON.stringify(vehicleResponse, null, 2));

        const vehicleData = 'data' in vehicleResponse ? vehicleResponse.data : null;
        const typedVehicleData = vehicleData as { getVehicle?: {
          immat: string;
          nomVehicule?: string | null;
          marque?: string | null;
          realImmat?: string | null;
          vehicleDeviceImei?: string | null;
        } | null } | null;

        const vehicle = typedVehicleData?.getVehicle;

        if (!vehicle) {
          console.warn('[DvD API] ⚠️ Vehicle not found:', dvdItem.dvDVehicleImmat);
          return dvdItem;
        }

        // Étape 3: Si le véhicule a un device IMEI, récupérer le device
        let device = null;
        if (vehicle.vehicleDeviceImei) {
          console.log('[DvD API] 🔌 Fetching device:', vehicle.vehicleDeviceImei);

          try {
            const deviceResponse = await getClient().graphql({
              query: GET_DEVICE,
              variables: { imei: vehicle.vehicleDeviceImei },
              authMode: "userPool",
            });

            console.log('[DvD API] 📦 Device response:', JSON.stringify(deviceResponse, null, 2));

            const deviceData = 'data' in deviceResponse ? deviceResponse.data : null;
            const typedDeviceData = deviceData as { getDevice?: {
              imei: string;
              name?: string | null;
            } | null } | null;

            device = typedDeviceData?.getDevice || null;
          } catch (deviceErr) {
            console.error('[DvD API] ❌ Error fetching device', vehicle.vehicleDeviceImei, ':', deviceErr);
          }
        } else {
          console.warn('[DvD API] ⚠️ Vehicle has no device IMEI:', dvdItem.dvDVehicleImmat);
        }

        return {
          ...dvdItem,
          vehicle: {
            immat: vehicle.immat,
            nomVehicule: vehicle.nomVehicule,
            marque: vehicle.marque,
            device,
          },
        };
      } catch (err) {
        console.error('[DvD API] ❌ Error fetching vehicle', dvdItem.dvDVehicleImmat, ':', err);
        return dvdItem;
      }
    })
  );

  console.log('[DvD API] 📋 Final enriched items:', JSON.stringify(enrichedItems, null, 2));

  return enrichedItems;
}

