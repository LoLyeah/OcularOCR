import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Lock, Settings, FileText, Upload, BrainCircuit, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FileManager } from './file-manager';
import { DocumentViewer } from './document-viewer';
import { SettingsModal } from './settings-modal';
import { Guide } from './guide';
import { DocumentEntry } from '@/lib/storage';

interface DashboardProps {
  cryptoKey: CryptoKey;
  onLock: () => void;
}

export function Dashboard({ cryptoKey, onLock }: DashboardProps) {
  const [activeDoc, setActiveDoc] = useState<DocumentEntry | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'files' | 'guide'>('files');

  return (
    <div className="flex flex-col h-screen w-full bg-[#F1F5F9] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      <header className="h-12 flex items-center justify-between px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Image src="/icon.svg" width={28} height={28} className="rounded-md select-none" alt="Ocular AI Vault logo" referrerPolicy="no-referrer" />
            <span className="font-bold tracking-tight text-sm">Ocular AI <span className="text-indigo-600 dark:text-indigo-400 font-medium text-[10px] ml-1 px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 rounded border border-indigo-100 dark:border-indigo-800 uppercase tracking-widest">Vault</span></span>
          </div>
          
          <nav className="flex gap-1 ml-6">
            <button 
              onClick={() => { setActiveTab('files'); setActiveDoc(null); }}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${activeTab === 'files' && !activeDoc ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
            >
              Files
            </button>
            <button 
              onClick={() => setShowSettings(true)} 
              className="px-3 py-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded transition-colors"
            >
              Settings
            </button>
            <button 
              onClick={() => { setActiveTab('guide'); setActiveDoc(null); }}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1 ${activeTab === 'guide' ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              Guide
            </button>
          </nav>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50 rounded-full text-[10px] font-bold">
            <span className="w-1.5 h-1.5 bg-green-500 dark:bg-green-400 rounded-full"></span>
            LOCAL ENCRYPTED
          </div>
          <button
            onClick={onLock}
            title="Lock Vault"
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
          >
            <Lock className="h-4 w-4" />
          </button>
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
  );
}
