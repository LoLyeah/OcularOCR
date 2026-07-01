import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Lock, Settings, FileText, Upload, BrainCircuit, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FileManager } from './file-manager';
import { DocumentViewer } from './document-viewer';
import { SettingsModal } from './settings-modal';
import { Guide } from './guide';
import { DocumentEntry } from '@/lib/storage';
import { ToastProvider } from './toast';

interface DashboardProps {
  cryptoKey: CryptoKey;
  onLock: () => void;
}

export function Dashboard({ cryptoKey, onLock }: DashboardProps) {
  const [activeDoc, setActiveDoc] = useState<DocumentEntry | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'files' | 'guide'>('files');

  return (
    <ToastProvider>
      <div className="flex flex-col h-screen w-full bg-[#F1F5F9] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
        <header className="h-12 flex items-center justify-between px-3 sm:px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 z-20">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Image src="/icon.svg" width={24} height={24} className="rounded-md select-none sm:w-[28px] sm:h-[28px]" alt="OcularOCR logo" referrerPolicy="no-referrer" />
              <span className="font-bold tracking-tight text-xs sm:text-sm hidden xs:inline">OcularOCR</span>
            </div>
            
            <nav className="flex gap-1 ml-2 sm:ml-6">
              <button 
                onClick={() => { setActiveTab('files'); setActiveDoc(null); }}
                className={`relative px-2 sm:px-3 py-1 text-[11px] sm:text-xs font-medium rounded transition-colors cursor-pointer ${activeTab === 'files' && !activeDoc ? 'text-slate-800 dark:text-slate-200 font-semibold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                {activeTab === 'files' && !activeDoc && (
                  <motion.span 
                    layoutId="active-nav-tab" 
                    className="absolute inset-0 bg-slate-100 dark:bg-slate-800 rounded z-0"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10">Files</span>
              </button>
              <button 
                onClick={() => setShowSettings(true)} 
                className="px-2 sm:px-3 py-1 text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded transition-colors cursor-pointer"
              >
                Settings
              </button>
              <button 
                onClick={() => { setActiveTab('guide'); setActiveDoc(null); }}
                className={`relative px-2 sm:px-3 py-1 text-[11px] sm:text-xs font-medium rounded transition-colors flex items-center gap-1 cursor-pointer ${activeTab === 'guide' ? 'text-slate-800 dark:text-slate-200 font-semibold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                {activeTab === 'guide' && (
                  <motion.span 
                    layoutId="active-nav-tab" 
                    className="absolute inset-0 bg-slate-100 dark:bg-slate-800 rounded z-0"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1">
                  <BookOpen className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  Guide
                </span>
              </button>
            </nav>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50 rounded-full text-[10px] font-bold">
              <span className="w-1.5 h-1.5 bg-green-500 dark:bg-green-400 rounded-full"></span>
              LOCAL ENCRYPTED
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onLock}
              title="Lock Vault"
              aria-label="Lock Vault"
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-pointer"
            >
              <Lock className="h-4 w-4" />
            </motion.button>
          </div>
        </header>
  
        <main className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {activeTab === 'guide' ? (
              <Guide key="guide" />
            ) : activeDoc ? (
              <DocumentViewer
                key="viewer"
                doc={activeDoc}
                cryptoKey={cryptoKey}
                onClose={() => setActiveDoc(null)}
              />
            ) : (
              <FileManager
                key="manager"
                cryptoKey={cryptoKey}
                onOpenDoc={(doc) => {
                  setActiveTab('files');
                  setActiveDoc(doc);
                }}
              />
            )}
          </AnimatePresence>
        </main>
  
        <AnimatePresence>
          {showSettings && (
            <SettingsModal 
              cryptoKey={cryptoKey} 
              onClose={() => setShowSettings(false)} 
            />
          )}
        </AnimatePresence>
      </div>
    </ToastProvider>
  );
}
