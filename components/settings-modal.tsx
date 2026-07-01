import { useState, useEffect } from 'react';
import { X, Check, BrainCircuit, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AISettings, getSettings, saveSettings } from '@/lib/storage';
import { encryptString, decryptString } from '@/lib/crypto';
import { useToast } from './toast';

interface SettingsModalProps {
  cryptoKey: CryptoKey;
  onClose: () => void;
}

export function SettingsModal({ cryptoKey, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'ai' | 'appearance'>('ai');
  const [settings, setSettings] = useState<AISettings>({
    provider: 'gemini',
    apiKey: '',
    endpoint: '',
    model: ''
  });
  
  // Keep track of provider-specific inputs so they don't bleed into each other
  const [providerConfigs, setProviderConfigs] = useState<Record<string, { apiKey: string; endpoint: string; model: string }>>({
    gemini: { apiKey: '', endpoint: '', model: '' },
    openai: { apiKey: '', endpoint: '', model: '' },
    ollama: { apiKey: '', endpoint: '', model: '' },
  });
  
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [initialTheme, setInitialTheme] = useState<'light' | 'dark' | 'system'>('system');
  
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function load() {
      // Load Theme settings
      const storedTheme = localStorage.getItem('vault_theme');
      const currentTheme = (storedTheme === 'light' || storedTheme === 'dark') ? storedTheme : 'system';
      setTheme(currentTheme);
      setInitialTheme(currentTheme);

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
          setSettings(parsed);
          
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
    onClose();
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
      
      toast({
        title: "Settings saved",
        variant: "success"
      });
      onClose();
    } catch (err) {
      console.error("Failed to save settings", err);
      toast({
        title: "Save failed",
        description: "Failed to encrypt and store the settings.",
        variant: "error"
      });
    } finally {
      setIsSaving(false);
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
        className="flex flex-col md:flex-row w-full h-full md:h-auto md:max-h-[90vh] md:max-w-2xl bg-white dark:bg-slate-900 shadow-xl overflow-hidden text-slate-900 dark:text-slate-100 rounded-none md:rounded-lg"
      >
        {/* Sidebar */}
        <div className="w-full md:w-48 bg-slate-50 dark:bg-slate-800/50 p-3 md:p-4 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 flex flex-row md:flex-col gap-2 shrink-0 overflow-x-auto custom-scrollbar">
          <h2 className="hidden md:block mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-2">Settings</h2>
          
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center justify-center md:justify-start gap-2 px-3 py-2 rounded text-xs font-medium transition-colors cursor-pointer flex-1 md:flex-none whitespace-nowrap ${
              activeTab === 'ai' 
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 font-bold' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800'
            }`}
          >
            <BrainCircuit className="h-4 w-4 shrink-0" />
            AI Processing
          </button>
          
          <button
            onClick={() => setActiveTab('appearance')}
            className={`flex items-center justify-center md:justify-start gap-2 px-3 py-2 rounded text-xs font-medium transition-colors cursor-pointer flex-1 md:flex-none whitespace-nowrap ${
              activeTab === 'appearance' 
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 font-bold' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800'
            }`}
          >
            <Palette className="h-4 w-4 shrink-0" />
            Appearance
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-5 md:p-6 flex flex-col min-h-0 overflow-y-auto">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold">{activeTab === 'ai' ? 'AI Processing Configuration' : 'Appearance Settings'}</h2>
            <button onClick={handleCancel} className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSave} className="flex flex-col gap-4 flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
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
                      <label className="mb-1 block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Provider</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['gemini', 'openai', 'ollama'] as const).map((prov) => (
                          <button
                            key={prov}
                            type="button"
                            onClick={() => {
                              setSettings({ ...settings, provider: prov });
                            }}
                            className={`rounded border py-2 text-xs font-bold transition-all cursor-pointer ${
                              settings.provider === prov 
                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' 
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            {prov === 'gemini' ? 'Gemini' : prov === 'openai' ? 'OpenAI Compatible' : 'Ollama'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Model Identifier</label>
                      <input
                        type="text"
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
                        <p className="mt-1.5 text-[10px] text-slate-500">Recommended: <span className="font-bold text-slate-700 dark:text-slate-300">gemini-3.5-flash</span></p>
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
                        <label className="mb-1 block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">API Key</label>
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
                        <label className="mb-1 block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">API Endpoint URL</label>
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

                    <div className="flex items-center gap-3 py-2">
                      <input
                        type="checkbox"
                        id="useLlmForOcr"
                        checked={settings.useLlmForOcr || false}
                        onChange={(e) => setSettings({ ...settings, useLlmForOcr: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 dark:bg-slate-900 cursor-pointer"
                      />
                      <label htmlFor="useLlmForOcr" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                        Use LLM Vision for OCR Data Extraction
                        <span className="block text-[10px] text-slate-500 dark:text-slate-500 font-normal">Extract text more intelligently using the AI model (requires vision support).</span>
                      </label>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="appearance"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-col gap-4"
                  >
                    <div>
                      <label className="mb-1 block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Color Theme</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['light', 'dark', 'system'] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setTheme(t)}
                            className={`rounded border py-2 text-xs font-bold capitalize transition-all cursor-pointer ${
                              theme === t 
                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' 
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                      <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Choose how the vault looks. &quot;System&quot; will match your operating system&apos;s dark or light mode preference.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="pt-4 flex justify-end shrink-0">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 rounded bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50 cursor-pointer shadow-sm w-full md:w-auto justify-center"
              >
                <Check className="h-3.5 w-3.5" />
                Save Settings
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}
