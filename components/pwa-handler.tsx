'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Smartphone, ArrowDownToLine, RefreshCw } from 'lucide-react';
import { useVersionCheck } from '@/hooks/use-version-check';
import { useI18n } from '@/lib/i18n';
import { getOfflineReadiness } from '@/lib/offline';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaHandler() {
  const { t } = useI18n();
  const { latestVersion, updateAvailable, performUpdate } = useVersionCheck();
  const [dismissedUpdate, setDismissedUpdate] = useState(false);
  const [, setDeferredPromptState] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  const setDeferredPrompt = (prompt: BeforeInstallPromptEvent | null) => {
    deferredPromptRef.current = prompt;
    setDeferredPromptState(prompt);
  };

  useEffect(() => {
    let promptTimer: ReturnType<typeof setTimeout> | undefined;
    // Check if the app is already running in standalone (installed) mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      Promise.resolve().then(() => setIsInstalled(true));
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent browser from automatically showing the native banner
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Check if user has already dismissed it once
      const dismissed = localStorage.getItem('pwa_prompt_dismissed');
      if (!dismissed) {
        // Show after a short delay of 4 seconds for a smooth onboarding experience
        promptTimer = setTimeout(() => {
          setShowPrompt(true);
        }, 4000);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      console.log('OcularOCR installed successfully!');
    };

    const handleTriggerInstall = () => {
      const activePrompt = deferredPromptRef.current;
      if (activePrompt) {
        activePrompt.prompt();
        activePrompt.userChoice.then(({ outcome }) => {
          console.log(`User response to triggered install prompt: ${outcome}`);
          setDeferredPrompt(null);
          setShowPrompt(false);
        });
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('trigger-pwa-install', handleTriggerInstall);

    const announceOfflineStatus = async () => {
      const status = await getOfflineReadiness();
      window.dispatchEvent(new CustomEvent('ocular-offline-status', { detail: status }));
    };
    const handleWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OFFLINE_CACHE_UPDATED') announceOfflineStatus();
    };
    const handleConnectivity = () => announceOfflineStatus();
    navigator.serviceWorker?.addEventListener('message', handleWorkerMessage);
    window.addEventListener('online', handleConnectivity);
    window.addEventListener('offline', handleConnectivity);

    // Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(async (reg) => {
          await navigator.serviceWorker.ready;
          (reg.active || reg.waiting || reg.installing)?.postMessage({ type: 'CACHE_OFFLINE_ASSETS' });
          await announceOfflineStatus();
        })
        .catch((err) => {
          console.error('ServiceWorker registration failed: ', err);
        });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('trigger-pwa-install', handleTriggerInstall);
      navigator.serviceWorker?.removeEventListener('message', handleWorkerMessage);
      window.removeEventListener('online', handleConnectivity);
      window.removeEventListener('offline', handleConnectivity);
      if (promptTimer) clearTimeout(promptTimer);
    };
  }, []);

  const handleInstallClick = async () => {
    const activePrompt = deferredPromptRef.current;
    if (!activePrompt) return;
    
    // Show the native install prompt
    activePrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await activePrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    
    // Clear deferred prompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Persist user dismissal choice
    localStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  const showInstallBanner = showPrompt && !isInstalled;
  const showUpdateBanner = updateAvailable && !dismissedUpdate;

  if (!showInstallBanner && !showUpdateBanner) return null;

  return (
    <AnimatePresence>
      {showInstallBanner && (
        <motion.div
          key="install-banner"
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="fixed bottom-5 right-5 z-50 max-w-sm w-[calc(100vw-2.5rem)] rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-white dark:bg-slate-900 p-4 shadow-2xl flex gap-3.5"
        >
          <div className="p-2 h-10 w-10 shrink-0 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              {t('installAppBannerTitle')}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
              {t('installAppBannerDesc')}
            </p>
            <div className="mt-3 flex gap-2 text-[10px]">
              <button
                onClick={handleInstallClick}
                className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer border-transparent"
              >
                <ArrowDownToLine className="h-3 w-3" />
                {t('installBtn').toUpperCase()}
              </button>
              <button
                onClick={handleDismiss}
                className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold transition-all cursor-pointer"
              >
                {t('dismissBtn').toUpperCase()}
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}

      {showUpdateBanner && (
        <motion.div
          key="update-banner"
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="fixed bottom-5 right-5 z-50 max-w-sm w-[calc(100vw-2.5rem)] rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-white dark:bg-slate-900 p-4 shadow-2xl flex gap-3.5"
        >
          <div className="p-2 h-10 w-10 shrink-0 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <RefreshCw className="h-5 w-5 animate-spin" style={{ animationDuration: '3s' }} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              {t('updateAvailableBadgeTitle', { version: latestVersion })}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
              {t('updateAvailableBadgeHelp')}
            </p>
            <div className="mt-3 flex gap-2 text-[10px]">
              <button
                onClick={performUpdate}
                className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer border-transparent"
              >
                <ArrowDownToLine className="h-3 w-3" />
                {t('updateHardRefreshBtn').toUpperCase()}
              </button>
              <button
                onClick={() => setDismissedUpdate(true)}
                className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold transition-all cursor-pointer"
              >
                {t('dismissBtn').toUpperCase()}
              </button>
            </div>
          </div>
          <button
            onClick={() => setDismissedUpdate(true)}
            className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
