import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useMapboxToken() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchToken() {
      try {
        const { data, error: fnError } = await supabase.functions.invoke('mapbox-token');

        if (fnError) {
          throw new Error(fnError.message);
        }

        if (data?.token) {
          setToken(data.token);
        } else {
          throw new Error('Token not found');
        }
      } catch (err) {
        console.error('[useMapboxToken] Error:', err);
        setError(err instanceof Error ? err.message : 'Erreur de récupération du token');
      } finally {
        setLoading(false);
      }
    }

    fetchToken();
  }, []);

  return { token, loading, error };
}
