import { useState, useEffect } from 'react';
import Image from 'next/image';
import { deriveKey, encryptString, decryptString } from '@/lib/crypto';
import { getSalt, clearVault, getVerificationToken, setVerificationToken } from '@/lib/storage';
import { Lock, Unlock, AlertTriangle, ShieldCheck, ShieldOff } from 'lucide-react';
import { motion } from 'motion/react';

interface VaultSetupProps {
  onUnlock: (key: CryptoKey) => void;
}

export function VaultSetup({ onUnlock }: VaultSetupProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResetWarning, setShowResetWarning] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [setupStep, setSetupStep] = useState<'choose_mode' | 'set_password' | null>(null);

  useEffect(() => {
    async function checkVault() {
      const verifyToken = await getVerificationToken();
      if (!verifyToken) {
        setSetupStep('choose_mode');
        setIsChecking(false);
      } else {
        const mode = localStorage.getItem('vault_mode');
        if (mode === 'unencrypted') {
           try {
             const salt = await getSalt();
             const key = await deriveKey('OPEN_VAULT_MODE_XYZ_123', salt);
             onUnlock(key);
             return;
           } catch(err) {
             console.error('Failed to auto unlock', err);
           }
        }
        setIsChecking(false);
      }
    }
    checkVault();
  }, [onUnlock]);

  const handleSetupUnencrypted = async () => {
    setIsLoading(true);
    try {
      const salt = await getSalt();
      const key = await deriveKey('OPEN_VAULT_MODE_XYZ_123', salt);
      const { encrypted, iv } = await encryptString('VAULT_VALID', key);
      await setVerificationToken(encrypted, iv);
      localStorage.setItem('vault_mode', 'unencrypted');
      onUnlock(key);
    } catch(err) {
      setError('Failed to setup unencrypted vault.');
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    try {
      const salt = await getSalt();
      const key = await deriveKey(password, salt);
      
      const verifyToken = await getVerificationToken();
      if (!verifyToken) {
        // First time setup
        const { encrypted, iv } = await encryptString('VAULT_VALID', key);
        await setVerificationToken(encrypted, iv);
        localStorage.setItem('vault_mode', 'encrypted');
        onUnlock(key);
      } else {
        // Verify password
        try {
          const decrypted = await decryptString(verifyToken.data, verifyToken.iv, key);
          if (decrypted === 'VAULT_VALID') {
            onUnlock(key);
          } else {
            setError('Incorrect password.');
          }
        } catch (decryptErr) {
          setError('Incorrect password.');
        }
      }
    } catch (err) {
      setError('Failed to unlock vault.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetVault = async () => {
    await clearVault();
    localStorage.removeItem('vault_mode');
    window.location.reload();
  };

  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F1F5F9] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
        <div className="animate-pulse text-xs font-bold tracking-widest uppercase text-slate-500 dark:text-slate-400">Checking Vault...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-[#F1F5F9] dark:bg-slate-950 px-4 text-slate-900 dark:text-slate-100 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm"
      >
        {!showResetWarning ? (
          <>
            {setupStep === 'choose_mode' ? (
              <div className="flex flex-col items-center text-center">
                <div className="mb-4">
                  <Image src="/icon.svg" width={64} height={64} className="rounded-2xl shadow-md select-none" alt="OcularOCR" referrerPolicy="no-referrer" />
                </div>
                <h1 className="text-xl font-bold">Welcome to OcularOCR</h1>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                  Choose how you want to secure your local document vault. This determines how your data will be encrypted on this device.
                </p>
                <div className="flex w-full flex-col gap-3">
                  <button
                    onClick={() => setSetupStep('set_password')}
                    className="flex flex-col items-start rounded border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50 dark:bg-indigo-900/20 p-4 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Lock className="h-4 w-4 text-indigo-700 dark:text-indigo-400" />
                      <span className="font-bold text-sm text-indigo-900 dark:text-indigo-300">Encrypted Vault (Recommended)</span>
                    </div>
                    <span className="text-xs text-indigo-700 dark:text-indigo-400/80 leading-relaxed">Secure all documents and AI settings with a password. Requires password on every visit.</span>
                  </button>
                  
                  <button
                    onClick={handleSetupUnencrypted}
                    disabled={isLoading}
                    className="flex flex-col items-start rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Unlock className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-200">Open Vault</span>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Data is still stored locally, but automatically unlocked without a password.</span>
                  </button>
                </div>
                {error && <p className="mt-4 text-xs font-medium text-red-500 dark:text-red-400">{error}</p>}
              </div>
            ) : (
              <>
                <div className="mb-6 flex flex-col items-center text-center">
                  <div className="mb-4">
                    <Image src="/icon.svg" width={48} height={48} className="rounded-xl shadow-sm select-none" alt="OcularOCR" referrerPolicy="no-referrer" />
                  </div>
                  <h1 className="text-lg font-bold">Secure Local Vault</h1>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Enter your vault password. If this is your first time, this password will be used to encrypt all your data locally.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                  <div>
                    <input
                      type="password"
                      placeholder="Vault Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      autoFocus
                    />
                  </div>
                  {error && <p className="text-xs font-medium text-red-500 dark:text-red-400">{error}</p>}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50 shadow-sm"
                  >
                    {isLoading ? 'Unlocking...' : (
                      <>
                        <Unlock className="h-4 w-4" />
                        UNLOCK VAULT
                      </>
                    )}
                  </button>
                </form>
                
                <div className="mt-6 flex justify-center">
                  <button 
                    onClick={() => setShowResetWarning(true)}
                    className="text-xs font-medium text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  >
                    Forgot Password? Reset Vault
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 rounded bg-red-50 dark:bg-red-900/20 p-3 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Reset Vault & Wipe Data</h2>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              Are you sure? This will permanently delete all your encrypted documents, settings, and the encryption key. This action cannot be undone.
            </p>
            <div className="mt-6 flex w-full flex-col gap-2">
              <button
                onClick={handleResetVault}
                className="w-full rounded bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 shadow-sm transition-colors"
              >
                YES, WIPE ALL DATA
              </button>
              <button
                onClick={() => setShowResetWarning(false)}
                className="w-full rounded bg-slate-100 dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                CANCEL
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
