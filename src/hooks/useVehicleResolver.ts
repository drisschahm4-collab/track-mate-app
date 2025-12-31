import { useState, useEffect, useCallback } from 'react';
import { generateClient } from 'aws-amplify/api';

const client = generateClient();

// GraphQL query avec pagination et tous les champs nécessaires
const LIST_DVD_WITH_DRIVER = /* GraphQL */ `
  query ListDvDS($limit: Int, $nextToken: String) {
    listDvDS(limit: $limit, nextToken: $nextToken) {
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
        company {
          id
          name
        }
      }
      nextToken
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

export const useVehicleResolver = (username: string | undefined): UseVehicleResolverResult => {
  const [vehicles, setVehicles] = useState<DvDVehicle[]>([]);
  const [imeis, setImeis] = useState<string[]>([]);
  const [dvds, setDvds] = useState<DvDRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalFetched, setTotalFetched] = useState(0);

  const fetchAllDvDs = useCallback(async (targetUsername: string): Promise<DvDRecord[]> => {
    const allDvDs: DvDRecord[] = [];
    let nextToken: string | null = null;
    let iteration = 0;
    const MAX_ITERATIONS = 25; // 25 x 100 = 2500 max records
    const LIMIT_PER_PAGE = 100;

    console.log(`[DvD] Starting pagination fetch for username: "${targetUsername}"`);

    do {
      console.log(`[DvD] Fetching page ${iteration + 1}, nextToken: ${nextToken ? 'present' : 'null'}`);

      try {
        const response = await client.graphql({
          query: LIST_DVD_WITH_DRIVER,
          variables: {
            limit: LIMIT_PER_PAGE,
            nextToken,
          },
          authMode: 'userPool',
        }) as { data: { listDvDS: { items: DvDRecord[]; nextToken: string | null } } };

        const items = response.data?.listDvDS?.items || [];
        allDvDs.push(...items);

        nextToken = response.data?.listDvDS?.nextToken || null;
        iteration++;

        console.log(`[DvD] Page ${iteration}: ${items.length} items, total: ${allDvDs.length}, hasMore: ${!!nextToken}`);
      } catch (err) {
        console.error(`[DvD] Error fetching page ${iteration + 1}:`, err);
        throw err;
      }
    } while (nextToken && iteration < MAX_ITERATIONS);

    console.log(`[DvD] Pagination complete: ${allDvDs.length} total DvD records fetched in ${iteration} pages`);

    // Filtrer par username du driver (côté client)
    const filtered = allDvDs.filter((dvd) => {
      const driverUsername = dvd.driver?.username;
      const isActive = !dvd.unassignmentDate; // Seulement les affectations actives
      const matchesUsername = driverUsername === targetUsername;

      if (matchesUsername) {
        console.log(`[DvD] Match found: driver.username="${driverUsername}", active=${isActive}, vehicle=${dvd.vehicle?.immat}`);
      }

      return matchesUsername && isActive;
    });

    console.log(`[DvD] Filtered by username "${targetUsername}": ${filtered.length}/${allDvDs.length} active assignments`);

    return filtered;
  }, []);

  const resolveVehicles = useCallback(async (targetUsername: string) => {
    setLoading(true);
    setError(null);

    try {
      const filteredDvds = await fetchAllDvDs(targetUsername);
      setDvds(filteredDvds);
      setTotalFetched(filteredDvds.length);

      if (filteredDvds.length === 0) {
        console.warn(`[DvD] No active DvD assignments found for username: "${targetUsername}"`);
        setVehicles([]);
        setImeis([]);
        return;
      }

      // Extraire les véhicules uniques
      const resolvedVehicles = filteredDvds
        .map((dvd) => dvd.vehicle)
        .filter((v): v is DvDVehicle => v !== null && v !== undefined);

      // Extraire les IMEIs valides
      const resolvedImeis = resolvedVehicles
        .map((v) => v.vehicleDeviceImei)
        .filter((imei): imei is string => !!imei);

      console.log(`[DvD] Resolved ${resolvedVehicles.length} vehicles:`, resolvedVehicles.map((v) => v.immat));
      console.log(`[DvD] Resolved ${resolvedImeis.length} IMEIs:`, resolvedImeis);

      setVehicles(resolvedVehicles);
      setImeis(resolvedImeis);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la résolution des véhicules';
      console.error('[DvD] Resolution error:', err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [fetchAllDvDs]);

  const refresh = useCallback(() => {
    if (username) {
      resolveVehicles(username);
    }
  }, [username, resolveVehicles]);

  useEffect(() => {
    if (username) {
      resolveVehicles(username);
    } else {
      setVehicles([]);
      setImeis([]);
      setDvds([]);
      setTotalFetched(0);
    }
  }, [username, resolveVehicles]);

  return {
    vehicles,
    imeis,
    dvds,
    loading,
    error,
    totalFetched,
    refresh,
  };
};

export default useVehicleResolver;
