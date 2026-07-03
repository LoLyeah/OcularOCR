import { useState, useEffect, useRef } from 'react';
import { X, Check, BrainCircuit, Palette, ScanText, ShieldAlert, AlertTriangle, RefreshCw, ArrowDownToLine, Fingerprint, FileUp, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AISettings, getSettings, saveSettings, clearVault, exportVaultEncrypted, importVaultEncrypted, getSalt } from '@/lib/storage';
import { encryptString, decryptString, isWebAuthnPrfSupported, registerPasskeyPrf, wrapMasterKey, arrayBufferToBase64, deriveKeyFromPrf } from '@/lib/crypto';
import { useToast } from './toast';
import { useVersionCheck } from '@/hooks/use-version-check';
import { useI18n, Language } from '@/lib/i18n';

interface SettingsModalProps {
  cryptoKey: CryptoKey;
  onClose: () => void;
}

export function SettingsModal({ cryptoKey, onClose }: SettingsModalProps) {
  const { language: activeLanguage, setLanguage: updateActiveLanguage, t } = useI18n();
  const [langLocal, setLangLocal] = useState<Language>(activeLanguage);

  const {
    currentVersion,
    latestVersion,
    updateAvailable,
    isChecking: isCheckingVersion,
    checkForUpdate,
    performUpdate
  } = useVersionCheck();

  const [activeTab, setActiveTab] = useState<'ai' | 'appearance' | 'offline' | 'system-reset'>('ai');

  const handleManualCheck = async () => {
    toast({
      title: t('updateCheckingToast'),
      description: t('updateCheckingToastDesc'),
      variant: "info"
    });
    const result = await checkForUpdate();
    if (result) {
      if (result.available) {
        toast({
          title: t('updateAvailableToast'),
          description: t('updateAvailableToastDesc', { version: result.version, current: currentVersion }),
          variant: "success"
        });
      } else {
        toast({
          title: t('updateUpToDateToast'),
          description: t('updateUpToDateToastDesc', { current: currentVersion }),
          variant: "success"
        });
      }
    }
  };

  const [settings, setSettings] = useState<AISettings>({
    provider: 'gemini',
    apiKey: '',
    endpoint: '',
    model: '',
    useLlmForOcr: false,
    temperature: 0.2,
    customOcrPrompt: '',
    customSummaryPrompt: '',
    autoTagStrategy: 'hybrid',
    ocrLanguages: ['eng'],
    enablePreprocessing: true,
    preprocessingGrayscale: true,
    preprocessingContrast: true,
    preprocessingDenoise: false,
    preprocessingDeskew: false,
    preprocessingRotate: true,
    preprocessingBinarize: false,
    rotationThreshold: 3.0,
    pdfRenderScale: 2.0,
    enablePostOcrCorrection: false,
    postOcrCorrectionPrompt: '',
    handwritingMode: false,
    structuredLlmOcr: false
  });
  
  // Keep track of provider-specific inputs so they don't bleed into each other
  const [providerConfigs, setProviderConfigs] = useState<Record<string, { apiKey: string; endpoint: string; model: string }>>({
    gemini: { apiKey: '', endpoint: '', model: '' },
    openai: { apiKey: '', endpoint: '', model: '' },
    ollama: { apiKey: '', endpoint: '', model: '' },
  });
  
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [initialTheme, setInitialTheme] = useState<'light' | 'dark' | 'system'>('system');
  
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [initialFontSize, setInitialFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  
  const [confirmReset, setConfirmReset] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showAdvancedAI, setShowAdvancedAI] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const [isPrfSupported, setIsPrfSupported] = useState(false);
  const [hasPasskey, setHasPasskey] = useState(false);
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      // Check PRF and Passkey status
      const prfSupported = await isWebAuthnPrfSupported();
      setIsPrfSupported(prfSupported);
      const wrappedKey = localStorage.getItem('vault_passkey_wrapped_key');
      setHasPasskey(!!wrappedKey);

      // Load Theme settings
      const storedTheme = localStorage.getItem('vault_theme');
      const currentTheme = (storedTheme === 'light' || storedTheme === 'dark') ? storedTheme : 'system';
      setTheme(currentTheme);
      setInitialTheme(currentTheme);

      // Load Font Size settings
      const storedFontSize = localStorage.getItem('vault_font_size');
      const currentFontSize = (storedFontSize === 'small' || storedFontSize === 'large') ? storedFontSize : 'medium';
      setFontSize(currentFontSize as any);
      setInitialFontSize(currentFontSize as any);

      // Load AI settings
      const encrypted = await getSettings();
      if (encrypted) {
        try {
          const decryptedStr = await decryptString(encrypted.data, encrypted.iv, cryptoKey);
          const parsed: any = JSON.parse(decryptedStr);
          if (parsed.provider === 'groq') {
            parsed.provider = 'openai';
            if (!parsed.endpoint) {
              parsed.endpoint = 'https://api.groq.com/openai/v1/chat/completions';
            }
          }
          
           setSettings(prev => ({
            ...prev,
            ...parsed,
            temperature: parsed.temperature ?? 0.2,
            autoTagStrategy: parsed.autoTagStrategy ?? 'hybrid',
            customOcrPrompt: parsed.customOcrPrompt ?? '',
            customSummaryPrompt: parsed.customSummaryPrompt ?? '',
            ocrLanguages: parsed.ocrLanguages ?? ['eng'],
            enablePreprocessing: parsed.enablePreprocessing ?? true,
            preprocessingGrayscale: parsed.preprocessingGrayscale ?? true,
            preprocessingContrast: parsed.preprocessingContrast ?? true,
            preprocessingDenoise: parsed.preprocessingDenoise ?? true,
            preprocessingDeskew: parsed.preprocessingDeskew ?? true,
            preprocessingRotate: parsed.preprocessingRotate ?? true,
            preprocessingBinarize: parsed.preprocessingBinarize ?? false,
            rotationThreshold: parsed.rotationThreshold ?? 3.0,
            pdfRenderScale: parsed.pdfRenderScale ?? 2.0,
            enablePostOcrCorrection: parsed.enablePostOcrCorrection ?? false,
            postOcrCorrectionPrompt: parsed.postOcrCorrectionPrompt ?? '',
            handwritingMode: parsed.handwritingMode ?? false,
          }));
          
          if (parsed.configs) {
            if (parsed.configs.groq) {
              parsed.configs.openai = parsed.configs.openai || parsed.configs.groq;
              delete parsed.configs.groq;
            }
            setProviderConfigs(parsed.configs);
          } else {
            setProviderConfigs(prev => ({
              ...prev,
              [parsed.provider]: {
                apiKey: parsed.apiKey || '',
                endpoint: parsed.endpoint || '',
                model: parsed.model || ''
              }
            }));
          }
        } catch (err) {
          console.error("Failed to decrypt settings", err);
        }
      }
      
      setIsLoading(false);
    }
    load();
  }, [cryptoKey]);

  // Real-time theme preview effect
  useEffect(() => {
    if (isLoading) return;
    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme, isLoading]);

  // Real-time font size preview effect
  useEffect(() => {
    if (isLoading) return;
    document.documentElement.classList.remove('font-size-small', 'font-size-medium', 'font-size-large');
    document.documentElement.classList.add(`font-size-${fontSize}`);
  }, [fontSize, isLoading]);

  const handleCancel = () => {
    // Revert to initial theme
    if (initialTheme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Revert to initial font size
    document.documentElement.classList.remove('font-size-small', 'font-size-medium', 'font-size-large');
    document.documentElement.classList.add(`font-size-${initialFontSize}`);

    onClose();
  };

  const handleRegisterPasskey = async () => {
    setIsPasskeyLoading(true);
    try {
      const salt = await getSalt();
      const { prfValue, credentialId } = await registerPasskeyPrf('Local OcularOCR User', salt);
      const wrappingKey = await deriveKeyFromPrf(prfValue);
      const { wrapped, iv } = await wrapMasterKey(cryptoKey, wrappingKey);
      
      localStorage.setItem('vault_passkey_wrapped_key', arrayBufferToBase64(wrapped));
      localStorage.setItem('vault_passkey_wrapped_iv', arrayBufferToBase64(iv.buffer as ArrayBuffer));
      localStorage.setItem('vault_passkey_credential_id', credentialId);
      localStorage.setItem('vault_mode', 'passkey');
      
      setHasPasskey(true);
      toast({
        title: t('passkeyLinkedSuccess'),
        description: t('passkeyLinkedDesc'),
        variant: "success"
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: t('passkeyRegFailed'),
        description: err?.message || t('passkeyRegFailedDesc'),
        variant: "error"
      });
    } finally {
      setIsPasskeyLoading(false);
    }
  };

  const handleRemovePasskey = () => {
    localStorage.removeItem('vault_passkey_wrapped_key');
    localStorage.removeItem('vault_passkey_wrapped_iv');
    localStorage.removeItem('vault_passkey_credential_id');
    localStorage.setItem('vault_mode', 'encrypted');
    setHasPasskey(false);
    toast({
      title: t('passkeyUnlinked'),
      description: t('passkeyUnlinkedDesc'),
      variant: "info"
    });
  };

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const jsonStr = await exportVaultEncrypted();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ocularocr-vault-backup-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({
        title: t('vaultBackupExported'),
        description: t('vaultBackupExportedDesc'),
        variant: "success"
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: t('exportFailed'),
        description: err?.message || "Failed to generate backup file.",
        variant: "error"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed.salt || !parsed.documents) {
        throw new Error('File does not match the OcularOCR backup format.');
      }
      
      await importVaultEncrypted(text);
      toast({
        title: t('vaultImportedTitle'),
        description: t('vaultImportedDesc'),
        variant: "success"
      });
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      console.error(err);
      toast({
        title: t('importFailed'),
        description: err?.message || "Failed to import backup. Please ensure the file is a valid OcularOCR backup JSON.",
        variant: "error"
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Save AI settings (include the full configs map to preserve other providers)
      const finalSettings: AISettings = {
        ...settings,
        apiKey: providerConfigs[settings.provider].apiKey,
        model: providerConfigs[settings.provider].model,
        endpoint: providerConfigs[settings.provider].endpoint,
        configs: providerConfigs,
      };
      const jsonStr = JSON.stringify(finalSettings);
      const { encrypted, iv } = await encryptString(jsonStr, cryptoKey);
      await saveSettings(encrypted, iv);
      
      // Save Theme settings
      if (theme === 'system') {
        localStorage.removeItem('vault_theme');
      } else {
        localStorage.setItem('vault_theme', theme);
      }

      // Save Font Size settings
      localStorage.setItem('vault_font_size', fontSize);

      // Save Language settings
      updateActiveLanguage(langLocal);
      
      toast({
        title: t('settingsSavedToast'),
        variant: "success"
      });
      onClose();
    } catch (err) {
      console.error("Failed to save settings", err);
      toast({
        title: t('saveFailedToast'),
        description: t('failedSaveSettings'),
        variant: "error"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetVault = async () => {
    if (!confirmReset) return;
    setIsResetting(true);
    try {
      // Clear localStorage configurations
      localStorage.removeItem('vault_theme');
      localStorage.removeItem('vault_font_size');
      localStorage.removeItem('vault_lang');
      
      // Clear database vault
      await clearVault();
      
      toast({
        title: t('resetSuccessTitle'),
        description: t('resetSuccessDesc'),
        variant: "success"
      });
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error("Failed to reset vault", err);
      toast({
        title: t('resetFailedTitle'),
        description: t('resetFailedDesc'),
        variant: "error"
      });
      setIsResetting(false);
    }
  };

  if (isLoading) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleCancel}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm px-0 md:px-4"
    >
      <motion.div 
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="flex flex-col md:flex-row w-full h-full md:h-[600px] md:max-h-[90vh] md:max-w-2xl bg-white dark:bg-slate-900 shadow-xl overflow-hidden text-slate-900 dark:text-slate-100 rounded-none md:rounded-lg"
      >
        {/* Sidebar */}
        <div className="w-full md:w-48 bg-slate-50 dark:bg-slate-800/50 p-3 md:p-4 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 flex flex-row md:flex-col gap-2 shrink-0 overflow-x-auto custom-scrollbar">
          <h2 className="hidden md:block mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-2">{t('settingsTitle')}</h2>
          
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`flex items-center justify-center md:justify-start gap-2 px-3 py-2 rounded text-xs font-medium transition-colors cursor-pointer flex-1 md:flex-none whitespace-nowrap ${
              activeTab === 'ai' 
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 font-bold' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800'
            }`}
          >
            <BrainCircuit className="h-4 w-4 shrink-0" />
            {t('aiSettingsTab')}
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('appearance')}
            className={`flex items-center justify-center md:justify-start gap-2 px-3 py-2 rounded text-xs font-medium transition-colors cursor-pointer flex-1 md:flex-none whitespace-nowrap ${
              activeTab === 'appearance' 
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 font-bold' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800'
            }`}
          >
            <Palette className="h-4 w-4 shrink-0" />
            {t('appearanceSettingsTab')}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('offline')}
            className={`flex items-center justify-center md:justify-start gap-2 px-3 py-2 rounded text-xs font-medium transition-colors cursor-pointer flex-1 md:flex-none whitespace-nowrap ${
              activeTab === 'offline' 
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 font-bold' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800'
            }`}
          >
            <ScanText className="h-4 w-4 shrink-0" />
            {t('offlineSettingsTab')}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('system-reset')}
            className={`flex items-center justify-center md:justify-start gap-2 px-3 py-2 rounded text-xs font-medium transition-colors cursor-pointer flex-1 md:flex-none whitespace-nowrap ${
              activeTab === 'system-reset' 
                ? 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 font-bold' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800'
            }`}
          >
            <ShieldAlert className="h-4 w-4 shrink-0" />
            {t('systemSettingsTab')}
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-5 md:p-6 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
          <form onSubmit={handleSave} className="flex-1 flex flex-col justify-between gap-5 min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
              <AnimatePresence mode="wait">
                {activeTab === 'ai' ? (
                  <motion.div
                    key="ai"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-col gap-4"
                  >
                    <div>
                      <label className="mb-1 block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('aiProviderLabel')}</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['gemini', 'openai', 'ollama'] as const).map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setSettings({ ...settings, provider: p })}
                            className={`rounded border py-2.5 text-xs font-bold capitalize transition-all cursor-pointer ${
                              settings.provider === p 
                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' 
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            {p === 'openai' ? 'OpenAI Compatible' : p === 'ollama' ? 'Ollama (Offline)' : 'Google Gemini'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 bg-slate-50/50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200/60 dark:border-slate-800">
                      <div>
                        <label className="mb-1 block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('modelNameLabel')}</label>
                        <input
                          type="text"
                          required
                          value={providerConfigs[settings.provider]?.model || ''}
                          onChange={(e) => setProviderConfigs({
                            ...providerConfigs,
                            [settings.provider]: { ...providerConfigs[settings.provider], model: e.target.value }
                          })}
                          placeholder={
                            settings.provider === 'gemini' ? 'gemini-3.5-flash' : 
                            settings.provider === 'openai' ? 'gpt-4o' : 'llama3'
                          }
                          className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:text-white"
                        />
                        {settings.provider === 'gemini' && (
                          <p className="mt-1.5 text-[10px] text-slate-500">{t('recommendedFlash')}</p>
                        )}
                        {settings.provider === 'openai' && (
                          <div className="mt-1.5 text-[10px] text-slate-500 space-y-1">
                            <p>• <span className="font-bold">OpenAI:</span> A vision model like <span className="font-bold text-slate-700 dark:text-slate-300">gpt-4o</span> is required for OCR.</p>
                            <p>• <span className="font-bold">Groq:</span> We highly recommend <span className="font-bold text-slate-700 dark:text-slate-300">meta-llama/llama-4-scout-17b-16e-instruct</span> (vision-enabled and extremely fast).</p>
                          </div>
                        )}
                      </div>

                      {settings.provider !== 'ollama' && (
                        <div>
                          <label className="mb-1 block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('apiKeyLabel')}</label>
                          <input
                            type="password"
                            value={providerConfigs[settings.provider]?.apiKey || ''}
                            onChange={(e) => setProviderConfigs({
                              ...providerConfigs,
                              [settings.provider]: { ...providerConfigs[settings.provider], apiKey: e.target.value }
                            })}
                            placeholder={`Enter your ${settings.provider === 'openai' ? 'OpenAI or Groq' : 'Gemini'} API key`}
                            className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:text-white"
                          />
                        </div>
                      )}

                      {(settings.provider === 'openai' || settings.provider === 'ollama') && (
                        <div>
                          <label className="mb-1 block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('apiEndpointLabel')}</label>
                          <input
                            type="text"
                            value={providerConfigs[settings.provider]?.endpoint || ''}
                            onChange={(e) => setProviderConfigs({
                              ...providerConfigs,
                              [settings.provider]: { ...providerConfigs[settings.provider], endpoint: e.target.value }
                            })}
                            placeholder={
                              settings.provider === 'ollama' ? 'http://localhost:11434/v1/chat/completions' : 
                              'https://api.openai.com/v1/chat/completions'
                            }
                            className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:text-white"
                          />
                          {settings.provider === 'openai' && (
                            <p className="mt-1 text-[9px] text-slate-400 dark:text-slate-500">
                              Leave blank for default OpenAI. For Groq, set to: <code className="bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 px-1 rounded text-[9px]">https://api.groq.com/openai/v1/chat/completions</code>
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-3 py-1">
                        <input
                          type="checkbox"
                          id="useLlmForOcr"
                          checked={settings.useLlmForOcr || false}
                          onChange={(e) => setSettings({ ...settings, useLlmForOcr: e.target.checked })}
                          className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 dark:bg-slate-900 cursor-pointer"
                        />
                        <label htmlFor="useLlmForOcr" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                          {t('useLlmOcrLabel')}
                          <span className="block text-[10px] text-slate-500 dark:text-slate-500 font-normal">{t('useLlmOcrSublabel')}</span>
                        </label>
                      </div>

                      {settings.useLlmForOcr && (
                        <div className="flex items-center gap-3 pl-6 py-1">
                          <input
                            type="checkbox"
                            id="structuredLlmOcr"
                            checked={settings.structuredLlmOcr || false}
                            onChange={(e) => setSettings({ ...settings, structuredLlmOcr: e.target.checked })}
                            className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 dark:bg-slate-900 cursor-pointer"
                          />
                          <label htmlFor="structuredLlmOcr" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                            {t('structuredOcrLabel')}
                            <span className="block text-[10px] text-slate-500 dark:text-slate-500 font-normal">{t('structuredOcrSub')}</span>
                          </label>
                        </div>
                      )}

                      <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-1 flex flex-col gap-3">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('modelTempLabel')}</label>
                            <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                              {(settings.temperature ?? 0.2).toFixed(1)}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.0"
                            max="1.0"
                            step="0.1"
                            value={settings.temperature ?? 0.2}
                            onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                            className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
                          />
                          <div className="flex justify-between text-[8px] text-slate-400 dark:text-slate-500 mt-1">
                            <span>{t('deterministic')}</span>
                            <span>{t('creative')}</span>
                          </div>
</div>

                        {/* Post-OCR Correction */}
                        <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <label htmlFor="enablePostOcrCorrection" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest cursor-pointer select-none">
                              {t('enablePostOcrCorrection')}
                              <span className="block text-[9px] text-slate-500 dark:text-slate-500 font-normal uppercase tracking-normal mt-0.5">{t('enablePostOcrCorrectionSub')}</span>
                            </label>
                            <input
                              type="checkbox"
                              id="enablePostOcrCorrection"
                              checked={settings.enablePostOcrCorrection ?? false}
                              onChange={(e) => setSettings({ ...settings, enablePostOcrCorrection: e.target.checked })}
                              className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 dark:bg-slate-900 cursor-pointer"
                            />
                          </div>

                          {(settings.enablePostOcrCorrection ?? false) && (
                            <div className="pl-3 border-l-2 border-slate-200 dark:border-slate-800 flex flex-col gap-2">
                              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('postOcrCorrectionPromptLabel')}</label>
                              <textarea
                                value={settings.postOcrCorrectionPrompt || ''}
                                onChange={(e) => setSettings({ ...settings, postOcrCorrectionPrompt: e.target.value })}
                                placeholder="Leave empty for default: Fix OCR errors, preserve structure..."
                                rows={2}
                                className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:text-white font-mono custom-scrollbar"
                              />
                              <p className="text-[8px] text-slate-400 dark:text-slate-500">
                                {t('postOcrCorrectionPromptHelp')}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="mt-1">
                          <button
                            type="button"
                            onClick={() => setShowAdvancedAI(!showAdvancedAI)}
                            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer flex items-center gap-1 focus:outline-none"
                          >
                            {showAdvancedAI ? t('hideAdvancedPrompt') : t('showAdvancedPrompt')}
                          </button>

                          {showAdvancedAI && (
                            <div className="mt-3 flex flex-col gap-3 pl-1 border-l-2 border-indigo-100 dark:border-indigo-900/60">
                              <div>
                                <label className="mb-1 block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('customOcrPromptLabel')}</label>
                                <textarea
                                  value={settings.customOcrPrompt || ''}
                                  onChange={(e) => setSettings({ ...settings, customOcrPrompt: e.target.value })}
                                  placeholder="Leave empty for default instructions..."
                                  rows={2}
                                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:text-white font-mono custom-scrollbar"
                                />
                                <p className="mt-0.5 text-[8px] text-slate-400 dark:text-slate-500">
                                  {t('customOcrPromptHelp')}
                                </p>
                              </div>

                              <div>
                                <label className="mb-1 block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('customSummaryPromptLabel')}</label>
                                <textarea
                                  value={settings.customSummaryPrompt || ''}
                                  onChange={(e) => setSettings({ ...settings, customSummaryPrompt: e.target.value })}
                                  placeholder="E.g. Summarize this in 3 bullet points: {{text}}"
                                  rows={2}
                                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:text-white font-mono custom-scrollbar"
                                />
                                <p className="mt-0.5 text-[8px] text-slate-400 dark:text-slate-500">
                                  {t('customSummaryPromptHelp')}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : activeTab === 'offline' ? (
                  <motion.div
                    key="offline"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-col gap-4"
                  >
                    <div>
                      <label className="mb-1 block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('autoTagStrategyLabel')}</label>
                      <select
                        value={settings.autoTagStrategy || 'hybrid'}
                        onChange={(e) => setSettings({ ...settings, autoTagStrategy: e.target.value as any })}
                        className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:text-white"
                      >
                        <option value="hybrid">{t('autoTagHybrid')}</option>
                        <option value="local">{t('autoTagLocal')}</option>
                        <option value="none">{t('autoTagNone')}</option>
                      </select>
                      <p className="mt-1 text-[9px] text-slate-400 dark:text-slate-500">
                        {t('autoTagHelp')}
                      </p>
                    </div>

                    {/* Image Preprocessing Section */}
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <label htmlFor="enablePreprocessing" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest cursor-pointer select-none">
                          {t('enablePreprocessingLabel')}
                          <span className="block text-[9px] text-slate-500 dark:text-slate-500 font-normal uppercase tracking-normal mt-0.5">{t('enablePreprocessingSub')}</span>
                        </label>
                        <input
                          type="checkbox"
                          id="enablePreprocessing"
                          checked={settings.enablePreprocessing ?? true}
                          onChange={(e) => setSettings({ ...settings, enablePreprocessing: e.target.checked })}
                          className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 dark:bg-slate-900 cursor-pointer"
                        />
                      </div>

                      {(settings.enablePreprocessing ?? true) && (
                        <div className="grid grid-cols-2 gap-2 pl-3 border-l-2 border-slate-200 dark:border-slate-800 py-1 transition-all">
                          {[
                            { key: 'preprocessingGrayscale', label: t('grayscaleToggle') },
                            { key: 'preprocessingContrast', label: t('contrastToggle') },
                            { key: 'preprocessingDenoise', label: t('denoiseToggle') },
                            { key: 'preprocessingDeskew', label: t('deskewToggle') },
                            { key: 'preprocessingRotate', label: t('rotateToggle') },
                            { key: 'preprocessingBinarize', label: t('binarizeToggle') }
                          ].map((step) => (
                            <div key={step.key} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={step.key}
                                checked={(settings as any)[step.key] ?? false}
                                onChange={(e) => setSettings({ ...settings, [step.key]: e.target.checked })}
                                className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-700 text-indigo-500 focus:ring-indigo-500 dark:bg-slate-900 cursor-pointer"
                              />
                              <label htmlFor={step.key} className="text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                                {step.label}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}

                      {(settings.enablePreprocessing ?? true) && settings.preprocessingRotate && (
                        <div className="pl-3 border-l-2 border-slate-200 dark:border-slate-800 flex flex-col gap-1.5">
                          <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                            <span>{t('rotationThresholdLabel')}</span>
                            <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{settings.rotationThreshold ?? 3.0}</span>
                          </div>
                          <input
                            type="range"
                            min="1.0"
                            max="10.0"
                            step="0.5"
                            value={settings.rotationThreshold ?? 3.0}
                            onChange={(e) => setSettings({ ...settings, rotationThreshold: parseFloat(e.target.value) })}
                            className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
                          />
                        </div>
                      )}
                    </div>

                    {/* PDF Render Scale */}
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <label htmlFor="pdfRenderScale" className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest cursor-pointer select-none">
                          {t('pdfRenderScaleLabel')}
                          <span className="block text-[9px] text-slate-500 dark:text-slate-500 font-normal uppercase tracking-normal mt-0.5">{t('pdfRenderScaleSub')}</span>
                        </label>
                        <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {settings.pdfRenderScale ?? 2.0}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1.5"
                        max="4.0"
                        step="0.5"
                        value={settings.pdfRenderScale ?? 2.0}
                        onChange={(e) => setSettings({ ...settings, pdfRenderScale: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
                      />
                    </div>

                    {/* OCR Languages Section */}
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex flex-col gap-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                        {t('ocrLanguagesLabel')}
                        <span className="block text-[9px] text-slate-500 dark:text-slate-500 font-normal uppercase tracking-normal mt-0.5">{t('ocrLanguagesSub')}</span>
                      </label>

                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {[
                          { code: 'eng', label: 'English', bundled: true },
                          { code: 'ind', label: 'Indonesian', bundled: true },
                          { code: 'spa', label: 'Spanish', bundled: false },
                          { code: 'fra', label: 'French', bundled: false },
                          { code: 'deu', label: 'German', bundled: false },
                          { code: 'chi_sim', label: 'Chinese (Simp)', bundled: false },
                          { code: 'jpn', label: 'Japanese', bundled: false },
                          { code: 'ara', label: 'Arabic', bundled: false },
                          { code: 'hin', label: 'Hindi', bundled: false },
                        ].map((lang) => {
                          const isSelected = (settings.ocrLanguages || ['eng']).includes(lang.code);
                          return (
                            <button
                              key={lang.code}
                              type="button"
                              onClick={() => {
                                const current = settings.ocrLanguages || ['eng'];
                                let next;
                                if (isSelected) {
                                  if (current.length <= 1) return;
                                  next = current.filter(c => c !== lang.code);
                                } else {
                                  next = [...current, lang.code];
                                }
                                setSettings({ ...settings, ocrLanguages: next });
                              }}
                              className={`px-2.5 py-1.5 rounded text-[10px] font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                                isSelected 
                                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300' 
                                  : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                              }`}
                            >
                              {lang.label}
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                lang.bundled ? 'bg-green-500' : 'bg-blue-400'
                              }`} title={lang.bundled ? 'Offline' : 'Requires Download'} />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Handwriting Mode */}
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <label htmlFor="handwritingMode" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest cursor-pointer select-none">
                          {t('handwritingMode')}
                          <span className="block text-[9px] text-slate-500 dark:text-slate-500 font-normal uppercase tracking-normal mt-0.5">{t('handwritingModeSub')}</span>
                        </label>
                        <input
                          type="checkbox"
                          id="handwritingMode"
                          checked={settings.handwritingMode ?? false}
                          onChange={(e) => setSettings({ ...settings, handwritingMode: e.target.checked })}
                          className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 dark:bg-slate-900 cursor-pointer"
                        />
                      </div>
                      {(settings.handwritingMode ?? false) && (
                        <div className="flex items-start gap-2 rounded bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-2.5 text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span>{t('handwritingModeWarning')}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ) : activeTab === 'appearance' ? (
                  <motion.div
                    key="appearance"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-col gap-4"
                  >
                    <div>
                      <label className="mb-1 block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('colorThemeLabel')}</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['light', 'dark', 'system'] as const).map((tVal) => (
                          <button
                            key={tVal}
                            type="button"
                            onClick={() => setTheme(tVal)}
                            className={`rounded border py-2 text-xs font-bold capitalize transition-all cursor-pointer ${
                              theme === tVal 
                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' 
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            {tVal === 'light' ? t('themeLight') : tVal === 'dark' ? t('themeDark') : t('themeSystem')}
                          </button>
                        ))}
                      </div>
                      <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        {t('colorThemeHelp')}
                      </p>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                      <label className="mb-1 block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('fontSizeScaleLabel')}</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['small', 'medium', 'large'] as const).map((sz) => (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => setFontSize(sz)}
                            className={`rounded border py-2 text-xs font-bold capitalize transition-all cursor-pointer ${
                              fontSize === sz 
                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' 
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            {sz === 'small' ? t('fontSizeSmall') : sz === 'medium' ? t('fontSizeMedium') : t('fontSizeLarge')}
                          </button>
                        ))}
                      </div>
                      <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        {t('fontSizeHelp')}
                      </p>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                      <label className="mb-1 block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('languageLabel')}</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['en', 'id'] as const).map((lang) => (
                          <button
                            key={lang}
                            type="button"
                            onClick={() => setLangLocal(lang)}
                            className={`rounded border py-2 text-xs font-bold capitalize transition-all cursor-pointer ${
                              langLocal === lang 
                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' 
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            {lang === 'en' ? 'English' : 'Bahasa Indonesia'}
                          </button>
                        ))}
                      </div>
                      <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        {t('languageHelp')}
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="system-reset"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-col gap-4"
                  >
                    {/* Passkey Biometric Section */}
                    <div className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl p-4 flex flex-col gap-3">
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5 text-nowrap">
                          <Fingerprint className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
                          {t('biometricUnlockLabel')}
                        </h3>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                          {t('biometricUnlockHelp')}
                        </p>
                      </div>

                      {!isPrfSupported ? (
                        <div className="rounded bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-2.5 text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
                          {t('biometricsUnavailableHelp')}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 mt-1">
                          {hasPasskey ? (
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/20 dark:bg-indigo-950/10">
                              <div className="flex items-center gap-2">
                                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-300">{t('biometricUnlockLinkedText')}</span>
                              </div>
                              <button
                                type="button"
                                disabled={isPasskeyLoading}
                                onClick={handleRemovePasskey}
                                className="rounded bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                              >
                                {t('disableBiometricsBtn')}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={isPasskeyLoading}
                              onClick={handleRegisterPasskey}
                              className="w-full rounded bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-3 py-2 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-sm"
                            >
                              {isPasskeyLoading ? (
                                <>
                                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                  {t('registeringBiometricsText')}
                                </>
                              ) : (
                                <>
                                  <Fingerprint className="h-3.5 w-3.5" />
                                  {t('linkTouchFaceBtn')}
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Backup & Import Section */}
                    <div className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl p-4 flex flex-col gap-3">
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                          <Download className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
                          {t('vaultBackupTitle')}
                        </h3>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                          {t('vaultBackupHelp')}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                        <button
                          type="button"
                          disabled={isExporting}
                          onClick={handleExportBackup}
                          className="rounded border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 px-3 py-2.5 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {isExporting ? (
                            <>
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              {t('exporting')}
                            </>
                          ) : (
                            <>
                              <Download className="h-3.5 w-3.5" />
                              {t('exportEncryptedBtn')}
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          disabled={isImporting}
                          onClick={() => fileInputRef.current?.click()}
                          className="rounded border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-2.5 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {isImporting ? (
                            <>
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              {t('importing')}
                            </>
                          ) : (
                            <>
                              <FileUp className="h-3.5 w-3.5" />
                              {t('importEncryptedBtn')}
                            </>
                          )}
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".json"
                          className="hidden"
                          onChange={handleImportBackup}
                        />
                      </div>
                    </div>

                    {/* Version Control Section */}
                    <div className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl p-4 flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                            {t('appUpdateTitle')}
                          </h3>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                            {t('appUpdateHelp')}
                          </p>
                        </div>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-full font-mono text-slate-600 dark:text-slate-400 font-bold shrink-0">
                          v{currentVersion}
                        </span>
                      </div>

                      {updateAvailable ? (
                        <div className="mt-1 border border-emerald-200 dark:border-emerald-950/60 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-lg p-3 flex flex-col gap-2">
                          <div className="flex items-start gap-2">
                            <ArrowDownToLine className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                                {t('updateAvailableBadgeTitle', { version: latestVersion })}
                              </h4>
                              <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 leading-relaxed mt-0.5">
                                {t('updateAvailableBadgeHelp')}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={performUpdate}
                            className="w-full mt-1 rounded-md bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 px-3 py-2 text-xs font-bold text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <ArrowDownToLine className="h-3.5 w-3.5" />
                            {t('updateHardRefreshBtn')}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            type="button"
                            disabled={isCheckingVersion}
                            onClick={handleManualCheck}
                            className="w-full rounded border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-2 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            <RefreshCw className={`h-3 w-3 ${isCheckingVersion ? 'animate-spin' : ''}`} />
                            {isCheckingVersion ? t('checkingUpdatesText') : t('checkForUpdatesBtnText')}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="border border-red-200 dark:border-red-950/60 bg-red-50/50 dark:bg-red-950/10 rounded p-4 flex flex-col gap-3">
                      <h3 className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertTriangle className="h-4.5 w-4.5" />
                        {t('resetVaultStorageTitle')}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {t('resetVaultStorageHelp')}
                      </p>

                      <div className="flex items-start gap-2.5 py-1">
                        <input
                          type="checkbox"
                          id="confirmReset"
                          checked={confirmReset}
                          onChange={(e) => setConfirmReset(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-red-600 focus:ring-red-500 dark:bg-slate-900 cursor-pointer mt-0.5"
                        />
                        <label htmlFor="confirmReset" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                          {t('understandResetConfirm')}
                        </label>
                      </div>

                      <button
                        type="button"
                        disabled={!confirmReset || isResetting}
                        onClick={handleResetVault}
                        className="mt-2 w-full rounded bg-red-600 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
                      >
                        {isResetting ? t('resettingVaultText') : t('permanentlyDeleteBtn')}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {activeTab !== 'system-reset' && (
              <div className="pt-4 flex justify-end shrink-0 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 rounded bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50 cursor-pointer shadow-sm w-full md:w-auto justify-center"
                >
                  <Check className="h-3.5 w-3.5" />
                  {t('saveSettingsBtn')}
                </button>
              </div>
            )}
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}
