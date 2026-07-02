'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  ShieldCheck, 
  Cpu, 
  HelpCircle, 
  Search, 
  FileText, 
  Key, 
  Settings, 
  MessageSquare, 
  Copy, 
  Check, 
  Terminal, 
  RefreshCw, 
  Code,
  Info,
  ChevronRight,
  ExternalLink,
  Lock,
  Smartphone,
  Download,
  Tag,
  Eye,
  Menu,
  X,
  Play
} from 'lucide-react';
import { getSalt } from '@/lib/storage';
import { useIsMobile } from '@/hooks/use-mobile';


interface Article {
  id: string;
  category: 'introduction' | 'user_guide' | 'api_guide' | 'faq';
  title: string;
  icon: any;
  renderContent: () => React.ReactNode;
}

function ModelRegistry() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  const models = [
    {
      name: 'GPT-5.2',
      description: 'OpenAI’s premier proprietary vision-language foundation model. S-tier precision, state-of-the-art visual grounding, and high-fidelity structured JSON layouts.',
      provider: 'OpenAI',
      logoType: 'openai',
      badge: 'Frontier VLM',
      context: '256K Tokens',
      accuracy: 99.3,
      accuracyStr: '99.3%',
      optimizedFor: 'Audit Reports & Structured Tables',
      type: 'proprietary'
    },
    {
      name: 'Claude 4.6',
      description: 'Anthropic’s leading reasoning VLM. Exceptional layout reconstruction, extreme factual consistency, and visual action/computer-use capabilities.',
      provider: 'Anthropic',
      logoType: 'anthropic',
      badge: 'Reasoning SOTA',
      context: '200K Tokens',
      accuracy: 99.0,
      accuracyStr: '99.0%',
      optimizedFor: 'Complex Invoices & Handwritings',
      type: 'proprietary'
    },
    {
      name: 'Gemini 3 Pro',
      description: 'Google’s massive-context flagship model. Natively multimodal, permitting direct analysis of multi-thousand-page visual documents and full PDF archives.',
      provider: 'Google',
      logoType: 'google',
      badge: 'Infinite Context',
      context: '2M Tokens',
      accuracy: 98.9,
      accuracyStr: '98.9%',
      optimizedFor: 'Long-Form Books & PDF Libraries',
      type: 'proprietary'
    },
    {
      name: 'Gemini 3.5 Flash',
      description: 'Google’s low-latency multimodal speedster. Engineered for rapid visual parsing, sub-second responses, and cost-effective bulk OCR workloads.',
      provider: 'Google',
      logoType: 'google',
      badge: 'OCR Speedster',
      context: '1M Tokens',
      accuracy: 96.8,
      accuracyStr: '96.8%',
      optimizedFor: 'High-Throughput Mobile Ingestions',
      type: 'proprietary'
    },
    {
      name: 'Qwen3.5-397B-A17B',
      description: 'Alibaba’s state-of-the-art Mixture-of-Experts (MoE) VLM. High-resolution spatial-temporal visual token routing for dense visual document reasoning.',
      provider: 'Qwen',
      logoType: 'qwen',
      badge: 'MoE VLM',
      context: '128K Tokens',
      accuracy: 97.9,
      accuracyStr: '97.9%',
      optimizedFor: 'Multilingual Document Understanding',
      type: 'open-source'
    },
    {
      name: 'GOT-OCR 2.0',
      description: 'A dedicated, highly optimized layout and math-aware OCR specialist. Unified pixel-to-text token model natively handling charts, formulas, and complex tables.',
      provider: 'GOT-OCR',
      logoType: 'default',
      badge: 'Layout Specialist',
      context: '16K Tokens',
      accuracy: 98.2,
      accuracyStr: '98.2%',
      optimizedFor: 'Mathematical Formulas & Raw Charts',
      type: 'open-source'
    },
    {
      name: 'DeepSeek-OCR 2 (3B)',
      description: 'DeepSeek’s lightweight yet powerful layout-aware document reader. Employs DeepEncoder V2 for native spatial text sequence comprehension.',
      provider: 'DeepSeek',
      logoType: 'deepseek',
      badge: 'DeepEncoder V2',
      context: '128K Tokens',
      accuracy: 94.8,
      accuracyStr: '94.8%',
      optimizedFor: 'Dense Scanning & Cost-Saving local VLM',
      type: 'open-source'
    },
    {
      name: 'Surya v2',
      description: 'A 650M parameter ultra-fast CPU-efficient multilingual document parser. Provides high-fidelity paragraph-level bounding box layouts.',
      provider: 'Surya',
      logoType: 'default',
      badge: 'CPU Efficient',
      context: '8K Tokens',
      accuracy: 92.5,
      accuracyStr: '92.5%',
      optimizedFor: 'On-Device Text Line Layout Segmentation',
      type: 'open-source'
    },
    {
      name: 'Mistral OCR 4',
      description: 'Mistral’s premier layout-to-markdown API pipeline. Directly transforms visual inputs into structured paragraph hierarchies and JSON structures.',
      provider: 'Mistral',
      logoType: 'mistral',
      badge: 'Markdown Master',
      context: '32K Tokens',
      accuracy: 97.4,
      accuracyStr: '97.4%',
      optimizedFor: 'API Bounding Boxes & Markdown Layouts',
      type: 'proprietary'
    },
    {
      name: 'PaddleOCR v4',
      description: 'Baidu’s industrial-scale production OCR. Exceptional throughput, industrial reliability, and top-tier accuracy for CJK multilingual documents.',
      provider: 'Baidu',
      logoType: 'default',
      badge: 'Industrial Standard',
      context: '4K Tokens',
      accuracy: 97.1,
      accuracyStr: '97.1%',
      optimizedFor: 'High-Volume Production CJK Streams',
      type: 'open-source'
    }
  ];

  const filteredModels = models.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) || 
                          m.description.toLowerCase().includes(search.toLowerCase()) || 
                          m.optimizedFor.toLowerCase().includes(search.toLowerCase());
    
    if (filter === 'all') return matchesSearch;
    return matchesSearch && m.type === filter;
  });

  const borderColors: Record<string, string> = {
    openai: 'border-emerald-200 dark:border-emerald-950/40 bg-emerald-50/5 dark:bg-emerald-950/5 hover:border-emerald-400 dark:hover:border-emerald-800/80',
    anthropic: 'border-amber-200 dark:border-amber-950/40 bg-amber-50/5 dark:bg-amber-950/5 hover:border-amber-400 dark:hover:border-amber-800/80',
    google: 'border-blue-200 dark:border-blue-950/40 bg-blue-50/5 dark:bg-blue-950/5 hover:border-blue-400 dark:hover:border-blue-800/80',
    deepseek: 'border-cyan-200 dark:border-cyan-950/40 bg-cyan-50/5 dark:bg-cyan-950/5 hover:border-cyan-400 dark:hover:border-cyan-800/80',
    mistral: 'border-orange-200 dark:border-orange-950/40 bg-orange-50/5 dark:bg-orange-950/5 hover:border-orange-400 dark:hover:border-orange-800/80',
    default: 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
  };

  return (
    <div className="space-y-5">
      {/* Metrics Header Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 p-3 rounded-xl flex flex-col justify-center shadow-xs">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">Total Models</span>
          <span className="text-base sm:text-lg font-black text-slate-800 dark:text-white mt-0.5">{filteredModels.length}</span>
        </div>
        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 p-3 rounded-xl flex flex-col justify-center shadow-xs">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">Elite (98%+)</span>
          <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
            {filteredModels.filter(m => m.accuracy >= 98).length} <span className="text-[10px] font-normal text-slate-400">sota</span>
          </span>
        </div>
        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 p-3 rounded-xl flex flex-col justify-center shadow-xs">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">Max Context</span>
          <span className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">2M <span className="text-[10px] font-bold text-slate-400">Tkn</span></span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search vision models, strengths..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
          />
        </div>
        
        {/* Filter Badges */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg relative self-start sm:self-auto border border-slate-200/10">
          {[
            { id: 'all', label: 'All Models' },
            { id: 'proprietary', label: 'Proprietary' },
            { id: 'open-source', label: 'Open-Source' }
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setFilter(p.id)}
              className={`relative px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                filter === p.id 
                  ? 'text-slate-800 dark:text-slate-100 font-semibold' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {filter === p.id && (
                <motion.span 
                  layoutId="brand-filter-pill" 
                  className="absolute inset-0 bg-white dark:bg-slate-700 rounded-md shadow-sm z-0"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10">{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid of 10 Models */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredModels.map(m => {
          const isSelected = selectedModel === m.name;
          const themeClass = borderColors[m.logoType] || borderColors.default;
          
          return (
            <motion.div
              layout
              whileHover={{ y: -3, transition: { duration: 0.15 } }}
              key={m.name}
              onClick={() => setSelectedModel(isSelected ? null : m.name)}
              className={`p-3.5 rounded-xl border cursor-pointer flex flex-col justify-between transition-all duration-200 ${themeClass} ${
                isSelected 
                  ? 'ring-2 ring-indigo-500/50 border-transparent shadow-md' 
                  : 'shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {m.logoType === 'anthropic' && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 text-amber-700 dark:text-amber-400 shadow-xs font-serif text-[11px] font-black">
                        A
                      </div>
                    )}
                    {m.logoType === 'google' && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-blue-50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/30 text-blue-600 dark:text-blue-400 shadow-xs">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.22-.63-.35-1.3-.35-1.97z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                        </svg>
                      </div>
                    )}
                    {m.logoType === 'openai' && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 shadow-xs">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M21.7 10.8c-.3-.8-.9-1.5-1.7-1.9.1-.3.2-.6.2-1 0-1.8-1.5-3.3-3.3-3.3-.3 0-.6.1-.9.2-.4-.8-1.1-1.4-1.9-1.7-.8-.3-1.7-.3-2.5 0-.4.3-.7.6-.9 1-.3-.1-.6-.2-.9-.2-1.8 0-3.3 1.5-3.3 3.3 0 .3.1.6.2.9-.8.4-1.4 1.1-1.7 1.9-.3.8-.3 1.7 0 2.5.3.4.6.7 1 .9-.1.3-.2.6-.2.9 0 1.8 1.5 3.3 3.3 3.3.3 0 .6-.1.9-.2.4.8 1.1 1.4 1.9 1.7.4.1.8.2 1.2.2.4 0 .9-.1 1.3-.2.4-.3.7-.6.9-1 .3.1.6.2.9.2 1.8 0 3.3-1.5 3.3-3.3 0-.3-.1-.6-.2-.9.8-.4 1.4-1.1 1.7-1.9.4-.8.4-1.7.1-2.5zm-5-5.9c.9 0 1.7.7 1.7 1.7 0 .2-.1.5-.2.7l-.3.4.4.2c1 .5 1.5 1.5 1.2 2.6l-.1.4.3.3c.7.7.9 1.7.5 2.6l-.2.4.4.2c.7.7 1.7.9 2.6.5l-.2.4.4.2c.9.5 1.4 1.5 1.1 2.5-.3 1-1.2 1.6-2.2 1.6-.2 0-.5-.1-.7-.2l-.4-.2-.2.4c-.5 1-1.5 1.5-2.6 1.2l-.4-.1-.3.3c-.7.7-1.7.9-2.6.5l-.4-.2-.2.4c-.5.9-1.5 1.4-2.5 1.1-1-.3-1.6-1.2-1.6-2.2 0-.2.1-.5.2-.7l.2-.4-.4-.2c-1-.5-1.5-1.5-1.2-2.6l.1-.4-.3-.3c-.7-.7-.9-1.7-.5-2.6l.2-.4-.4-.2c-.9-.5-1.4-1.5-1.1-2.5.3-1 1.2-1.6 2.2-1.6.2 0 .5.1.7.2l.4.2.2-.4c.5-1 1.5-1.5 2.6-1.2l.4.1.3-.3c.7-.7 1.7-.9 2.6-.5l.4.2.2-.4c.5-.9 1.5-1.4 2.5-1.1.2.1.4.2.5.4z" />
                        </svg>
                      </div>
                    )}
                    {m.logoType === 'deepseek' && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-200/50 dark:border-cyan-900/30 text-cyan-600 dark:text-cyan-400 shadow-xs font-black text-xs">
                        D
                      </div>
                    )}
                    {m.logoType === 'mistral' && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-orange-50 dark:bg-orange-950/20 border border-orange-200/50 dark:border-orange-900/30 text-orange-600 dark:text-orange-400 shadow-xs font-black text-xs">
                        M
                      </div>
                    )}
                    {m.logoType === 'qwen' && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-violet-50 dark:bg-violet-950/20 border border-violet-200/50 dark:border-violet-900/30 text-violet-600 dark:text-violet-400 shadow-xs">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                        </svg>
                      </div>
                    )}
                    {m.logoType === 'default' && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-violet-50 dark:bg-violet-950/20 border border-violet-200/50 dark:border-violet-900/30 text-violet-600 dark:text-violet-400 shadow-xs">
                        <Cpu className="h-3.5 w-3.5" />
                      </div>
                    )}
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs tracking-tight">{m.name}</span>
                  </div>
                  <span className={`px-1.5 py-0.5 text-[8.5px] rounded font-semibold uppercase tracking-wider ${
                    isSelected 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400'
                  }`}>
                    {m.badge}
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-500 dark:text-slate-400 line-clamp-2">
                  {m.description}
                </p>
              </div>

              <AnimatePresence initial={false}>
                {isSelected && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-500 dark:text-slate-400 space-y-3"
                  >
                    {/* Accuracy Slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between font-medium">
                        <span>Accuracy Precision</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">{m.accuracyStr}</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${m.accuracy}%` }}
                          transition={{ duration: 0.4 }}
                          className="h-full bg-emerald-500 dark:bg-emerald-400 rounded-full"
                        />
                      </div>
                    </div>

                    {/* Specifications */}
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[9.5px]">
                      <div>
                        <span className="text-slate-400 block font-semibold">Context Limit</span>
                        <span className="text-slate-700 dark:text-slate-300 font-medium">{m.context}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold">Provider Type</span>
                        <span className="text-slate-700 dark:text-slate-300 font-medium capitalize">{m.type}</span>
                      </div>
                    </div>

                    {/* Optimized For Pill */}
                    <div>
                      <span className="block text-[8.5px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mb-1">Optimized Strength</span>
                      <span className="inline-block px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900 rounded text-[9.5px] font-medium leading-normal">
                        {m.optimizedFor}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}


export function Guide() {
  const [activeArticleId, setActiveArticleId] = useState<string>('welcome');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Live Crypto Sandbox States
  const [passphrase, setPassphrase] = useState<string>('secure-vault-passphrase');
  const [sandboxSalt, setSandboxSalt] = useState<string>('a1b2c3d4e5f6g7h8');
  const [plainText, setPlainText] = useState<string>('Hello World! Encrypted Client-Side.');
  const [derivedKeyHex, setDerivedKeyHex] = useState<string>('');
  const [cipherText, setCipherText] = useState<string>('');
  const [ivHex, setIvHex] = useState<string>('');
  const [isDeriving, setIsDeriving] = useState<boolean>(false);

  // Trigger Crypto Sandbox Calculations
  useEffect(() => {
    let active = true;
    async function calculateCrypto() {
      if (!passphrase || !plainText) {
        setCipherText('');
        setDerivedKeyHex('');
        setIvHex('');
        return;
      }
      setIsDeriving(true);
      try {
        const encoder = new TextEncoder();
        
        // Convert Salt to Uint8Array (pad or slice to 16 bytes)
        let saltBytes = encoder.encode(sandboxSalt);
        if (saltBytes.length < 16) {
          const padded = new Uint8Array(16);
          padded.set(saltBytes);
          saltBytes = padded;
        } else if (saltBytes.length > 16) {
          saltBytes = saltBytes.slice(0, 16);
        }

        // Import key material
        const baseKey = await window.crypto.subtle.importKey(
          'raw',
          encoder.encode(passphrase),
          'PBKDF2',
          false,
          ['deriveKey']
        );

        // Derive AES key
        const aesKey = await window.crypto.subtle.deriveKey(
          {
            name: 'PBKDF2',
            salt: saltBytes,
            iterations: 100000,
            hash: 'SHA-256'
          },
          baseKey,
          { name: 'AES-GCM', length: 256 },
          true,
          ['encrypt', 'decrypt']
        );

        // Export derived key for demo
        const exportedRaw = await window.crypto.subtle.exportKey('raw', aesKey);
        const keyHex = Array.from(new Uint8Array(exportedRaw))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        if (active) {
          setDerivedKeyHex(keyHex);
        }

        // Generate static-ish demo IV (12 bytes)
        const demoIv = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
        const demoIvHex = Array.from(demoIv).map(b => b.toString(16).padStart(2, '0')).join('');
        if (active) setIvHex(demoIvHex);

        // Encrypt
        const encrypted = await window.crypto.subtle.encrypt(
          { name: 'AES-GCM', iv: demoIv },
          aesKey,
          encoder.encode(plainText)
        );

        // Convert encrypted buffer to Base64
        const base64Cipher = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
        if (active) {
          setCipherText(base64Cipher);
        }
      } catch (err) {
        console.error("Demo Sandbox calculation error", err);
      } finally {
        if (active) setIsDeriving(false);
      }
    }

    calculateCrypto();
    return () => {
      active = false;
    };
  }, [passphrase, sandboxSalt, plainText]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const regenerateSandboxSalt = () => {
    const randomBytes = new Uint8Array(8);
    window.crypto.getRandomValues(randomBytes);
    const hex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    setSandboxSalt(hex);
  };

  const categories = [
    { id: 'introduction', label: 'Introduction' },
    { id: 'user_guide', label: 'User Guides' },
    { id: 'api_guide', label: 'API & Configuration' },
    { id: 'faq', label: 'FAQ & Troubleshooting' }
  ];

  const articles: Article[] = [
    {
      id: 'welcome',
      category: 'introduction',
      title: 'Welcome to OcularOCR',
      icon: BookOpen,
      renderContent: () => (
        <div className="space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
            <span className="text-[10px] font-bold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">WIKI / GETTING STARTED</span>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">OcularOCR Wiki</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Learn how to maximize your offline-first, client-side encrypted document and OCR system.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 flex gap-3 text-xs leading-relaxed text-indigo-800 dark:text-indigo-300">
            <Info className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Zero-Knowledge Guarantee:</span> OcularOCR operates entirely within your browser sandboxed environment. Your master passphrase never touches any remote server, and your files are encrypted locally before being stored in IndexedDB.
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">System Core Capabilities</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <h3 className="text-sm font-semibold">100% Local Encryption</h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Military-grade AES-256-GCM symmetric encryption secures your PDF documents, extracted text, and AI logs inside your browser database.
                </p>
              </div>

              <div className="p-4 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Cpu className="h-4 w-4 text-indigo-500" />
                  <h3 className="text-sm font-semibold">Dual OCR Architecture</h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Extract readable text from documents using local client-side Tesseract.js engines, or upscale to state-of-the-art Cloud AI models.
                </p>
              </div>

              <div className="p-4 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-violet-500" />
                  <h3 className="text-sm font-semibold">Interactive Document Chat</h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Query your complex PDFs in real-time. Secure backend APIs proxy calls to state-of-the-art LLMs, using only local decrypted context segments.
                </p>
              </div>

              <div className="p-4 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                  <h3 className="text-sm font-semibold">Secure Bulk Exporter</h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Select multiple documents, merge their decrypted contents, and compile them instantly into highly formatted PDF files with a single click.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">How to Navigate the Wiki</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Use the sidebar panel to browse specific sections. For programmers and administrators looking to audit our zero-knowledge models, check the <button onClick={() => setActiveArticleId('security')} className="text-indigo-600 hover:underline inline font-medium">Security Architecture</button> page which contains a live crypto sandbox where you can preview key derivation.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'security',
      category: 'introduction',
      title: 'Security Architecture',
      icon: ShieldCheck,
      renderContent: () => (
        <div className="space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
            <span className="text-[10px] font-bold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase">SECURITY / DESIGN</span>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">Zero-Knowledge Security</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Understand the client-side cryptographic layers that make your documents inaccessible to anyone but you.
            </p>
          </div>

          <div className="space-y-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <p>
              OcularOCR is architected around a strict <span className="font-bold text-slate-800 dark:text-slate-200">Zero-Knowledge</span> paradigm. When you choose a master passphrase, the system does not upload or evaluate it on a central server.
            </p>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-4">1. Key Derivation (PBKDF2)</h2>
            <p>
              To translate your human-readable master passphrase into a high-entropy cryptographic key, we use the <span className="font-bold">Password-Based Key Derivation Function 2 (PBKDF2)</span> standard:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><span className="font-bold">Salt:</span> A highly unique, cryptographically secure 16-byte salt generated per installation block.</li>
              <li><span className="font-bold">Iterations:</span> 100,000 rounds of HMAC-SHA-256 computations to prevent brute-force dictionary attacks.</li>
              <li><span className="font-bold">Result:</span> A symmetric 256-bit (32 bytes) key used to encrypt and decrypt the documents directly via the Web Crypto API.</li>
            </ul>

            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-4">2. AES-256-GCM Document Encryption</h2>
            <p>
              Files (such as raw PDFs or images) are converted to a binary buffer and encrypted with <span className="font-bold">AES-256-GCM</span> (Galois/Counter Mode). GCM provides both confidentiality and data integrity, ensuring that if any malicious code attempts to modify the local encrypted databases, decryption will fail with a security error.
            </p>
          </div>

          {/* Interactive Cryptographic Sandbox */}
          <div className="p-5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <Terminal className="h-4 w-4 text-indigo-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Live Client-Side Crypto Sandbox</h3>
            </div>
            
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Test key derivation and AES-GCM encryption live in your browser memory below. Zero data is sent to the network.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Passphrase</label>
                  <input 
                    type="text" 
                    value={passphrase} 
                    onChange={(e) => setPassphrase(e.target.value)}
                    className="w-full text-xs p-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded font-mono focus:border-indigo-500 focus:outline-none"
                    placeholder="Enter pass..."
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">16-Byte Hex Salt</label>
                    <button onClick={regenerateSandboxSalt} className="text-[10px] font-bold text-indigo-500 hover:underline flex items-center gap-1">
                      <RefreshCw className="h-2.5 w-2.5" /> RE-SALT
                    </button>
                  </div>
                  <input 
                    type="text" 
                    value={sandboxSalt} 
                    onChange={(e) => setSandboxSalt(e.target.value)}
                    className="w-full text-xs p-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded font-mono focus:border-indigo-500 focus:outline-none"
                    placeholder="Hex salt..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Text to Encrypt</label>
                  <textarea 
                    value={plainText} 
                    onChange={(e) => setPlainText(e.target.value)}
                    rows={2}
                    className="w-full text-xs p-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded font-mono focus:border-indigo-500 focus:outline-none resize-none"
                    placeholder="Type text to encrypt..."
                  />
                </div>
              </div>

              <div className="space-y-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-3 text-[11px] font-mono leading-tight flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 border-b border-slate-100 dark:border-slate-900 pb-1.5 mb-2">
                    <span>CRYPTOGRAPHIC OUTPUTS</span>
                    {isDeriving ? (
                      <span className="text-amber-500 animate-pulse flex items-center gap-1"><RefreshCw className="h-3 w-3 animate-spin" /> RUNNING</span>
                    ) : (
                      <span className="text-green-500 flex items-center gap-1"><Lock className="h-3 w-3" /> SECURE</span>
                    )}
                  </div>
                  
                  <div className="mb-2">
                    <span className="text-[10px] font-bold text-slate-400 block">DERIVED KEY (AES-256):</span>
                    <span className="text-slate-700 dark:text-slate-300 break-all select-all font-semibold">
                      {derivedKeyHex || 'N/A'}
                    </span>
                  </div>

                  <div className="mb-2">
                    <span className="text-[10px] font-bold text-slate-400 block">INITIALIZATION VECTOR (12-BYTE IV):</span>
                    <span className="text-slate-500 dark:text-slate-400 break-all select-all">
                      {ivHex || 'N/A'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">BASE64 GCM CIPHERTEXT:</span>
                    <span className="text-indigo-600 dark:text-indigo-400 break-all select-all font-semibold">
                      {cipherText || 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="mt-3 text-[9px] text-slate-400 leading-normal border-t border-slate-100 dark:border-slate-900 pt-2 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>PBKDF2 SHA-256 (100,000 iterations) + AES-GCM Encrypted.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'getting-started',
      category: 'user_guide',
      title: 'Getting Started',
      icon: Play,
      renderContent: () => (
        <div className="space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
            <span className="text-[10px] font-bold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">GUIDE / ONBOARDING</span>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">Getting Started with OcularOCR</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Follow this step-by-step onboarding guide to secure, process, and query your documents.
            </p>
          </div>

          <div className="space-y-6 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {/* Step 1 */}
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <div className="flex items-center gap-2.5 mb-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold text-xs">1</span>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Initialize and Unlock Your Vault</h3>
              </div>
              <p className="mb-2">
                When you launch the app, you will be prompted to create or enter a master passphrase. This passphrase is the master key for your locally encrypted storage.
              </p>
              <div className="flex gap-2 items-start mt-2 p-2.5 rounded bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 text-amber-800 dark:text-amber-300">
                <Lock className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Important Security Note:</span> We use <code className="bg-amber-100/50 dark:bg-amber-900/50 px-1 py-0.5 rounded">PBKDF2</code> derivation to generate your encryption keys entirely in the browser. <strong>We do not save your password on any server.</strong> If you lose your passphrase, your stored documents cannot be recovered.
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <div className="flex items-center gap-2.5 mb-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold text-xs">2</span>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Upload Your First PDF Document</h3>
              </div>
              <p className="mb-2">
                Once inside the dashboard, use the file manager to import PDF files:
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Drag and drop files directly onto the dropzone or click the file upload panel.</li>
                <li>Your files are automatically encrypted with AES-GCM before being stored in IndexedDB.</li>
                <li>Assign tags manually to organize invoices, IDs, or receipts for fast retrieval.</li>
              </ul>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <div className="flex items-center gap-2.5 mb-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold text-xs">3</span>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Extract Text with OCR</h3>
              </div>
              <p className="mb-2">
                To enable search and chat, you need to extract the text content from your documents:
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Click the document row to open the Document Viewer.</li>
                <li>Click <span className="font-semibold text-indigo-600">Extract Text via OCR</span> to run local text extraction using Tesseract.js.</li>
                <li>For handwritten or complex layouts, open the <span className="font-semibold text-indigo-600">Settings</span> panel to toggle <span className="font-semibold text-indigo-600">Use LLM for OCR</span> using state-of-the-art vision models.</li>
              </ul>
            </div>

            {/* Step 4 */}
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <div className="flex items-center gap-2.5 mb-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold text-xs">4</span>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Query and Summarize</h3>
              </div>
              <p className="mb-2">
                Leverage local context to summarize, query, and gather insights from your vault:
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Click the chat bubble next to any document or open the interactive Document Chat sidebar.</li>
                <li>Ask natural language questions like <em>"What is the total invoice amount?"</em> or <em>"Summarize the contract terms."</em></li>
                <li>Your queries and extracted document sections are sent securely to LLM endpoints to construct private answers.</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'usage',
      category: 'user_guide',
      title: 'Managing Documents',
      icon: FileText,
      renderContent: () => (
        <div className="space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
            <span className="text-[10px] font-bold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">GUIDE / FILE MANAGEMENT</span>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">Uploading & Tagging</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Learn how to organize, tag, bulk process, and batch-delete secure PDF files.
            </p>
          </div>

          <div className="space-y-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">1. Safe Uploading</h2>
            <p>
              In the file explorer view, you can drag and drop multiple PDF files or select them using the manual file selector. Files are encrypted on-the-fly and stored locally. A file loader will display progress during processing.
            </p>

            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-4">2. Interactive Tagging and Search</h2>
            <p>
              To filter files quickly, you can append key tags (e.g., <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-indigo-600">invoice</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-indigo-600">medical</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-indigo-600">receipt</code>).
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>Click on the Tag button in any document row to view tags or append new ones.</li>
              <li>Filter documents dynamically using the global search bar. The system instantly searches names and decrypted OCR texts.</li>
            </ul>

            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-4">3. Bulk Actions (Batch Delete & Export)</h2>
            <p>
              OcularOCR includes an integrated batch processor:
            </p>
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 my-2">
              <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">To execute bulk commands:</span>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Toggle checkboxes on the left side of document rows.</li>
                <li>The bulk operations toolbar will appear automatically at the top.</li>
                <li>Click <span className="font-semibold text-red-500">Bulk Delete</span> to remove multiple files safely after checking confirmation popups.</li>
                <li>Or, click <span className="font-semibold text-indigo-500">Export PDF</span> to merge multiple decrypted summaries and extracted raw OCR data directly into a unified PDF file.</li>
              </ol>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'ocr',
      category: 'user_guide',
      title: 'OCR Text Extraction',
      icon: Cpu,
      renderContent: () => (
        <div className="space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
            <span className="text-[10px] font-bold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">GUIDE / OCR EXTRACTION</span>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">Optical Character Recognition</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Learn how to convert scanned images or un-selectable PDF text into rich, copyable, indexable text.
            </p>
          </div>

          <div className="space-y-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">1. Local Client-Side OCR (Tesseract.js)</h2>
            <p>
              By default, OcularOCR uses <span className="font-bold">Tesseract.js</span> directly inside your browser. When you process a document, the application:
            </p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Renders document pages directly into HTML Canvas elements.</li>
              <li>Feeds canvas image buffers to local Web Workers running OCR scripts.</li>
              <li>Extracts the raw text, which is then encrypted and saved to local IndexedDB.</li>
            </ol>
            <p className="mt-1.5 italic text-slate-500">
              No server resources are used, and no data is sent out of your local PC.
            </p>

            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-4">2. Cloud AI Assisted OCR</h2>
            <p>
              For high-fidelity documents (such as handwriting or blurry photographs), local engines may miss important words. You can toggle <span className="font-bold">Use LLM for OCR</span> inside the Settings modal.
            </p>
            <p>
              This passes the image arrays safely via encrypted server-side proxy API routes directly to the Google Gemini API or your self-hosted private LLMs. The LLM acts as an intelligent reader to transcribe document layouts accurately.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'pwa',
      category: 'user_guide',
      title: 'Run Offline: PWA',
      icon: Smartphone,
      renderContent: () => (
        <div className="space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
            <span className="text-[10px] font-bold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">OFFLINE / PWA INSTALLATION</span>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">Run Offline: PWA Installation</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              OcularOCR works fully offline. You can install it on your mobile device, tablet, or computer. Once installed, it behaves like a native application—launching instantly from your home screen without requiring an internet connection.
            </p>
          </div>

          <div className="p-5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Instant Access</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Click to install OcularOCR directly onto your system.
              </p>
            </div>
            <button 
              onClick={() => {
                const event = new CustomEvent('trigger-pwa-install');
                window.dispatchEvent(event);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold transition-all shadow flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto"
            >
              <Download className="h-4 w-4" />
              Install OcularOCR App Now
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">iOS (iPhone / iPad)</h3>
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">Safari Browser</span>
              </div>
              <ol className="list-decimal pl-4 space-y-3 text-xs text-slate-600 dark:text-slate-400">
                <li>Open <span className="font-semibold text-slate-800 dark:text-slate-200">OcularOCR</span> in your Safari browser.</li>
                <li>Tap the <span className="font-semibold text-slate-800 dark:text-slate-200">Share</span> button in the bottom menu bar (a square icon with an upward arrow).</li>
                <li>Scroll down the list and tap <span className="font-semibold text-slate-800 dark:text-slate-200">&ldquo;Add to Home Screen&rdquo;</span>.</li>
                <li>Confirm by tapping <span className="font-semibold text-slate-800 dark:text-slate-200">&ldquo;Add&rdquo;</span> in the top right corner.</li>
              </ol>
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center gap-1.5">
                <Download className="h-3.5 w-3.5" /> No App Store account required
              </div>
            </div>

            <div className="p-5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">Android &amp; Desktop</h3>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded">Chrome / Edge / Samsung</span>
              </div>
              <ol className="list-decimal pl-4 space-y-3 text-xs text-slate-600 dark:text-slate-400">
                <li>Open <span className="font-semibold text-slate-800 dark:text-slate-200">OcularOCR</span> in Chrome or your preferred browser.</li>
                <li>Tap the browser menu (three dots icon) or click the installation icon in the address bar.</li>
                <li>Select <span className="font-semibold text-slate-800 dark:text-slate-200">&ldquo;Install app&rdquo;</span> or <span className="font-semibold text-slate-800 dark:text-slate-200">&ldquo;Add to Home Screen&rdquo;</span>.</li>
                <li>Follow the prompt on your screen to complete the installation.</li>
              </ol>
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center gap-1.5">
                <Download className="h-3.5 w-3.5" /> Launches in borderless native window
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 flex gap-3 text-xs leading-relaxed text-indigo-800 dark:text-indigo-300">
            <Info className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Offline Sync Note:</span> To use the secure document database, OCR extraction, local search, and text files offline, make sure you have loaded the application and decrypted the vault at least once with an internet connection. Live LLM translation and summaries require an active network connection, unless connected to your private local Ollama server.
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'auto-tagging',
      category: 'user_guide',
      title: 'Auto-Tagging Engine',
      icon: Tag,
      renderContent: () => (
        <div className="space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
            <span className="text-[10px] font-bold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">WIKI / CLASSIFICATION</span>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">Smart Auto-Tagging Engine</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Organize and classify documents automatically using our dual offline and LLM-assisted tagging pipeline.
            </p>
          </div>

          <div className="space-y-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <p>
              Manually typing tags for every document is tedious. OcularOCR introduces an intelligent <span className="font-bold">Auto-Tagging Engine</span> that analyzes document content and filenames to suggest high-fidelity categories.
            </p>

            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-4">1. Dual Classification Architecture</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-3">
              <div className="p-4 rounded border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-1">Local Heuristics (Offline-First)</h3>
                <p className="text-[11px] text-slate-500">
                  Performs lightning-fast keyword matching and regex classification directly in your browser. It instantly detects categories such as Receipts, Invoices, Contracts, IDs, and Medical documents without requiring any internet connection or API keys.
                </p>
              </div>
              <div className="p-4 rounded border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <h3 className="font-bold text-indigo-600 dark:text-indigo-400 mb-1">LLM Classification (AI-Powered)</h3>
                <p className="text-[11px] text-slate-500">
                  Leverages Gemini, OpenAI, or Ollama to deeply understand the context of your document and suggest precise tags. This operates securely on the server-side, keeping your keys completely hidden.
                </p>
              </div>
            </div>

            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-4">2. Where to Use Auto-Tagging</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Bulk OCR & Auto-Tag:</span> When running Bulk OCR from the file manager, the engine automatically runs in the background and tags all selected files with matching categories.
              </li>
              <li>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Single OCR Auto-Tag:</span> When you view a document and click &ldquo;EXTRACT TEXT VIA OCR&rdquo;, the document will be automatically categorized as soon as the text extraction is done.
              </li>
              <li>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Interactive Inline Tagging:</span> Hover over any document in the main file explorer, click the <span className="font-bold text-indigo-600">+ tag</span> button, and click one of the suggested tags to immediately assign it!
              </li>
              <li>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Suggested Categories Panel:</span> Inside the document viewer&rsquo;s right sidebar, under &ldquo;Suggested Categories&rdquo;, click any smart label with the <span className="font-bold text-xs">+</span> icon to instantly add it to the encrypted document metadata.
              </li>
            </ul>

            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/50 flex gap-3 text-xs leading-relaxed text-green-800 dark:text-green-300 mt-4">
              <ShieldCheck className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Encrypted Tag Metadata:</span> Just like the document contents, all suggested tags are fully encrypted using AES-256-GCM before saving. Suggested tags never leak to third parties.
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'vision-models',
      category: 'api_guide',
      title: 'Vision & OCR Models',
      icon: Eye,
      renderContent: () => (
        <div className="space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
            <span className="text-[10px] font-bold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">WIKI / STATE OF THE ART</span>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">Vision & OCR Model Registry</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Browse the elite vision-language, multimodal reasoners, and high-fidelity OCR models available on Roboflow Playground.
            </p>
          </div>

          <div className="space-y-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <p>
              Modern document digitizers leverage state-of-the-art vision-language foundation models (VLMs) and advanced deep learning pipelines. Use this interactive registry to browse performance characteristics, context limits, and specific strengths of each world-class model.
            </p>

            <ModelRegistry />
          </div>
        </div>
      )
    },
    {
      id: 'api',
      category: 'api_guide',
      title: 'LLM & API Integrations',
      icon: Code,
      renderContent: () => (
        <div className="space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
            <span className="text-[10px] font-bold tracking-widest text-violet-600 dark:text-violet-400 uppercase">INTEGRATION / PROTOCOL</span>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">LLM & API Configuration</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Configure private custom endpoints, models, and securely route requests to your chosen AI Providers.
            </p>
          </div>

          <div className="space-y-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <p>
              To interact with documents (Summarize, Translate, Chat), OcularOCR allows you to configure your personal API Keys for maximum privacy.
            </p>

            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-4">1. Supported AI Providers</h2>
            <div className="space-y-3">
              <div className="border border-slate-200 dark:border-slate-800 rounded p-3 bg-white dark:bg-slate-900">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-800 dark:text-slate-100">Google Gemini API</span>
                  <span className="px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-950/20 dark:text-green-400 text-[9px] rounded font-semibold uppercase tracking-wider">Recommended</span>
                </div>
                <p className="text-slate-500 mb-2">Excellent performance and high context window. Uses the latest gemini-3.5-flash or experimental models.</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400">Default Model:</span>
                  <code className="bg-slate-100 dark:bg-slate-800 text-indigo-600 px-1 rounded text-[10px]">gemini-3.5-flash</code>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded p-3 bg-white dark:bg-slate-900">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-800 dark:text-slate-100">OpenAI / Compatible API (OpenAI, Groq, DeepSeek)</span>
                  <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 text-[9px] rounded font-semibold uppercase tracking-wider">Universal</span>
                </div>
                <p className="text-slate-500 mb-2">Fully compatible with standard endpoints like OpenAI, Groq Cloud, OpenRouter, and custom endpoints.</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-400">OpenAI Default:</span>
                    <code className="bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 px-1 rounded">gpt-4o</code>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-400">Groq Default:</span>
                    <code className="bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 px-1 rounded">meta-llama/llama-4-scout-17b-16e-instruct</code>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded p-3 bg-white dark:bg-slate-900">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-800 dark:text-slate-100">Local private models (Ollama)</span>
                  <span className="px-1.5 py-0.5 bg-violet-100 text-violet-700 dark:bg-violet-950/20 dark:text-violet-400 text-[9px] rounded font-semibold uppercase tracking-wider">100% Offline</span>
                </div>
                <p className="text-slate-500 mb-2">Completely offline pipelines. Connects to your locally hosted Ollama instances via localhost endpoints.</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400">Default Endpoint:</span>
                  <code className="bg-slate-100 dark:bg-slate-800 text-indigo-600 px-1 rounded text-[10px]">http://localhost:11434/v1</code>
                </div>
              </div>
            </div>

            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-6">2. JSON Payload Architecture Example</h2>
            <p>
              When a query is dispatched, the client component decrypts the necessary document fragment locally and structures the proxy request. Here is an example request format forwarded securely via Server routes:
            </p>

            <div className="relative">
              <button 
                onClick={() => handleCopy(JSON.stringify(apiPayloadExample, null, 2), 'payload')}
                className="absolute right-2 top-2 p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-500 transition-colors"
                title="Copy Code"
              >
                {copiedId === 'payload' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              <pre className="bg-slate-900 text-slate-100 font-mono text-[10px] p-4 rounded-lg overflow-x-auto leading-normal">
{`// SECURE POST /api/proxy/route.ts
{
  "provider": "google",
  "model": "gemini-3.5-flash",
  "prompt": "Analyze the following extracted document text: ...",
  "documentContext": {
    "docId": "5a278efc...",
    "pageCount": 4
  }
}`}
              </pre>
            </div>

            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-6">3. API Key Creation Guides</h2>
            <div className="space-y-4">
              <div className="border border-slate-200 dark:border-slate-800 rounded p-4 bg-slate-50/50 dark:bg-slate-950/20">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-bold">1</span>
                  Google Gemini API Key
                </h3>
                <p className="text-slate-500 mb-3">Google Gemini offers generous free-tier API access, outstanding multi-page analysis, and robust optical understanding.</p>
                <ol className="list-decimal pl-4 space-y-1.5 text-slate-600 dark:text-slate-400">
                  <li>Navigate to the <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-medium">Google AI Studio Console</a>.</li>
                  <li>Click on the prominent <span className="font-semibold text-slate-800 dark:text-slate-200">&ldquo;Create API Key&rdquo;</span> button.</li>
                  <li>Select an existing Google Cloud Project or create a new one instantly.</li>
                  <li>Copy your newly generated key and save it securely.</li>
                  <li>In OcularOCR, click <span className="font-semibold text-slate-800 dark:text-slate-200">Settings</span>, select the <span className="font-bold">Gemini</span> provider, enter your key, and save.</li>
                </ol>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded p-4 bg-slate-50/50 dark:bg-slate-950/20">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-bold">2</span>
                  OpenAI Compatible / Groq Cloud Setup
                </h3>
                <p className="text-slate-500 mb-3">Both OpenAI and Groq are fully supported. Groq is especially recommended for its record-breaking token speeds and high throughput.</p>
                <ol className="list-decimal pl-4 space-y-1.5 text-slate-600 dark:text-slate-400 mb-3">
                  <li>Navigate to the <a href="https://console.groq.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-medium">Groq Cloud Console</a> (or OpenAI Platform).</li>
                  <li>In the sidebar menu, select <span className="font-semibold text-slate-800 dark:text-slate-200">API Keys</span>.</li>
                  <li>Click <span className="font-semibold text-slate-800 dark:text-slate-200">&ldquo;Create API Key&rdquo;</span>, copy the generated key securely.</li>
                  <li>In OcularOCR, click <span className="font-semibold text-slate-800 dark:text-slate-200">Settings</span>, select the <span className="font-bold">OpenAI Compatible</span> tab.</li>
                  <li>Paste your key, set the endpoint to: <code className="bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 px-1 rounded text-[10px]">https://api.groq.com/openai/v1/chat/completions</code> and choose the model <code className="bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 px-1 rounded text-[10px]">meta-llama/llama-4-scout-17b-16e-instruct</code>.</li>
                </ol>
                <div className="p-3 rounded bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 text-[11px]">
                  <span className="font-bold text-indigo-700 dark:text-indigo-400 block mb-1">💡 Recommended Model:</span>
                  <ul className="list-disc pl-4 space-y-1 text-indigo-900/80 dark:text-indigo-300/80">
                    <li>We highly recommend setting the model identifier to <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/60 font-semibold text-indigo-600 dark:text-indigo-400 text-[10px]">meta-llama/llama-4-scout-17b-16e-instruct</code> on the Groq endpoint.</li>
                    <li>This model features exceptional token speed, high-quality summary outputs, and **full multimodal vision support** for direct OCR extraction from images!</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'faq',
      category: 'faq',
      title: 'Frequently Asked Questions',
      icon: HelpCircle,
      renderContent: () => (
        <div className="space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
            <span className="text-[10px] font-bold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">WIKI / SUPPORT</span>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">Frequently Asked Questions</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Get immediate answers to common technical, cryptographic, and operational queries.
            </p>
          </div>

          <div className="space-y-4">
            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-4">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-1.5">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                What happens if I lose my Master Passphrase?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Because OcularOCR is a <span className="font-bold">Zero-Knowledge</span> system, we do not store your keys, password hashes, or recovery codes on any central server. If you lose your passphrase, <span className="text-red-500 font-semibold">your documents are permanently unrecoverable</span>. There is no password reset pipeline. Always keep your passphrase in a secure credential manager.
              </p>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-4">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-1.5">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                Where are my files and keys stored?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Your encrypted document buffers and tags are stored in your browser&rsquo;s local sandbox using <span className="font-bold">IndexedDB</span> (managed securely via IndexedDB keys). The crypto key itself resides only in your transient browser RAM session while the vault is unlocked, and is deleted from RAM immediately when you lock the vault or close the window.
              </p>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-4">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-1.5">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                Is there a document size or count limit?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                No strict document count limits exist. IndexedDB is capable of storing several gigabytes depending on your hard-drive storage. However, extremely large PDF files (50+ pages) may experience rendering or local Tesseract OCR delays due to limited browser memory allocations.
              </p>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-4">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-1.5">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                Are my API keys exposed to the browser client?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                No. If you configure custom API settings (such as a private Gemini or OpenAI credential), they are encrypted locally on your client machine before being written to storage. When making API requests, the values are temporarily passed through local server API route handlers that act as a secret proxy shield, keeping your private tokens secure.
              </p>
            </div>
          </div>
        </div>
      )
    }
  ];

  const apiPayloadExample = {
    provider: "google",
    model: "gemini-3.5-flash",
    prompt: "Analyze the following extracted document text: ...",
    documentContext: {
      docId: "5a278efc...",
      pageCount: 4
    }
  };

  // Filter articles based on search query
  const filteredArticles = articles.filter(article => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      article.title.toLowerCase().includes(query) ||
      article.id.toLowerCase().includes(query) ||
      article.category.toLowerCase().includes(query)
    );
  });

  const activeArticle = articles.find(a => a.id === activeArticleId) || articles[0];
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col md:flex-row h-full w-full bg-slate-50 dark:bg-slate-950 overflow-hidden"
    >
      {/* Mobile Top Bar */}
      <div className="flex h-11 items-center gap-3 px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 md:hidden z-10">
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
        >
          <Menu className="h-4 w-4" />
        </button>
        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest truncate">
          {activeArticle.title}
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Drawer Sidebar */}
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="absolute inset-0 z-30 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm md:hidden"
              />
              {/* Drawer */}
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="absolute left-0 top-0 bottom-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-40 flex flex-col md:hidden"
              >
                <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vault Guide</span>
                  <button 
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="p-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search Vault Wiki..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-4">
                  {categories.map((cat) => {
                    const catArticles = filteredArticles.filter(a => a.category === cat.id);
                    if (catArticles.length === 0) return null;
                    return (
                      <div key={cat.id} className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2.5 block mb-1">
                          {cat.label}
                        </span>
                        {catArticles.map((article) => {
                          const Icon = article.icon;
                          const isActive = activeArticleId === article.id;
                          return (
                            <button
                              key={article.id}
                              onClick={() => {
                                setActiveArticleId(article.id);
                                setIsSidebarOpen(false);
                              }}
                              className={`w-full flex items-center justify-between text-left px-2.5 py-1.5 rounded text-xs transition-all cursor-pointer ${
                                isActive 
                                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold border-l-2 border-indigo-600 dark:border-indigo-400' 
                                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-indigo-500' : 'text-slate-400'}`} />
                                <span className="truncate">{article.title}</span>
                              </div>
                              <ChevronRight className={`h-3 w-3 shrink-0 opacity-0 transition-opacity ${isActive ? 'opacity-100 text-indigo-500' : ''}`} />
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Desktop Permanent Sidebar */}
        <div className="hidden md:flex w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search Vault Wiki..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
            {categories.map((cat) => {
              const catArticles = filteredArticles.filter(a => a.category === cat.id);
              if (catArticles.length === 0) return null;

              return (
                <div key={cat.id} className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2.5 block mb-1">
                    {cat.label}
                  </span>
                  {catArticles.map((article) => {
                    const Icon = article.icon;
                    const isActive = activeArticleId === article.id;
                    return (
                      <button
                        key={article.id}
                        onClick={() => setActiveArticleId(article.id)}
                        className={`w-full flex items-center justify-between text-left px-2.5 py-1.5 rounded text-xs transition-all cursor-pointer ${
                          isActive 
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold border-l-2 border-indigo-600 dark:border-indigo-400' 
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-indigo-500' : 'text-slate-400'}`} />
                          <span className="truncate">{article.title}</span>
                        </div>
                        <ChevronRight className={`h-3 w-3 shrink-0 opacity-0 transition-opacity ${isActive ? 'opacity-100 text-indigo-500' : ''}`} />
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Wiki Content Canvas */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-950 custom-scrollbar">
          <div className="max-w-3xl mx-auto px-4 py-6 md:px-10 md:py-12">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeArticle.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
              >
                {activeArticle.renderContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
