import { useEffect, useState, useCallback } from 'react';

const keyForUser = (username?: string) => `fleettrack-imei-${username ?? 'anonymous'}`;

export const useUserImei = (username?: string) => {
  const [imei, setImeiState] = useState<string | undefined>(() => {
    const stored = localStorage.getItem(keyForUser(username));
    return stored || undefined;
  });

  useEffect(() => {
    const stored = localStorage.getItem(keyForUser(username));
    setImeiState(stored || undefined);
  }, [username]);

  const setImei = useCallback(
    (next?: string) => {
      const trimmed = next?.trim();
      if (trimmed) {
        localStorage.setItem(keyForUser(username), trimmed);
        setImeiState(trimmed);
      } else {
        localStorage.removeItem(keyForUser(username));
        setImeiState(undefined);
      }
    },
    [username]
  );

  return { imei, setImei };
};
