'use client';

import { useState, useEffect } from 'react';
import { VaultSetup } from '@/components/vault-setup';
import { Dashboard } from '@/components/dashboard';
import { getSalt } from '@/lib/storage';
import { AnimatePresence } from 'motion/react';
import { useI18n } from '@/lib/i18n';

export default function Home() {
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [initAttempt, setInitAttempt] = useState(0);
  const { t } = useI18n();

  useEffect(() => {
    getSalt()
      .then(() => setIsInitializing(false))
      .catch((err) => {
        console.error("Initialization error:", err);
        setInitError(err?.message || String(err));
        setIsInitializing(false);
      });
  }, [initAttempt]);

  useEffect(() => {
    if (!cryptoKey) return;
    const getTimeoutMs = () => Math.max(1, Number(localStorage.getItem('vault_auto_lock_minutes')) || 15) * 60_000;
    let timeoutMs = getTimeoutMs();
    let lastActivity = Date.now();
    let timeoutId: ReturnType<typeof setTimeout>;

    const lockIfIdle = () => {
      const remaining = timeoutMs - (Date.now() - lastActivity);
      if (remaining <= 0) setCryptoKey(null);
      else timeoutId = setTimeout(lockIfIdle, remaining);
    };
    const registerActivity = () => {
      lastActivity = Date.now();
      clearTimeout(timeoutId);
      timeoutId = setTimeout(lockIfIdle, timeoutMs);
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') lockIfIdle();
    };
    const handleConfigChange = () => {
      timeoutMs = getTimeoutMs();
      registerActivity();
    };

    const activityEvents: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'touchstart'];
    activityEvents.forEach((event) => window.addEventListener(event, registerActivity, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('vault-auto-lock-change', handleConfigChange);
    timeoutId = setTimeout(lockIfIdle, timeoutMs);

    return () => {
      clearTimeout(timeoutId);
      activityEvents.forEach((event) => window.removeEventListener(event, registerActivity));
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('vault-auto-lock-change', handleConfigChange);
    };
  }, [cryptoKey]);

  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F1F5F9] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
        <div className="animate-pulse text-xs font-bold tracking-widest uppercase text-slate-500 dark:text-slate-400">{t('initializingVault')}</div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#F1F5F9] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans p-6 text-center">
        <h1 className="text-lg font-bold mb-2">{t('vaultInitFailed')}</h1>
        <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">{t('vaultInitFailedHelp')}</p>
        <button
          type="button"
          onClick={() => {
            setIsInitializing(true);
            setInitError(null);
            setInitAttempt((attempt) => attempt + 1);
          }}
          className="mt-5 rounded bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
        >
          {t('retryBtn')}
        </button>
        <details className="mt-4 max-w-lg text-left text-[10px] text-slate-400">
          <summary className="cursor-pointer">{t('technicalDetails')}</summary>
          <p className="mt-1 break-all font-mono">{initError}</p>
        </details>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {!cryptoKey ? (
        <VaultSetup key="setup" onUnlock={setCryptoKey} />
      ) : (
        <Dashboard key="dashboard" cryptoKey={cryptoKey} onLock={() => setCryptoKey(null)} />
      )}
    </AnimatePresence>
  );
}
