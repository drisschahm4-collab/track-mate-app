import { useState, useEffect, useCallback, useMemo } from 'react';
import { generateClient } from 'aws-amplify/api';

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

export const useVehicleResolver = (userSub: string | undefined, username?: string): UseVehicleResolverResult => {
  const [vehicles, setVehicles] = useState<DvDVehicle[]>([]);
  const [imeis, setImeis] = useState<string[]>([]);
  const [dvds, setDvds] = useState<DvDRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalFetched, setTotalFetched] = useState(0);

  // Lazy initialization: client created only after Amplify.configure() has run
  const client = useMemo(() => generateClient(), []);

  const fetchAllDvDs = useCallback(async (targetSub: string, targetUsername?: string): Promise<DvDRecord[]> => {
    const allDvDs: DvDRecord[] = [];
    let nextToken: string | null = null;
    let iteration = 0;
    const MAX_ITERATIONS = 25; // 25 x 100 = 2500 max records
    const LIMIT_PER_PAGE = 100;

    console.log(`[DvD] Starting pagination fetch for sub: "${targetSub}"`);

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
        }) as { data: { listDvDS: { items: DvDRecord[]; nextToken: string | null } }; errors?: any[] };

        // Log partial errors but continue with available data
        if (response.errors?.length) {
          console.warn(`[DvD] Partial errors on page ${iteration + 1}:`, response.errors);
        }

        // Filter out null items (some may be null due to partial errors)
        const items = (response.data?.listDvDS?.items || []).filter(Boolean);
        allDvDs.push(...items);

        nextToken = response.data?.listDvDS?.nextToken || null;
        iteration++;

        console.log(`[DvD] Page ${iteration}: ${items.length} items, total: ${allDvDs.length}, hasMore: ${!!nextToken}`);
      } catch (err: any) {
        // Amplify throws even when there's partial data with errors
        // Check if we actually got data despite the "error"
        if (err?.data?.listDvDS?.items) {
          console.warn(`[DvD] Partial errors on page ${iteration + 1}, but got data:`, err.errors);
          const items = (err.data.listDvDS.items || []).filter(Boolean);
          allDvDs.push(...items);
          nextToken = err.data.listDvDS.nextToken || null;
          iteration++;
          console.log(`[DvD] Page ${iteration}: ${items.length} items from partial response, total: ${allDvDs.length}`);
        } else {
          // Real error - no data at all
          console.error(`[DvD] Error fetching page ${iteration + 1}:`, err);
          throw err;
        }
      }
    } while (nextToken && iteration < MAX_ITERATIONS);

    console.log(`[DvD] Pagination complete: ${allDvDs.length} total DvD records fetched in ${iteration} pages`);

    // Debug: log sample records to see what's in dvDDriverSub
    console.log('[DvD] Sample records:', allDvDs.slice(0, 3).map(d => ({
      dvDDriverSub: d.dvDDriverSub,
      driverSub: d.driver?.sub,
      driverUsername: d.driver?.username
    })));

    // Filtrer par sub du driver (côté client) - utilise dvDDriverSub ou driver.sub OU username
    const filtered = allDvDs.filter((dvd) => {
      const driverSub = dvd.dvDDriverSub || dvd.driver?.sub;
      const driverUsername = dvd.driver?.username;
      const isActive = !dvd.unassignmentDate; // Seulement les affectations actives
      
      // Match par sub UUID OU par username
      const matchesBySub = driverSub === targetSub;
      const matchesByUsername = targetUsername && (
        driverSub === targetUsername || 
        driverUsername === targetUsername
      );
      
      const matches = matchesBySub || matchesByUsername;

      if (matches) {
        console.log(`[DvD] Match found: dvDDriverSub="${driverSub}", driver.username="${driverUsername}", active=${isActive}, vehicle=${dvd.vehicle?.immat}`);
      }

      return matches && isActive;
    });

    console.log(`[DvD] Filtered by sub "${targetSub}" OR username "${targetUsername}": ${filtered.length}/${allDvDs.length} active assignments`);

    return filtered;
  }, [client]);

  const resolveVehicles = useCallback(async (targetSub: string, targetUsername?: string) => {
    setLoading(true);
    setError(null);

    try {
      const filteredDvds = await fetchAllDvDs(targetSub, targetUsername);
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
    } catch (err: any) {
      console.error('[DvD] Resolution error:', err);
      
      let errorMessage = 'Erreur lors de la résolution des véhicules';
      
      // Check offline status first
      if (!navigator.onLine) {
        errorMessage = 'Connexion internet indisponible. Veuillez vérifier votre connexion.';
      } else if (err.message?.includes('Amplify has not been configured')) {
        errorMessage = 'Erreur d\'initialisation Amplify. Veuillez rafraîchir la page.';
      } else if (err.message?.includes('ERR_NAME_NOT_RESOLVED') || err.name === 'NetworkError') {
        errorMessage = 'Impossible de se connecter à l\'API AppSync. Vérifiez la configuration.';
      } else if (err.errors?.[0]?.message) {
        errorMessage = err.errors[0].message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [fetchAllDvDs]);

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
