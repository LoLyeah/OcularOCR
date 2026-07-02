'use client';

import { useState, useEffect } from 'react';
import { VaultSetup } from '@/components/vault-setup';
import { Dashboard } from '@/components/dashboard';
import { getSalt } from '@/lib/storage';
import { AnimatePresence } from 'motion/react';

export default function Home() {
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    getSalt()
      .then(() => setIsInitializing(false))
      .catch((err) => {
        console.error("Initialization error:", err);
        setInitError(err?.message || String(err));
        setIsInitializing(false);
      });
  }, []);

  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F1F5F9] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
        <div className="animate-pulse text-xs font-bold tracking-widest uppercase text-slate-500 dark:text-slate-400">Initializing Vault...</div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#F1F5F9] dark:bg-slate-950 text-red-600 dark:text-red-400 font-sans p-6 text-center">
        <h1 className="text-lg font-bold mb-2">Vault Initialization Failed</h1>
        <pre className="text-xs bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded font-mono overflow-auto max-w-lg">
          {initError}
        </pre>
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


