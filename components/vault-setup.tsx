import { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  deriveKey, 
  encryptString, 
  decryptString,
  getPasskeyPrf,
  deriveKeyFromPrf,
  unwrapMasterKey,
  base64ToArrayBuffer
} from '@/lib/crypto';
import {
  CURRENT_KDF_ITERATIONS,
  getKdfIterations,
  getSalt,
  clearVault,
  getVerificationToken,
  setKdfIterations,
  setVerificationToken,
} from '@/lib/storage';
import { Lock, Unlock, AlertTriangle, ShieldOff, Loader2, Fingerprint } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useI18n } from '@/lib/i18n';

interface VaultSetupProps {
  onUnlock: (key: CryptoKey) => void;
}

export function VaultSetup({ onUnlock }: VaultSetupProps) {
  const { t } = useI18n();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isNewVault, setIsNewVault] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResetWarning, setShowResetWarning] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [setupStep, setSetupStep] = useState<'choose_mode' | 'set_password' | 'unlock_passkey' | null>(null);

  useEffect(() => {
    async function checkVault() {
      const verifyToken = await getVerificationToken();
      if (!verifyToken) {
        setIsNewVault(true);
        setSetupStep('choose_mode');
        setIsChecking(false);
      } else {
        const mode = localStorage.getItem('vault_mode');
        if (mode === 'unencrypted') {
           try {
             const salt = await getSalt();
             const key = await deriveKey('OPEN_VAULT_MODE_XYZ_123', salt, getKdfIterations());
             onUnlock(key);
             return;
           } catch(err) {
             console.error('Failed to auto unlock', err);
           }
        } else if (mode === 'passkey' && localStorage.getItem('vault_passkey_wrapped_key')) {
           setSetupStep('unlock_passkey');
           setIsChecking(false);
           return;
        }
        setSetupStep('set_password');
        setIsChecking(false);
      }
    }
    checkVault();
  }, [onUnlock]);

  useEffect(() => {
    if (setupStep === 'unlock_passkey') {
      // Safe auto-prompt for biometrics when screen loads
      const autoPrompt = async () => {
        try {
          const credentialId = localStorage.getItem('vault_passkey_credential_id');
          const wrappedKeyBase64 = localStorage.getItem('vault_passkey_wrapped_key');
          const wrappedIvBase64 = localStorage.getItem('vault_passkey_wrapped_iv');
          if (!credentialId || !wrappedKeyBase64 || !wrappedIvBase64) return;
          
          setIsLoading(true);
          const salt = await getSalt();
          const prfValue = await getPasskeyPrf(credentialId, salt);
          const wrappingKey = await deriveKeyFromPrf(prfValue);
          const wrappedKey = base64ToArrayBuffer(wrappedKeyBase64);
          const wrappedIv = new Uint8Array(base64ToArrayBuffer(wrappedIvBase64));
          
          const key = await unwrapMasterKey(wrappedKey, wrappingKey, wrappedIv);
          const verifyToken = await getVerificationToken();
          if (verifyToken) {
            const decrypted = await decryptString(verifyToken.data, verifyToken.iv, key);
            if (decrypted === 'VAULT_VALID') {
              onUnlock(key);
              return;
            }
          }
        } catch (err) {
          console.log('Auto-prompt bypassed (requires user interaction):', err);
        } finally {
          setIsLoading(false);
        }
      };
      autoPrompt();
    }
  }, [setupStep, onUnlock]);

  const handleSetupUnencrypted = async () => {
    setIsLoading(true);
    setError('');
    try {
      const salt = await getSalt();
      setKdfIterations(CURRENT_KDF_ITERATIONS);
      const key = await deriveKey('OPEN_VAULT_MODE_XYZ_123', salt, CURRENT_KDF_ITERATIONS);
      const { encrypted, iv } = await encryptString('VAULT_VALID', key);
      await setVerificationToken(encrypted, iv);
      localStorage.setItem('vault_mode', 'unencrypted');
      onUnlock(key);
    } catch {
      setError(t('failedSetupUnencrypted'));
      setIsLoading(false);
    }
  };

  const handleUnlockPasskey = async () => {
    setIsLoading(true);
    setError('');
    try {
      const credentialId = localStorage.getItem('vault_passkey_credential_id');
      const wrappedKeyBase64 = localStorage.getItem('vault_passkey_wrapped_key');
      const wrappedIvBase64 = localStorage.getItem('vault_passkey_wrapped_iv');
      
      if (!credentialId || !wrappedKeyBase64 || !wrappedIvBase64) {
        throw new Error('Biometric credentials not found. Please unlock using your password.');
      }
      const salt = await getSalt();
      const prfValue = await getPasskeyPrf(credentialId, salt);
      const wrappingKey = await deriveKeyFromPrf(prfValue);
      const wrappedKey = base64ToArrayBuffer(wrappedKeyBase64);
      const wrappedIv = new Uint8Array(base64ToArrayBuffer(wrappedIvBase64));
      
      const key = await unwrapMasterKey(wrappedKey, wrappingKey, wrappedIv);
      const verifyToken = await getVerificationToken();
      if (!verifyToken) {
        throw new Error('Vault verification token is missing.');
      }
      
      const decrypted = await decryptString(verifyToken.data, verifyToken.iv, key);
      if (decrypted === 'VAULT_VALID') {
        onUnlock(key);
      } else {
        setError('Failed to decrypt vault with biometrics.');
      }
    } catch(err: any) {
      console.error(err);
      setError(err?.message || 'Biometric unlock failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const verifyToken = await getVerificationToken();
      if (!verifyToken && password.length < 12) {
        setError(t('passwordLengthError'));
        return;
      }
      if (!verifyToken && password !== confirmPassword) {
        setError(t('passwordMismatch'));
        return;
      }
      if (verifyToken && password.length === 0) {
        setError(t('incorrectPassword'));
        return;
      }

      const salt = await getSalt();
      const iterations = verifyToken ? getKdfIterations() : CURRENT_KDF_ITERATIONS;
      if (!verifyToken) setKdfIterations(iterations);
      const key = await deriveKey(password, salt, iterations);

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
            setError(t('incorrectPassword'));
          }
        } catch (decryptErr) {
          setError(t('incorrectPassword'));
        }
      }
    } catch (err) {
      setError(t('failedUnlockVault'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetVault = async () => {
    await clearVault();
    localStorage.removeItem('vault_mode');
    localStorage.removeItem('vault_passkey_credential_id');
    localStorage.removeItem('vault_lang');
    window.location.reload();
  };

  if (isChecking) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#F1F5F9] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
        <div className="animate-pulse text-xs font-bold tracking-widest uppercase text-slate-500 dark:text-slate-400">{t('checkingVault')}</div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh items-center justify-center bg-[#F1F5F9] dark:bg-slate-950 px-4 text-slate-900 dark:text-slate-100 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm overflow-hidden"
      >
        <AnimatePresence mode="wait">
          {showResetWarning ? (
            <motion.div
              key="reset-warning"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col items-center text-center"
            >
              <div className="mb-4 rounded bg-red-50 dark:bg-red-900/20 p-3 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t('resetVaultWipeData')}</h2>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                {t('areYouSureWipe')}
              </p>
              <div className="mt-6 flex w-full flex-col gap-2">
                <button
                  onClick={handleResetVault}
                  className="w-full rounded bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 shadow-sm transition-colors cursor-pointer"
                >
                  {t('yesWipeAllData')}
                </button>
                <button
                  onClick={() => setShowResetWarning(false)}
                  className="w-full rounded bg-slate-100 dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  {t('cancel').toUpperCase()}
                </button>
              </div>
            </motion.div>
          ) : setupStep === 'choose_mode' ? (
            <motion.div
              key="choose-mode"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col items-center text-center"
            >
              <div className="mb-4">
                <Image src="/icon.svg" width={64} height={64} className="rounded-2xl shadow-md select-none" alt="OcularOCR" referrerPolicy="no-referrer" />
              </div>
              <h1 className="text-xl font-bold">{t('welcomeToOcular')}</h1>
              <p className="mb-6 mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{t('chooseVaultMode')}</p>
              <div className="flex w-full flex-col gap-3">
                <button
                  onClick={() => setSetupStep('set_password')}
                  className="flex flex-col items-start rounded border border-indigo-200 bg-indigo-50 p-4 text-left transition-colors hover:bg-indigo-100 dark:border-indigo-800/50 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40"
                >
                  <span className="mb-1 flex items-center gap-2 font-bold text-indigo-900 dark:text-indigo-300"><Lock className="h-4 w-4" />{t('encryptedVaultRecommended')}</span>
                  <span className="text-xs leading-relaxed text-indigo-700 dark:text-indigo-400/80">{t('encryptedVaultHelp')}</span>
                </button>
                <button
                  onClick={handleSetupUnencrypted}
                  disabled={isLoading}
                  className="flex flex-col items-start rounded border border-amber-300 bg-amber-50 p-4 text-left transition-colors hover:bg-amber-100 disabled:opacity-50 dark:border-amber-800/60 dark:bg-amber-950/20 dark:hover:bg-amber-950/40"
                >
                  <span className="mb-1 flex items-center gap-2 font-bold text-amber-900 dark:text-amber-300"><ShieldOff className="h-4 w-4" />{t('unencryptedVault')}</span>
                  <span className="text-xs leading-relaxed text-amber-800 dark:text-amber-400">{t('unencryptedVaultWarning')}</span>
                </button>
              </div>
              {error && <p className="mt-4 text-xs font-medium text-red-500 dark:text-red-400">{error}</p>}
            </motion.div>
          ) : setupStep === 'unlock_passkey' ? (
            <motion.div
              key="unlock-passkey"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col items-center text-center"
            >
              <div className="mb-4">
                <Image src="/icon.svg" width={48} height={48} className="rounded-xl shadow-sm select-none" alt="OcularOCR" referrerPolicy="no-referrer" />
              </div>
              <h1 className="text-lg font-bold">{t('biometricUnlock')}</h1>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6 font-medium">
                {t('vaultSecuredPasskey')}
              </p>

              <button
                onClick={handleUnlockPasskey}
                disabled={isLoading}
                className="flex flex-col items-center justify-center rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 p-6 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors w-24 h-24 mb-6 disabled:opacity-50 cursor-pointer focus:outline-none shadow-sm"
                aria-label="Scan Passkey"
              >
                {isLoading ? (
                  <Loader2 className="h-10 w-10 animate-spin text-indigo-600 dark:text-indigo-400" />
                ) : (
                  <Fingerprint className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
                )}
              </button>

              {error && <p className="text-xs font-medium text-red-500 dark:text-red-400 mb-4">{error}</p>}

              <div className="mt-4 flex flex-col gap-3 w-full">
                <button
                  onClick={handleUnlockPasskey}
                  disabled={isLoading}
                  className="rounded bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
                >
                  {isLoading ? t('unlocking') : t('unlockWithPasskeyBtn')}
                </button>

                <button
                  type="button"
                  onClick={() => setSetupStep('set_password')}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  {t('orUnlockPasswordLink')}
                </button>
              </div>

              <div className="mt-8 flex justify-center">
                <button 
                  onClick={() => setShowResetWarning(true)}
                  className="text-xs font-medium text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer"
                >
                  {t('forgotKeyReset')}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="set-password"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
            >
              <div className="mb-6 flex flex-col items-center text-center">
                <div className="mb-4">
                  <Image src="/icon.svg" width={48} height={48} className="rounded-xl shadow-sm select-none" alt="OcularOCR" referrerPolicy="no-referrer" />
                </div>
                <h1 className="text-lg font-bold">{isNewVault ? t('createSecureVault') : t('secureLocalVault')}</h1>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  {isNewVault ? t('createSecureVaultHelp') : t('enterVaultPassDecrypt')}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div>
                  <input
                    type="password"
                    placeholder={t('vaultPasswordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={isNewVault ? 'new-password' : 'current-password'}
                    className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    autoFocus
                  />
                </div>
                {isNewVault && <div>
                  <input
                    type="password"
                    placeholder={t('confirmVaultPassword')}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="mt-2 text-[10px] leading-relaxed text-amber-600 dark:text-amber-400">{t('vaultPasswordRecoveryWarning')}</p>
                </div>}
                {error && <p className="text-xs font-medium text-red-500 dark:text-red-400">{error}</p>}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50 shadow-sm cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('unlocking')}
                    </>
                  ) : (
                    <>
                      <Unlock className="h-4 w-4" />
                      {isNewVault ? t('createVaultBtn') : t('unlockVaultBtn')}
                    </>
                  )}
                </button>
              </form>

              {typeof window !== 'undefined' && localStorage.getItem('vault_passkey_wrapped_key') && (
                <div className="mt-4 flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => setSetupStep('unlock_passkey')}
                    className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    <Fingerprint className="h-4 w-4" />
                    {t('orUnlockBiometricsLink')}
                  </button>
                </div>
              )}

              {isNewVault && (
                <div className="mt-4 flex justify-center">
                  <button type="button" onClick={() => setSetupStep('choose_mode')} className="text-xs font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
                    {t('backToVaultOptions')}
                  </button>
                </div>
              )}
              
              {!isNewVault && <div className="mt-6 flex justify-center">
                <button 
                  onClick={() => setShowResetWarning(true)}
                  className="text-xs font-medium text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer"
                >
                  {t('forgotPasswordReset')}
                </button>
              </div>}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
