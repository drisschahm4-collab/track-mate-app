import { useState, useEffect, useCallback, useMemo } from 'react';
import { generateClient } from 'aws-amplify/api';

// Requête ciblée par index dvDSByDvDDriverSub — sans le champ company (non-nullable, cause des nulls)
const DVD_BY_DRIVER_SUB = /* GraphQL */ `
  query DvDSByDvDDriverSub($dvDDriverSub: String!, $nextToken: String) {
    dvDSByDvDDriverSub(dvDDriverSub: $dvDDriverSub, nextToken: $nextToken) {
      items {
        id
        dvDVehicleImmat
        dvDDriverSub
        assignmentDate
        unassignmentDate
        dvDCompanyId
        vehicle {
          immat
          nomVehicule
          marque
          modele_id
          vehicleDeviceImei
          companyVehiclesId
          VIN
          couleur
          energie
          kilometerage
          year
          AWN_model_image
          AWN_url_image
        }
        driver {
          sub
          username
          firstname
          lastname
          email
          mobile
          companyDriversId
        }
      }
      nextToken
    }
  }
`;

// Requête pour trouver le Driver par username via listDrivers + filter
const LIST_DRIVERS_BY_USERNAME = /* GraphQL */ `
  query ListDriversByUsername($filter: ModelDriverFilterInput) {
    listDrivers(filter: $filter, limit: 10) {
      items {
        sub
        username
      }
    }
  }
`;

export interface DvDVehicle {
  immat: string;
  nomVehicule?: string;
  marque?: string;
  modele_id?: string;
  vehicleDeviceImei?: string;
  companyVehiclesId?: string;
  VIN?: string;
  couleur?: string;
  energie?: string;
  kilometerage?: number;
  year?: number;
  AWN_model_image?: string;
  AWN_url_image?: string;
}

export interface DvDDriver {
  sub: string;
  username?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  mobile?: string;
  companyDriversId?: string;
}

export interface DvDCompany {
  id: string;
  name?: string;
}

export interface DvDRecord {
  id: string;
  dvDVehicleImmat: string;
  dvDDriverSub: string;
  assignmentDate?: string;
  unassignmentDate?: string;
  dvDCompanyId?: string;
  vehicle?: DvDVehicle;
  driver?: DvDDriver;
  company?: DvDCompany;
}

interface UseVehicleResolverResult {
  vehicles: DvDVehicle[];
  imeis: string[];
  dvds: DvDRecord[];
  loading: boolean;
  error: string | null;
  totalFetched: number;
  refresh: () => void;
}

/**
 * Fetch all DvD records for a given driverSub using the GSI index (no full-scan).
 * Paginates without artificial limit.
 */
async function fetchDvDsByDriverSub(
  client: ReturnType<typeof generateClient>,
  driverSub: string
): Promise<DvDRecord[]> {
  const all: DvDRecord[] = [];
  let nextToken: string | null = null;
  let page = 0;

  console.log(`[DvD] Querying index dvDSByDvDDriverSub for "${driverSub}"`);

  do {
    try {
      const response = await client.graphql({
        query: DVD_BY_DRIVER_SUB,
        variables: { dvDDriverSub: driverSub, nextToken },
        authMode: 'userPool',
      }) as { data: { dvDSByDvDDriverSub: { items: DvDRecord[]; nextToken: string | null } }; errors?: any[] };

      if (response.errors?.length) {
        console.warn(`[DvD] Partial errors page ${page + 1}:`, response.errors);
      }

      const items = (response.data?.dvDSByDvDDriverSub?.items || []).filter(Boolean);
      all.push(...items);
      nextToken = response.data?.dvDSByDvDDriverSub?.nextToken || null;
      page++;
      console.log(`[DvD] Page ${page}: ${items.length} items, total: ${all.length}, hasMore: ${!!nextToken}`);
    } catch (err: any) {
      if (err?.data?.dvDSByDvDDriverSub?.items) {
        const items = (err.data.dvDSByDvDDriverSub.items || []).filter(Boolean);
        all.push(...items);
        nextToken = err.data.dvDSByDvDDriverSub.nextToken || null;
        page++;
      } else {
        console.error(`[DvD] Error fetching page ${page + 1}:`, err);
        throw err;
      }
    }
  } while (nextToken);

  return all;
}

/**
 * Filter to only active assignments (no unassignmentDate).
 */
function filterActive(records: DvDRecord[]): DvDRecord[] {
  return records.filter((r) => !r.unassignmentDate);
}

export const useVehicleResolver = (userSub: string | undefined, username?: string): UseVehicleResolverResult => {
  const [vehicles, setVehicles] = useState<DvDVehicle[]>([]);
  const [imeis, setImeis] = useState<string[]>([]);
  const [dvds, setDvds] = useState<DvDRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalFetched, setTotalFetched] = useState(0);

  const client = useMemo(() => generateClient(), []);

  const resolveVehicles = useCallback(async (targetSub: string, targetUsername?: string) => {
    setLoading(true);
    setError(null);

    try {
      // Étape 1 : recherche par sub (UUID Cognito)
      let active = filterActive(await fetchDvDsByDriverSub(client, targetSub));
      console.log(`[DvD] Step 1 (sub="${targetSub}"): ${active.length} active`);

      // Étape 2 : si rien trouvé, essayer par username
      if (active.length === 0 && targetUsername && targetUsername !== targetSub) {
        active = filterActive(await fetchDvDsByDriverSub(client, targetUsername));
        console.log(`[DvD] Step 2 (username="${targetUsername}"): ${active.length} active`);
      }

      // Étape 3 : si toujours rien, chercher le Driver par username pour récupérer son sub interne
      if (active.length === 0 && targetUsername) {
        console.log(`[DvD] Step 3: Looking up Driver by username "${targetUsername}"...`);
        try {
          const driverResponse = await client.graphql({
            query: LIST_DRIVERS_BY_USERNAME,
            variables: { filter: { username: { eq: targetUsername } } },
            authMode: 'userPool',
          }) as { data: { listDrivers: { items: { sub: string; username: string }[] } } };

          const drivers = driverResponse.data?.listDrivers?.items || [];
          console.log(`[DvD] Step 3: Found ${drivers.length} Driver(s) for username "${targetUsername}"`);

          for (const driver of drivers) {
            if (driver.sub && driver.sub !== targetSub && driver.sub !== targetUsername) {
              console.log(`[DvD] Step 3: Trying Driver sub "${driver.sub}"...`);
              active = filterActive(await fetchDvDsByDriverSub(client, driver.sub));
              console.log(`[DvD] Step 3 (driverSub="${driver.sub}"): ${active.length} active`);
              if (active.length > 0) break;
            }
          }
        } catch (driverErr) {
          console.warn(`[DvD] Step 3: Driver lookup failed:`, driverErr);
        }
      }

      setDvds(active);
      setTotalFetched(active.length);

      if (active.length === 0) {
        console.warn(`[DvD] No active assignments found for sub="${targetSub}" / username="${targetUsername}"`);
        setVehicles([]);
        setImeis([]);
        return;
      }

      const resolvedVehicles = active
        .map((d) => d.vehicle)
        .filter((v): v is DvDVehicle => !!v);

      const resolvedImeis = resolvedVehicles
        .map((v) => v.vehicleDeviceImei)
        .filter((imei): imei is string => !!imei);

      console.log(`[DvD] Resolved ${resolvedVehicles.length} vehicles, ${resolvedImeis.length} IMEIs`);

      setVehicles(resolvedVehicles);
      setImeis(resolvedImeis);
    } catch (err: any) {
      console.error('[DvD] Resolution error:', err);

      let errorMessage = 'Erreur lors de la résolution des véhicules';
      if (!navigator.onLine) {
        errorMessage = 'Connexion internet indisponible.';
      } else if (err.message?.includes('Amplify has not been configured')) {
        errorMessage = 'Erreur d\'initialisation. Veuillez rafraîchir la page.';
      } else if (err.errors?.[0]?.message) {
        errorMessage = err.errors[0].message;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [client]);

  const refresh = useCallback(() => {
    if (userSub) {
      resolveVehicles(userSub, username);
    }
  }, [userSub, username, resolveVehicles]);

  useEffect(() => {
    if (userSub) {
      resolveVehicles(userSub, username);
    } else {
      setVehicles([]);
      setImeis([]);
      setDvds([]);
      setTotalFetched(0);
    }
  }, [userSub, username, resolveVehicles]);

  return { vehicles, imeis, dvds, loading, error, totalFetched, refresh };
};

export default useVehicleResolver;
