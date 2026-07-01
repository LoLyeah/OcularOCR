'use client';

import { useState, useEffect } from 'react';
import { VaultSetup } from '@/components/vault-setup';
import { Dashboard } from '@/components/dashboard';
import { getSalt } from '@/lib/storage';

export default function Home() {
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    getSalt().then(() => setIsInitializing(false));
  }, []);

  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F1F5F9] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
        <div className="animate-pulse text-xs font-bold tracking-widest uppercase text-slate-500 dark:text-slate-400">Initializing Vault...</div>
      </div>
    );
  }

  if (!cryptoKey) {
    return <VaultSetup onUnlock={setCryptoKey} />;
  }

  return <Dashboard cryptoKey={cryptoKey} onLock={() => setCryptoKey(null)} />;
}
