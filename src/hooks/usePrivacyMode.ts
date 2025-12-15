import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'fleettrack-privacy-mode';

export const usePrivacyMode = () => {
  const [isPrivate, setIsPrivate] = useState<boolean>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'true';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isPrivate));
  }, [isPrivate]);

  const togglePrivacy = useCallback(() => {
    setIsPrivate(prev => !prev);
  }, []);

  return { isPrivate, togglePrivacy, setPrivate: setIsPrivate };
};
