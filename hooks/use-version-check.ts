'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { isNewerVersion } from '@/lib/version';

const VERSION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function useVersionCheck() {
  const currentVersion = process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0';
  const [latestVersion, setLatestVersion] = useState<string>(currentVersion);
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const isCheckingRef = useRef<boolean>(false);

  const checkForUpdate = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { available: false, version: currentVersion };
    }
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;
    setIsChecking(true);
    try {
      // Append timestamp to query to prevent any browser cache issues
      const res = await fetch(`/api/version?t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.version) {
          setLatestVersion(data.version);
          // Compare versions. In dev mode they might be equal.
          if (isNewerVersion(data.version, currentVersion)) {
            setUpdateAvailable(true);
            return { available: true, version: data.version };
          }
          setUpdateAvailable(false);
        }
      }
    } catch (err) {
      console.error('Failed to check for application updates:', err);
    } finally {
      isCheckingRef.current = false;
      setIsChecking(false);
    }
    return { available: false, version: currentVersion };
  }, [currentVersion]);

  const performUpdate = useCallback(async () => {
    try {
      // 1. Refresh the service worker without discarding downloaded OCR languages.
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.update();
          registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
        }
      }

      // 2. Clear only versioned application caches. Language-pack caches and
      // IndexedDB vault data survive updates.
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(
          cacheKeys.filter((key) => key.startsWith('ocular-app-cache-')).map((key) => caches.delete(key))
        );
      }

      // 3. Clear session storage or any cached assets that aren't critical indexdb data
      // Note: We do NOT clear localStorage/indexedDB since the user's secure vault is stored there.
      
      // 4. Force a hard reload from the server (bypassing cache)
      window.location.reload();
    } catch (err) {
      console.error('Error during hard update reload:', err);
      // Fallback reload
      window.location.reload();
    }
  }, []);

  useEffect(() => {
    // Initial check
    Promise.resolve().then(() => {
      checkForUpdate();
    });

    // Set up polling interval
    const timer = setInterval(() => {
      checkForUpdate();
    }, VERSION_CHECK_INTERVAL);

    // Set up check on window focus / visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdate();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', checkForUpdate);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', checkForUpdate);
    };
  }, [checkForUpdate]);

  return {
    currentVersion,
    latestVersion,
    updateAvailable,
    isChecking,
    checkForUpdate,
    performUpdate,
  };
}
