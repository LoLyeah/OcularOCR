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
      name: 'GPT-5.6',
      description: 'GPT-5.6 adalah model flagship multimodal terbaru dari OpenAI yang dirilis pada 26 Juni 2026, menghadirkan parsing dokumen visual yang tak tertandingi, penalaran spasial, dan akurasi tulisan tangan di berbagai tingkat Sol/Terra.',
      provider: 'OpenAI',
      logoType: 'openai',
      badge: 'Flagship Preview',
      context: '512K Tokens',
      accuracy: 99.6,
      accuracyStr: '99.6%',
      optimizedFor: 'Handwritten Audits & Edge-case Forms',
      type: 'proprietary'
    },
    {
      name: 'Claude Sonnet 5',
      description: 'Claude Sonnet 5 adalah model bahasa besar tingkat menengah dari Anthropic, dirilis sebagai lompatan besar dalam penalaran, kemampuan vision, dan kecepatan multimodal.',
      provider: 'Anthropic',
      logoType: 'anthropic',
      badge: 'Highly Recommended',
      context: '200K Tokens',
      accuracy: 98.4,
      accuracyStr: '98.4%',
      optimizedFor: 'Visual Layouts & Code',
      type: 'proprietary'
    },
    {
      name: 'Claude Fable 5',
      description: "Claude Fable 5 adalah model bahasa besar kelas Mythos pertama yang tersedia secara umum dari Anthropic, menampilkan penceritaan khusus, penulisan kreatif, dan orkestrasi suara mirip manusia.",
      provider: 'Anthropic',
      logoType: 'anthropic',
      badge: 'Mythos Class',
      context: '150K Tokens',
      accuracy: 94.2,
      accuracyStr: '94.2%',
      optimizedFor: 'Narratives & Creative Docs',
      type: 'proprietary'
    },
    {
      name: 'Gemma 4 12B',
      description: 'Gemma 4 12B adalah model multimodal open-weight dari Google, menampilkan pemrosesan teks dan vision tingkat lanjut dengan ukuran yang sangat efisien.',
      provider: 'Google',
      logoType: 'google',
      badge: 'Open Weight',
      context: '8K Tokens',
      accuracy: 91.8,
      accuracyStr: '91.8%',
      optimizedFor: 'OCR',
      type: 'open-source'
    },
    {
      name: 'Claude Opus 4.8',
      description: "Claude Opus 4.8 adalah model bahasa besar paling mumpuni yang tersedia secara umum dari Anthropic, menyediakan penalaran dengan fidelitas sangat tinggi, pengkodean kompleks, dan analisis dokumen yang luar biasa.",
      provider: 'Anthropic',
      logoType: 'anthropic',
      badge: 'Elite Tier',
      context: '300K Tokens',
      accuracy: 99.1,
      accuracyStr: '99.1%',
      optimizedFor: 'Frontier Complex Logic',
      type: 'proprietary'
    },
    {
      name: 'Gemini 3.5 Flash',
      description: 'Gemini 3.5 Flash adalah model bahasa multimodal yang dikembangkan oleh Google DeepMind dan dirancang untuk kecepatan, efisiensi, dan beban kerja OCR latensi rendah yang berat.',
      provider: 'Google',
      logoType: 'google',
      badge: 'OCR Speedster',
      context: '1M+ Tokens',
      accuracy: 96.8,
      accuracyStr: '96.8%',
      optimizedFor: 'Bulk Multi-page Ingestion',
      type: 'proprietary'
    },
    {
      name: 'GPT-5.5',
      description: 'GPT-5.5 adalah model bahasa besar multimodal yang dirilis oleh OpenAI, menetapkan rekor baru pada benchmark kecerdasan terstandarisasi visual dan verbal.',
      provider: 'OpenAI',
      logoType: 'openai',
      badge: 'Frontier SOTA',
      context: '256K Tokens',
      accuracy: 99.3,
      accuracyStr: '99.3%',
      optimizedFor: 'Standardized Tests & Vision',
      type: 'proprietary'
    },
    {
      name: 'Qwen3.6 27B',
      description: 'Qwen3.6-27B adalah model bahasa multimodal padat berkekuatan 27 miliar parameter yang dikembangkan oleh Alibaba, mengoptimalkan vision spasial-temporal kecepatan tinggi dan penalaran teks.',
      provider: 'Qwen',
      logoType: 'qwen',
      badge: 'Dense Multimodal',
      context: '32K Tokens',
      accuracy: 95.1,
      accuracyStr: '95.1%',
      optimizedFor: 'Multilingual Document Extraction',
      type: 'open-source'
    },
    {
      name: 'Claude Opus 4.7',
      description: 'Claude Opus 4.7 adalah model bahasa multimodal proprietary yang dikembangkan oleh Anthropic, menawarkan rekonstruksi tata letak dokumen tertinggi dan pemahaman konteks.',
      provider: 'Anthropic',
      logoType: 'anthropic',
      badge: 'Layout Expert',
      context: '200K Tokens',
      accuracy: 98.2,
      accuracyStr: '98.2%',
      optimizedFor: 'Heavily Formatted Forms',
      type: 'proprietary'
    },
    {
      name: 'Qwen3.6 35B A3B',
      description: 'Qwen3.6-35B-A3B adalah model bahasa multimodal Mixture-of-Experts (MoE) yang menggunakan parameter aktif secara dinamis untuk persepsi multimodal yang kuat.',
      provider: 'Qwen',
      logoType: 'qwen',
      badge: 'MoE Architecture',
      context: '64K Tokens',
      accuracy: 94.8,
      accuracyStr: '94.8%',
      optimizedFor: 'Bilingual / Code Tasks',
      type: 'open-source'
    },
    {
      name: 'Qwen3.6 Flash',
      description: 'Qwen3.6-Flash adalah varian API produksi dari seri model Qwen3.6, dirancang untuk ekstraksi visual yang sangat cepat, hemat biaya, dan alur dokumen ringan.',
      provider: 'Qwen',
      logoType: 'qwen',
      badge: 'Fast API',
      context: '16K Tokens',
      accuracy: 92.5,
      accuracyStr: '92.5%',
      optimizedFor: 'High-Throughput Parsing',
      type: 'open-source'
    },
    {
      name: 'Gemma 4 26B A4B',
      description: "Gemma 4 26B A4B adalah varian Mixture-of-Experts dalam keluarga Google Gemma 4, mempertahankan perutean dinamis untuk memberikan kecerdasan tinggi dengan komputasi minimal.",
      provider: 'Google',
      logoType: 'google',
      badge: 'Dynamic MoE',
      context: '32K Tokens',
      accuracy: 94.0,
      accuracyStr: '94.0%',
      optimizedFor: 'Cost-Effective Reasoner',
      type: 'open-source'
    },
    {
      name: 'Gemma 4 31B',
      description: "Gemma 4 31B adalah model padat terbesar dalam keluarga Google Gemma 4, dibangun dari awal untuk penalaran besar, OCR multibahasa, dan QA visual tingkat lanjut.",
      provider: 'Google',
      logoType: 'google',
      badge: 'Dense Powerhouse',
      context: '64K Tokens',
      accuracy: 97.4,
      accuracyStr: '97.4%',
      optimizedFor: 'Dense Multi-page Documents',
      type: 'open-source'
    },
    {
      name: 'Qwen3.6 Plus',
      description: "Qwen3.6 Plus adalah model unggulan dalam seri Qwen Plus Alibaba, dirancang untuk performa elit di berbagai pemahaman visual kompleks dan pemrosesan multibahasa.",
      provider: 'Qwen',
      logoType: 'qwen',
      badge: 'Flagship VLM',
      context: '128K Tokens',
      accuracy: 96.5,
      accuracyStr: '96.5%',
      optimizedFor: 'Bilingual Translation & Tables',
      type: 'open-source'
    },
    {
      name: 'GPT-5.4 Mini',
      description: 'GPT-5.4 mini adalah model yang cepat dan hemat biaya yang dikembangkan oleh OpenAI pada tata letak ringkas, dioptimalkan untuk inferensi teks dan vision bervolume tinggi.',
      provider: 'OpenAI',
      logoType: 'openai',
      badge: 'Cost-Effective',
      context: '128K Tokens',
      accuracy: 95.3,
      accuracyStr: '95.3%',
      optimizedFor: 'Sub-second API Calls',
      type: 'proprietary'
    },
    {
      name: 'GPT-5.4 Nano',
      description: 'GPT-5.4 nano adalah model berkemampuan edge dengan throughput tinggi yang dikembangkan oleh OpenAI pada arsitektur kecil untuk waktu respons instan di bawah 10 md.',
      provider: 'OpenAI',
      logoType: 'openai',
      badge: 'Edge OCR',
      context: '64K Tokens',
      accuracy: 91.2,
      accuracyStr: '91.2%',
      optimizedFor: 'Instant Mobile Snapshots',
      type: 'proprietary'
    },
    {
      name: 'GLM-OCR',
      description: 'GLM-OCR adalah model OCR multimodal untuk pemahaman dokumen kompleks, dibangun di atas jaringan lintas-modal Tionghoa-Inggris tingkat lanjut dengan retensi tata letak visual fidelitas tinggi.',
      provider: 'GLM',
      logoType: 'glm',
      badge: 'OCR Specialist',
      context: '32K Tokens',
      accuracy: 97.8,
      accuracyStr: '97.8%',
      optimizedFor: 'Bilingual Scans & Invoices',
      type: 'open-source'
    },
    {
      name: 'GPT-5.4',
      description: 'GPT-5.4 adalah model bahasa besar multimodal proprietary yang dikembangkan oleh OpenAI untuk mendorong pemahaman dokumen percakapan multi-turn tingkat perusahaan.',
      provider: 'OpenAI',
      logoType: 'openai',
      badge: 'Enterprise Tier',
      context: '128K Tokens',
      accuracy: 98.5,
      accuracyStr: '98.5%',
      optimizedFor: 'Deep Multi-turn Audit',
      type: 'proprietary'
    },
    {
      name: 'Gemini 3.1 Flash-Lite',
      description: 'Gemini 3.1 Flash-Lite adalah model penalaran multimodal native dari Google, dirancang untuk menangani ribuan halaman teks atau gambar dalam jendela konteksnya dengan kecepatan kilat.',
      provider: 'Google',
      logoType: 'google',
      badge: 'Lite Context',
      context: '1M Tokens',
      accuracy: 94.7,
      accuracyStr: '94.7%',
      optimizedFor: 'Rapid Long-form Reviews',
      type: 'proprietary'
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
    qwen: 'border-violet-200 dark:border-violet-950/40 bg-violet-50/5 dark:bg-violet-950/5 hover:border-violet-400 dark:hover:border-violet-800/80',
    glm: 'border-slate-300 dark:border-slate-800 bg-slate-50/5 dark:bg-slate-900/5 hover:border-slate-500 dark:hover:border-slate-700',
    default: 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
  };

  return (
    <div className="space-y-5">
      {/* Metrics Header Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 p-3 rounded-xl flex flex-col justify-center shadow-xs">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">Total Model</span>
          <span className="text-base sm:text-lg font-black text-slate-800 dark:text-white mt-0.5">{filteredModels.length}</span>
        </div>
        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 p-3 rounded-xl flex flex-col justify-center shadow-xs">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">Elit (98%+)</span>
          <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
            {filteredModels.filter(m => m.accuracy >= 98).length} <span className="text-[10px] font-normal text-slate-400">sota</span>
          </span>
        </div>
        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 p-3 rounded-xl flex flex-col justify-center shadow-xs">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">Maks Konteks</span>
          <span className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">1M+ <span className="text-[10px] font-bold text-slate-400">Tkn</span></span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Cari model vision, kelebihan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
          />
        </div>
        
        {/* Filter Badges */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg relative self-start sm:self-auto border border-slate-200/10">
          {[
            { id: 'all', label: 'Semua Model' },
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
                  layoutId="brand-filter-pill-id" 
                  className="absolute inset-0 bg-white dark:bg-slate-700 rounded-md shadow-sm z-0"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10">{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Models */}
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
                    {m.logoType === 'glm' && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-slate-950 dark:bg-black border border-slate-800 text-white font-extrabold text-[9px] shadow-xs tracking-tighter">
                        GLM
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
                        <span>Akurasi Presisi</span>
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
                        <span className="text-slate-400 block font-semibold">Batas Konteks</span>
                        <span className="text-slate-700 dark:text-slate-300 font-medium">{m.context}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold">Jenis Penyedia</span>
                        <span className="text-slate-700 dark:text-slate-300 font-medium capitalize">{m.type}</span>
                      </div>
                    </div>

                    {/* Optimized For Pill */}
                    <div>
                      <span className="block text-[8.5px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mb-1">Kelebihan Utama</span>
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

export function GuideID() {
  const [activeArticleId, setActiveArticleId] = useState<string>('welcome');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Live Crypto Sandbox States
  const [passphrase, setPassphrase] = useState<string>('secure-vault-passphrase');
  const [sandboxSalt, setSandboxSalt] = useState<string>('a1b2c3d4e5f6g7h8');
  const [plainText, setPlainText] = useState<string>('Hello World! Terenkripsi sisi klien.');
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
        
        let saltBytes = encoder.encode(sandboxSalt);
        if (saltBytes.length < 16) {
          const padded = new Uint8Array(16);
          padded.set(saltBytes);
          saltBytes = padded;
        } else if (saltBytes.length > 16) {
          saltBytes = saltBytes.slice(0, 16);
        }

        const baseKey = await window.crypto.subtle.importKey(
          'raw',
          encoder.encode(passphrase),
          'PBKDF2',
          false,
          ['deriveKey']
        );

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

        const exportedRaw = await window.crypto.subtle.exportKey('raw', aesKey);
        const keyHex = Array.from(new Uint8Array(exportedRaw))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        if (active) {
          setDerivedKeyHex(keyHex);
        }

        const demoIv = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
        const demoIvHex = Array.from(demoIv).map(b => b.toString(16).padStart(2, '0')).join('');
        if (active) setIvHex(demoIvHex);

        const encrypted = await window.crypto.subtle.encrypt(
          { name: 'AES-GCM', iv: demoIv },
          aesKey,
          encoder.encode(plainText)
        );

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
    { id: 'introduction', label: 'Pendahuluan' },
    { id: 'user_guide', label: 'Panduan Pengguna' },
    { id: 'api_guide', label: 'API & Konfigurasi' },
    { id: 'faq', label: 'FAQ & Solusi Masalah' }
  ];

  const articles: Article[] = [
    {
      id: 'welcome',
      category: 'introduction',
      title: 'Selamat Datang di OcularOCR',
      icon: BookOpen,
      renderContent: () => (
        <div className="space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
            <span className="text-[10px] font-bold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">WIKI / MEMULAI CEPAT</span>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">OcularOCR Wiki</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Pelajari cara memaksimalkan sistem dokumen dan OCR terenkripsi client-side yang offline-first ini.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 flex gap-3 text-xs leading-relaxed text-indigo-800 dark:text-indigo-300">
            <Info className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Jaminan Zero-Knowledge:</span> OcularOCR beroperasi sepenuhnya di dalam lingkungan sandbox peramban Anda. Passphrase utama Anda tidak pernah menyentuh server jarak jauh mana pun, dan file Anda dienkripsi secara lokal sebelum disimpan di IndexedDB.
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Kemampuan Inti Sistem</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <h3 className="text-sm font-semibold">100% Enkripsi Lokal</h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Enkripsi simetris AES-256-GCM tingkat militer mengamankan dokumen PDF, ekstraksi teks, dan log AI Anda di dalam database peramban Anda.
                </p>
              </div>

              <div className="p-4 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Cpu className="h-4 w-4 text-indigo-500" />
                  <h3 className="text-sm font-semibold">Arsitektur Ganda OCR</h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Ekstrak teks terbaca dari dokumen menggunakan engine Tesseract.js client-side lokal, atau tingkatkan ke model Cloud AI tercanggih.
                </p>
              </div>

              <div className="p-4 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <h3 className="text-sm font-semibold">Nol Telemetri</h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Kami sama sekali tidak mengumpulkan data penggunaan, kredensial, atau telemetri. Hub dokumen Anda sepenuhnya terisolasi di komputer lokal Anda.
                </p>
              </div>

              <div className="p-4 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Smartphone className="h-4 w-4 text-indigo-500" />
                  <h3 className="text-sm font-semibold">PWA &amp; Offline Native</h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Instal OcularOCR ke desktop atau perangkat ponsel Anda sebagai aplikasi mandiri yang diluncurkan secara instan tanpa internet aktif.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'security',
      category: 'introduction',
      title: 'Arsitektur Keamanan',
      icon: ShieldCheck,
      renderContent: () => (
        <div className="space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
            <span className="text-[10px] font-bold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase">KEAMANAN / DESAIN</span>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">Zero-Knowledge Security</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Pahami lapisan kriptografi client-side yang membuat dokumen Anda tidak dapat diakses oleh siapa pun kecuali Anda sendiri.
            </p>
          </div>

          <div className="space-y-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <p>
              OcularOCR dibangun di atas paradigma <span className="font-bold text-slate-800 dark:text-slate-200">Zero-Knowledge</span> yang ketat. Ketika Anda memilih passphrase utama, sistem tidak akan mengunggah atau mengevaluasinya di server pusat.
            </p>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-4">1. Key Derivation (PBKDF2)</h2>
            <p>
              Untuk menerjemahkan passphrase utama Anda yang mudah dibaca manusia menjadi kunci kriptografi dengan entropi tinggi, kami menggunakan standar <span className="font-bold">Password-Based Key Derivation Function 2 (PBKDF2)</span>:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><span className="font-bold">Salt:</span> Salt 16-byte unik yang dihasilkan secara aman secara kriptografis per instalasi.</li>
              <li><span className="font-bold">Iterasi:</span> 100.000 putaran komputasi HMAC-SHA-256 untuk mencegah serangan brute-force dictionary.</li>
              <li><span className="font-bold">Hasil:</span> Kunci simetris 256-bit (32 byte) yang digunakan untuk mengenkripsi dan mendekripsi dokumen secara langsung melalui Web Crypto API.</li>
            </ul>

            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-4">2. Enkripsi Dokumen AES-256-GCM</h2>
            <p>
              File (seperti PDF mentah atau gambar) dikonversi menjadi buffer biner dan dienkripsi dengan <span className="font-bold">AES-256-GCM</span> (Galois/Counter Mode). GCM memberikan kerahasiaan dan integritas data, memastikan bahwa jika ada kode berbahaya mencoba mengubah database terenkripsi lokal, proses dekripsi akan gagal dengan kesalahan keamanan.
            </p>
          </div>

          {/* Interactive Cryptographic Sandbox */}
          <div className="p-5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <Terminal className="h-4 w-4 text-indigo-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Live Client-Side Crypto Sandbox</h3>
            </div>
            
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Uji key derivation dan enkripsi AES-GCM secara langsung di memori peramban Anda di bawah ini. Nol data dikirim ke jaringan.
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
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Teks untuk Dienkripsi</label>
                  <textarea 
                    value={plainText} 
                    onChange={(e) => setPlainText(e.target.value)}
                    rows={2}
                    className="w-full text-xs p-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded font-mono focus:border-indigo-500 focus:outline-none resize-none"
                    placeholder="Tulis teks untuk dienkripsi..."
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
                  <span>PBKDF2 SHA-256 (100.000 iterasi) + AES-GCM Encrypted.</span>
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
      title: 'Memulai Cepat',
      icon: Play,
      renderContent: () => (
        <div className="space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
            <span className="text-[10px] font-bold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">PANDUAN / PENYIAPAN</span>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">Memulai dengan OcularOCR</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Ikuti panduan langkah demi langkah ini untuk mengamankan, memproses, dan menanyakan dokumen Anda.
            </p>
          </div>

          <div className="space-y-6 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {/* Step 1 */}
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <div className="flex items-center gap-2.5 mb-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold text-xs">1</span>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Inisialisasi dan Buka Kunci Vault Anda</h3>
              </div>
              <p className="mb-2">
                Saat pertama kali menjalankan aplikasi, Anda akan diminta untuk membuat atau memasukkan passphrase utama. Passphrase ini adalah kunci utama untuk penyimpanan Anda yang terenkripsi secara lokal.
              </p>
              <div className="flex gap-2 items-start mt-2 p-2.5 rounded bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 mb-3">
                <Lock className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Catatan Keamanan Penting:</span> Kami menggunakan derivasi <code className="bg-amber-100/50 dark:bg-amber-900/50 px-1 py-0.5 rounded">PBKDF2</code> untuk menghasilkan kunci enkripsi Anda sepenuhnya di peramban. <strong>Kami tidak menyimpan kata sandi Anda di server mana pun.</strong> Jika Anda kehilangan passphrase, dokumen yang disimpan tidak dapat dipulihkan.
                </div>
              </div>
              <p className="text-slate-500 text-[11px]">
                Untuk detail mengenai putaran derivasi kunci dan paradigma zero-knowledge, lihat panduan <button onClick={() => setActiveArticleId('security')} className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold inline-flex items-center gap-0.5">Arsitektur Keamanan <ChevronRight className="h-3 w-3" /></button> kami.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <div className="flex items-center gap-2.5 mb-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold text-xs">2</span>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Unggah Dokumen PDF Pertama Anda</h3>
              </div>
              <p className="mb-2">
                Setelah berada di dashboard, gunakan pengelola berkas untuk mengimpor file PDF:
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-1 mb-3">
                <li>Seret dan letakkan file secara langsung pada area dropzone atau klik panel unggah file.</li>
                <li>File Anda secara otomatis dienkripsi dengan AES-GCM sebelum disimpan di IndexedDB.</li>
                <li>Tetapkan tag secara manual untuk mengatur tagihan, kartu identitas, atau tanda terima agar dapat diambil dengan cepat.</li>
              </ul>
              <p className="text-slate-500 text-[11px]">
                Untuk mempelajari tentang ukuran unggahan file, klasifikasi tag, dan ekspor dokumen massal, lihat panduan <button onClick={() => setActiveArticleId('usage')} className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold inline-flex items-center gap-0.5">Mengelola Dokumen <ChevronRight className="h-3 w-3" /></button>.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <div className="flex items-center gap-2.5 mb-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold text-xs">3</span>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Konfigurasi API Key (Opsional tetapi Direkomendasikan)</h3>
              </div>
              <p className="mb-3">
                Untuk mengaktifkan fitur lanjutan seperti OCR berbasis AI, Auto-Tagging, dan Chat Dokumen, Anda dapat menambahkan API Key pribadi Anda di panel **Pengaturan** (diakses melalui ikon gerigi di bagian bawah sidebar):
              </p>
              
              <div className="space-y-3.5 pl-2 border-l-2 border-indigo-100 dark:border-indigo-950 mb-3">
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    Google Gemini API <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-1 py-0.5 rounded uppercase">Tersedia Tingkat Gratis</span>
                  </h4>
                  <p className="mt-0.5 text-slate-500">
                    1. Buka <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-0.5 font-medium">Google AI Studio <ExternalLink className="h-3 w-3 inline" /></a> dan hasilkan API Key.
                  </p>
                  <p className="mt-0.5 text-slate-500">
                    2. Di Pengaturan OcularOCR, pilih **Google** sebagai provider dan tempelkan kunci di kotak **API Key**.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    OpenAI atau Groq Cloud API
                  </h4>
                  <p className="mt-0.5 text-slate-500">
                    1. Buat kunci di <a href="https://platform.openai.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-0.5 font-medium">OpenAI Platform <ExternalLink className="h-3 w-3 inline" /></a> atau <a href="https://console.groq.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-0.5 font-medium">Groq Console <ExternalLink className="h-3 w-3 inline" /></a>.
                  </p>
                  <p className="mt-0.5 text-slate-500">
                    2. Di Pengaturan, pilih provider **OpenAI** dan tempelkan kunci Anda (dimulai dengan <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-[10px]">sk-</code> atau <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-[10px]">gsk_</code>) di kotak **API Key**.
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    * _Catatan:_ Untuk Groq, Anda juga harus mengubah **API Endpoint URL** menjadi <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-[10px]">https://api.groq.com/openai/v1/chat/completions</code>.
                  </p>
                </div>
              </div>

              <div className="flex gap-2 items-start p-2.5 rounded bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/40 text-indigo-800 dark:text-indigo-300 mb-3">
                <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
                <div>
                  Semua API Key dienkripsi di sisi klien menggunakan passphrase utama Anda sebelum disimpan di IndexedDB. Kunci tersebut tidak pernah dikirimkan dalam bentuk teks biasa.
                </div>
              </div>

              <p className="text-slate-500 text-[11px]">
                Untuk detail lebih lanjut tentang konfigurasi endpoint dan model khusus, lihat panduan mendalam kami <button onClick={() => setActiveArticleId('api')} className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold inline-flex items-center gap-0.5">Integrasi LLM & API <ChevronRight className="h-3 w-3" /></button>.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <div className="flex items-center gap-2.5 mb-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold text-xs">4</span>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Ekstrak Teks dengan OCR</h3>
              </div>
              <p className="mb-2">
                Untuk mengaktifkan pencarian dan obrolan, Anda perlu mengekstrak konten teks dari dokumen Anda:
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-1 mb-3">
                <li>Klik baris dokumen untuk membuka Document Viewer.</li>
                <li>Klik <span className="font-semibold text-indigo-600">Jalankan OCR Sisi Klien</span> untuk menjalankan ekstraksi teks lokal menggunakan Tesseract.js.</li>
                <li>Untuk dokumen tulisan tangan atau tata letak yang rumit, buka panel <span className="font-semibold text-indigo-600">Pengaturan</span> untuk mengaktifkan opsi <span className="font-semibold text-indigo-600">Gunakan LLM untuk OCR</span> menggunakan model vision tercanggih.</li>
              </ul>
              <p className="text-slate-500 text-[11px]">
                Untuk memahami perbedaan antara OCR lokal berbasis peramban dan OCR LLM berbasis cloud, lihat panduan <button onClick={() => setActiveArticleId('ocr')} className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold inline-flex items-center gap-0.5">Ekstraksi Teks OCR <ChevronRight className="h-3 w-3" /></button>.
              </p>
            </div>

            {/* Step 5 */}
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <div className="flex items-center gap-2.5 mb-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold text-xs">5</span>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Tanyakan dan Ringkas</h3>
              </div>
              <p className="mb-2">
                Manfaatkan konteks lokal untuk meringkas, menanyakan, dan mengumpulkan wawasan dari vault Anda:
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-1 mb-3">
                <li>Klik gelembung obrolan di sebelah dokumen mana pun atau buka sidebar Obrolan Dokumen interaktif.</li>
                <li>Ajukan pertanyaan bahasa alami seperti <em>&ldquo;Berapa total jumlah tagihan?&rdquo;</em> atau <em>&ldquo;Ringkas ketentuan kontrak.&rdquo;</em></li>
                <li>Pertanyaan Anda dan bagian dokumen yang diekstrak dikirimkan secara aman ke endpoint LLM untuk menyusun jawaban pribadi.</li>
              </ul>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Untuk menjalankan vault 100% offline atau menginstal OcularOCR sebagai aplikasi native, lihat panduan <button onClick={() => setActiveArticleId('pwa')} className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold inline-flex items-center gap-0.5">Instalasi PWA <ChevronRight className="h-3 w-3" /></button>. Jika Anda ingin mengonfigurasi AI pribadi lokal untuk obrolan offline, ringkasan, dan OCR, lihat panduan <button onClick={() => setActiveArticleId('ollama-offline')} className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold inline-flex items-center gap-0.5">AI Offline: Penyiapan Ollama <ChevronRight className="h-3 w-3" /></button>.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'usage',
      category: 'user_guide',
      title: 'Mengelola Dokumen',
      icon: FileText,
      renderContent: () => (
        <div className="space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
            <span className="text-[10px] font-bold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">PANDUAN / PENGELOLAAN BERKAS</span>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">Mengunggah &amp; Menandai</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Pelajari cara mengatur, menandai, memproses massal, dan menghapus batch berkas PDF yang aman.
            </p>
          </div>

          <div className="space-y-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">1. Unggahan Aman</h2>
            <p>
              Di tampilan pengelola berkas, Anda dapat menyeret dan meletakkan beberapa file PDF atau memilihnya menggunakan pemilih file manual. File dienkripsi secara langsung dan disimpan secara lokal. Status pengunggahan akan menampilkan progres selama pemrosesan.
            </p>

            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-4">2. Menandai dan Mencari secara Interaktif</h2>
            <p>
              Untuk memfilter file dengan cepat, Anda dapat menambahkan tag kunci (misalnya, <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-indigo-600">invoice</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-indigo-600">medical</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-indigo-600">receipt</code>).
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>Klik tombol Tag pada baris dokumen untuk melihat tag atau menambahkan yang baru.</li>
              <li>Filter dokumen secara dinamis menggunakan bilah pencarian global. Sistem secara instan mencari nama dan teks OCR yang didekripsi.</li>
            </ul>

            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-4">3. Aksi Massal (Batch Delete &amp; Export)</h2>
            <p>
              OcularOCR menyertakan pemroses batch terintegrasi:
            </p>
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 my-2">
              <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">Untuk menjalankan perintah massal:</span>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Centang kotak di sisi kiri baris dokumen.</li>
                <li>Bilah alat operasi massal akan muncul secara otomatis di bagian atas.</li>
                <li>Klik <span className="font-semibold text-red-500">Bulk Delete</span> untuk menghapus beberapa berkas dengan aman setelah menyetujui popup konfirmasi.</li>
                <li>Atau, klik <span className="font-semibold text-indigo-500">Export PDF</span> untuk menggabungkan beberapa ringkasan terdekripsi dan data OCR mentah yang diekstrak langsung ke dalam satu file PDF terpadu.</li>
              </ol>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'ocr',
      category: 'user_guide',
      title: 'Ekstraksi Teks OCR',
      icon: Cpu,
      renderContent: () => (
        <div className="space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
            <span className="text-[10px] font-bold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">PANDUAN / EKSTRAKSI OCR</span>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">Optical Character Recognition</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Pelajari cara mengonversi gambar pindaian atau teks PDF yang tidak dapat dipilih menjadi teks yang kaya, dapat disalin, dan dapat diindeks.
            </p>
          </div>

          <div className="space-y-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">1. OCR Client-Side Lokal (Tesseract.js)</h2>
            <p>
              Secara default, OcularOCR menggunakan <span className="font-bold">Tesseract.js</span> langsung di dalam peramban Anda. Ketika Anda memproses dokumen, aplikasi akan:
            </p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Merender halaman dokumen secara langsung ke elemen HTML Canvas.</li>
              <li>Mengirim buffer gambar kanvas ke Web Worker lokal yang menjalankan skrip OCR.</li>
              <li>Mengekstrak teks mentah, yang kemudian dienkripsi dan disimpan ke IndexedDB lokal.</li>
            </ol>
            <p className="mt-1.5 italic text-slate-500">
              Tidak ada sumber daya server yang digunakan, dan tidak ada data yang dikirimkan dari komputer lokal Anda.
            </p>

            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-4">2. OCR dengan Bantuan Cloud AI</h2>
            <p>
              Untuk dokumen dengan tingkat kesulitan tinggi (seperti tulisan tangan atau foto buram), engine lokal mungkin melewatkan kata-kata penting. Anda dapat mengaktifkan opsi <span className="font-bold">Gunakan LLM untuk OCR</span> di dalam modal Pengaturan.
            </p>
            <p>
              Ini mengirimkan array gambar dengan aman melalui rute proxy API terenkripsi server-side langsung ke Google Gemini API atau LLM pribadi Anda. LLM bertindak sebagai pembaca cerdas untuk mentranskripsikan tata letak dokumen secara akurat.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'pwa',
      category: 'user_guide',
      title: 'Jalan Offline: PWA',
      icon: Smartphone,
      renderContent: () => (
        <div className="space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
            <span className="text-[10px] font-bold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">OFFLINE / INSTALASI PWA</span>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">Jalan Offline: Instalasi PWA</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              OcularOCR bekerja sepenuhnya offline. Anda dapat menginstalnya di ponsel, tablet, atau komputer. Setelah diinstal, aplikasi ini berperilaku seperti aplikasi native—diluncurkan secara instan dari layar beranda Anda tanpa memerlukan koneksi internet.
            </p>
          </div>

          <div className="p-5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Akses Instan</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Klik untuk menginstal OcularOCR langsung ke sistem Anda.
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
              Instal Aplikasi OcularOCR Sekarang
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">iOS (iPhone / iPad)</h3>
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">Peramban Safari</span>
              </div>
              <ol className="list-decimal pl-4 space-y-3 text-xs text-slate-600 dark:text-slate-400">
                <li>Buka <span className="font-semibold text-slate-800 dark:text-slate-200">OcularOCR</span> di peramban Safari Anda.</li>
                <li>Ketuk tombol <span className="font-semibold text-slate-800 dark:text-slate-200">Bagikan</span> di bilah menu bawah (ikon kotak dengan panah ke atas).</li>
                <li>Gulir ke bawah daftar dan ketuk <span className="font-semibold text-slate-800 dark:text-slate-200">&ldquo;Tambahkan ke Layar Utama&rdquo;</span>.</li>
                <li>Konfirmasikan dengan mengetuk <span className="font-semibold text-slate-800 dark:text-slate-200">&ldquo;Tambah&rdquo;</span> di sudut kanan atas.</li>
              </ol>
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center gap-1.5">
                <Download className="h-3.5 w-3.5" /> Tidak memerlukan akun App Store
              </div>
            </div>

            <div className="p-5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">Android &amp; Desktop</h3>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded">Chrome / Edge / Samsung</span>
              </div>
              <ol className="list-decimal pl-4 space-y-3 text-xs text-slate-600 dark:text-slate-400">
                <li>Buka <span className="font-semibold text-slate-800 dark:text-slate-200">OcularOCR</span> di Chrome atau peramban pilihan Anda.</li>
                <li>Ketuk menu peramban (ikon tiga titik) atau klik ikon instalasi di bilah alamat.</li>
                <li>Pilih <span className="font-semibold text-slate-800 dark:text-slate-200">&ldquo;Instal aplikasi&rdquo;</span> atau <span className="font-semibold text-slate-800 dark:text-slate-200">&ldquo;Tambahkan ke Layar Utama&rdquo;</span>.</li>
                <li>Ikuti petunjuk di layar Anda untuk menyelesaikan instalasi.</li>
              </ol>
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center gap-1.5">
                <Download className="h-3.5 w-3.5" /> Terbuka di jendela native tanpa batas
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 flex gap-3 text-xs leading-relaxed text-indigo-800 dark:text-indigo-300">
            <Info className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Catatan Sinkronisasi Offline:</span> Untuk menggunakan database dokumen yang aman, ekstraksi OCR, pencarian lokal, dan berkas teks secara offline, pastikan Anda telah memuat aplikasi dan mendekripsi vault setidaknya sekali dengan koneksi internet. Terjemahan dan ringkasan LLM langsung memerlukan koneksi jaringan aktif, kecuali jika terhubung ke server Ollama lokal pribadi Anda.
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'auto-tagging',
      category: 'user_guide',
      title: 'Alur Auto-Tagging',
      icon: Tag,
      renderContent: () => (
        <div className="space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
            <span className="text-[10px] font-bold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">WIKI / KLASIFIKASI</span>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">Smart Auto-Tagging Engine</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Atur dan klasifikasikan dokumen secara otomatis menggunakan alur tagging ganda offline dan bantuan LLM.
            </p>
          </div>

          <div className="space-y-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <p>
              Mengetik tag secara manual untuk setiap dokumen sangat membosankan. OcularOCR memperkenalkan **Auto-Tagging Engine** cerdas yang menganalisis konten dokumen dan nama file untuk menyarankan kategori fidelitas tinggi.
            </p>

            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-4">1. Arsitektur Klasifikasi Ganda</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-3">
              <div className="p-4 rounded border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-1">Heuristik Lokal (Offline-First)</h3>
                <p className="text-[11px] text-slate-500">
                  Melakukan pencocokan kata kunci yang sangat cepat dan klasifikasi regex langsung di peramban Anda. Secara instan mendeteksi kategori seperti Kuitansi (Receipt), Faktur (Invoice), Kontrak, ID, dan dokumen Medis tanpa memerlukan koneksi internet atau API Key.
                </p>
              </div>
              <div className="p-4 rounded border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <h3 className="font-bold text-indigo-600 dark:text-indigo-400 mb-1">Klasifikasi LLM (AI-Powered)</h3>
                <p className="text-[11px] text-slate-500">
                  Memanfaatkan Gemini, OpenAI, atau Ollama untuk memahami konteks dokumen Anda secara mendalam dan menyarankan tag yang tepat. Ini beroperasi dengan aman di server-side, menjaga kunci Anda tetap tersembunyi sepenuhnya.
                </p>
              </div>
            </div>

            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-4">2. Di Mana Menggunakan Auto-Tagging</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Bulk OCR &amp; Auto-Tag:</span> Saat menjalankan Bulk OCR dari pengelola berkas, engine secara otomatis berjalan di latar belakang dan menandai semua file yang dipilih dengan kategori yang cocok.
              </li>
              <li>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Single OCR Auto-Tag:</span> Saat Anda melihat dokumen dan mengklik &ldquo;JALANKAN OCR SISI KLIEN&rdquo;, dokumen akan dikategorikan secara otomatis segera setelah ekstraksi teks selesai.
              </li>
              <li>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Tagging Inline Interaktif:</span> Arahkan kursor ke dokumen apa pun di penjelajah file utama, klik tombol <span className="font-bold text-indigo-600">+ tag</span>, dan klik salah satu tag yang disarankan untuk segera menetapkannya!
              </li>
              <li>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Panel Kategori yang Disarankan:</span> Di dalam sidebar kanan penampil dokumen, di bawah &ldquo;Suggested Categories&rdquo;, klik label pintar apa pun dengan ikon <span className="font-bold text-xs">+</span> untuk langsung menambahkannya ke metadata dokumen terenkripsi.
              </li>
            </ul>

            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/50 flex gap-3 text-xs leading-relaxed text-green-800 dark:text-green-300 mt-4">
              <ShieldCheck className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Metadata Tag Terenkripsi:</span> Sama seperti konten dokumen, semua tag yang disarankan dienkripsi sepenuhnya menggunakan AES-256-GCM sebelum disimpan. Tag yang disarankan tidak pernah bocor ke pihak ketiga.
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'ollama-offline',
      category: 'user_guide',
      title: 'AI Offline: Penyiapan Ollama',
      icon: Terminal,
      renderContent: () => (
        <div className="space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
            <span className="text-[10px] font-bold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">PANDUAN / BEBAN KERJA LOKAL</span>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">Mengonfigurasi Ollama untuk AI Offline</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Pelajari cara menjalankan model LLM Multimodal/Vision open-weight secara lokal di mesin Anda sendiri untuk 100% offline OCR dokumen, obrolan, dan peringkasan.
            </p>
          </div>

          <div className="space-y-6 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {/* Specs / Requirements */}
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                <Cpu className="h-4 w-4 text-indigo-500" />
                Persyaratan Perangkat Keras untuk Vision VLM
              </h3>
              <p className="mb-3">
                Vision-Language Models (VLM) memproses potongan gambar bersama teks, membutuhkan memori dan komputasi yang jauh lebih besar daripada model teks saja.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 rounded border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">Untuk Model Vision 7B - 12B</span>
                  <p className="text-[11px] mb-1">misalnya, <strong>Qwen2.5-VL-7B</strong>, <strong>Llama-3.2-Vision (11B)</strong>, atau <strong>Gemma 4 12B</strong>.</p>
                  <ul className="list-disc pl-4 space-y-1 text-[11px] mt-1.5 font-medium text-slate-500">
                    <li><strong>Minimum:</strong> 16GB RAM/Unified Memory (Mac M1/M2/M3) atau 12GB VRAM (NVIDIA RTX 3060/4060).</li>
                    <li><strong>Rekomendasi:</strong> 24GB Unified Memory / VRAM (Mac Studio, RTX 3090/4090) untuk inferensi visual di bawah satu detik.</li>
                  </ul>
                </div>

                <div className="p-3 rounded border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">Untuk Model MoE / Padat 26B+</span>
                  <p className="text-[11px] mb-1">misalnya, <strong>Qwen3.6 27B</strong>, <strong>Gemma 4 26B A4B</strong>, atau <strong>Llama 4 Maverick</strong>.</p>
                  <ul className="list-disc pl-4 space-y-1 text-[11px] mt-1.5 font-medium text-slate-500">
                    <li><strong>Minimum:</strong> 32GB RAM/Unified Memory atau 16GB VRAM (dengan kuantisasi agresif).</li>
                    <li><strong>Rekomendasi:</strong> 64GB Unified Memory (Apple Silicon) atau GPU ganda (2x24GB VRAM) untuk mencegah hambatan eksekusi.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Install Step */}
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">1. Instal Ollama</h3>
              <p className="mb-2">
                Unduh dan instal aplikasi Ollama native untuk platform Anda:
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-1 mb-3">
                <li><strong>macOS &amp; Windows:</strong> Unduh dan jalankan penyiapan dari <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline inline-flex items-center gap-0.5">ollama.com <ExternalLink className="h-3 w-3 inline" /></a>.</li>
                <li>
                  <strong>Linux:</strong> Instal secara instan melalui perintah curl:
                  <pre className="mt-1.5 bg-slate-950 text-slate-100 font-mono text-[10px] p-2 rounded overflow-x-auto select-all">
                    curl -fsSL https://ollama.com/install.sh | sh
                  </pre>
                </li>
              </ul>
            </div>

            {/* Pull Vision Model */}
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">2. Tarik Model Vision (Pull)</h3>
              <p className="mb-2">
                Buka terminal Anda dan tarik VLM berkemampuan vision. Seri <strong>Qwen2.5-VL</strong> sangat direkomendasikan karena unggul dalam pemahaman tata letak, OCR multibahasa, dan transkripsi rumus matematika.
              </p>
              <div className="space-y-2 mt-2">
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Opsi A: Qwen 2.5 VL 7B (Direkomendasikan untuk GPU standar)</span>
                  <pre className="bg-slate-950 text-slate-100 font-mono text-[10px] p-2 rounded overflow-x-auto select-all">
                    ollama run qwen2.5-vl:7b
                  </pre>
                </div>
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Opsi B: Llama 3.2 Vision 11B (VLM yang sangat responsif)</span>
                  <pre className="bg-slate-950 text-slate-100 font-mono text-[10px] p-2 rounded overflow-x-auto select-all">
                    ollama run llama3.2-vision
                  </pre>
                </div>
              </div>
            </div>

            {/* CORS Policy Step */}
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                <HelpCircle className="h-4 w-4 text-indigo-500" />
                3. Konfigurasi CORS (Cross-Origin Resource Sharing)
              </h3>
              <p className="mb-3">
                Karena OcularOCR beroperasi langsung di dalam peramban web Anda (client-side), peramban akan memblokir permintaan ke Ollama (<code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">http://localhost:11434</code>) kecuali Anda mengaktifkan izin cross-origin di Ollama.
              </p>
              
              <div className="space-y-3.5 pl-2 border-l-2 border-slate-200 dark:border-slate-800">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">Konfigurasi macOS</span>
                  <p className="mt-0.5">1. Keluar dari Ollama dari ikon status bilah menu.</p>
                  <p className="mt-0.5">2. Buka Terminal dan atur variabel lingkungan:</p>
                  <pre className="mt-1 bg-slate-950 text-slate-100 font-mono text-[10px] p-2 rounded overflow-x-auto select-all">
                    {`launchctl setenv OLLAMA_ORIGINS "*"`}
                  </pre>
                  <p className="mt-1">3. Luncurkan kembali Ollama dari folder Aplikasi Anda.</p>
                </div>

                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">Konfigurasi Windows</span>
                  <p className="mt-0.5">1. Keluar dari Ollama dari baki sistem (system tray).</p>
                  <p className="mt-0.5">2. Cari &ldquo;Variabel Lingkungan&rdquo; di Windows Search, lalu klik **Edit system environment variables**.</p>
                  <p className="mt-0.5">3. Tambahkan **User Variable** baru dengan Nama <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">OLLAMA_ORIGINS</code> dan Nilai <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">*</code>.</p>
                  <p className="mt-0.5">4. Simpan dan luncurkan kembali aplikasi Ollama.</p>
                </div>

                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">Konfigurasi Linux (systemd)</span>
                  <p className="mt-0.5">1. Edit konfigurasi layanan:</p>
                  <pre className="mt-1 bg-slate-950 text-slate-100 font-mono text-[10px] p-2 rounded overflow-x-auto select-all">
                    sudo systemctl edit ollama.service
                  </pre>
                  <p className="mt-1">2. Tambahkan variabel lingkungan di bawah grup <code className="bg-slate-900 px-1 rounded text-slate-300">[Service]</code>:</p>
                  <pre className="mt-1 bg-slate-950 text-slate-100 font-mono text-[10px] p-2 rounded overflow-x-auto">
{`[Service]
Environment="OLLAMA_ORIGINS=*"`}
                  </pre>
                  <p className="mt-1">3. Simpan file, muat ulang systemd, dan restart layanan:</p>
                  <pre className="mt-1 bg-slate-950 text-slate-100 font-mono text-[10px] p-2 rounded overflow-x-auto select-all">
                    sudo systemctl daemon-reload && sudo systemctl restart ollama
                  </pre>
                </div>
              </div>
            </div>

            {/* OcularOCR Config Step */}
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">4. Hubungkan OcularOCR ke Ollama</h3>
              <p className="mb-2.5">
                Setelah Ollama dikonfigurasi dan berjalan dengan model Anda, hubungkan di dalam OcularOCR:
              </p>
              <ol className="list-decimal pl-5 space-y-1.5 mb-3 font-medium text-slate-500">
                <li>Klik tombol **Pengaturan** (ikon gerigi) di sudut kiri bawah sidebar.</li>
                <li>Di bawah **Pengaturan AI**, pilih provider **Ollama**.</li>
                <li>Atur **Model Name** agar cocok dengan nama model lokal Anda (misalnya, <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-[10px]">qwen2.5-vl:7b</code>).</li>
                <li>Pastikan **API Endpoint URL** diatur ke port lokal Ollama: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-[10px]">http://localhost:11434/v1</code>.</li>
                <li>Biarkan bidang **API Key** kosong, lalu klik **Simpan Pengaturan**.</li>
              </ol>

              <div className="flex gap-2 items-start mt-2 p-2.5 rounded bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300">
                <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                <div>
                  <strong>Sukses Offline:</strong> Anda sekarang menjalankan transkripsi dokumen dan kueri sepenuhnya secara lokal. Nol telemetri, nol permintaan jaringan eksternal, dan privasi zero-knowledge mutlak.
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'vision-models',
      category: 'api_guide',
      title: 'Model Vision & OCR',
      icon: Eye,
      renderContent: () => (
        <div className="space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
            <span className="text-[10px] font-bold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">WIKI / TEKNOLOGI TERKINI</span>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">Registri Model Vision &amp; OCR</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Jelajahi model vision-language, penalaran multimodal, dan model OCR dengan akurasi tinggi yang tersedia di Roboflow Playground.
            </p>
          </div>

          <div className="space-y-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <p>
              Digitalisasi dokumen modern memanfaatkan model bahasa-visi (VLM) canggih dan alur pembelajaran mendalam. Gunakan registri interaktif ini untuk menelusuri karakteristik kinerja, batas konteks, dan kekuatan spesifik dari setiap model kelas dunia.
            </p>

            <ModelRegistry />
          </div>
        </div>
      )
    },
    {
      id: 'api',
      category: 'api_guide',
      title: 'Integrasi LLM &amp; API',
      icon: Code,
      renderContent: () => (
        <div className="space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
            <span className="text-[10px] font-bold tracking-widest text-violet-600 dark:text-violet-400 uppercase">INTEGRASI / PROTOKOL</span>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">Konfigurasi LLM &amp; API</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Konfigurasikan endpoint kustom pribadi, model, dan rute permintaan secara aman ke AI Provider pilihan Anda.
            </p>
          </div>

          <div className="space-y-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <p>
              Untuk berinteraksi dengan dokumen (Ringkasan, Terjemahan, Chat), OcularOCR memungkinkan Anda mengonfigurasi API Key pribadi Anda untuk privasi maksimal.
            </p>

            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-4">1. AI Provider yang Didukung</h2>
            <div className="space-y-3">
              <div className="border border-slate-200 dark:border-slate-800 rounded p-3 bg-white dark:bg-slate-900">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-800 dark:text-slate-100">Google Gemini API</span>
                  <span className="px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-950/20 dark:text-green-400 text-[9px] rounded font-semibold uppercase tracking-wider">Direkomendasikan</span>
                </div>
                <p className="text-slate-500 mb-2">Kinerja luar biasa dan jendela konteks yang sangat besar. Menggunakan model gemini-3.5-flash terbaru atau model eksperimental.</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400">Model Default:</span>
                  <code className="bg-slate-100 dark:bg-slate-800 text-indigo-600 px-1 rounded text-[10px]">gemini-3.5-flash</code>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded p-3 bg-white dark:bg-slate-900">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-800 dark:text-slate-100">OpenAI / Compatible API (OpenAI, Groq, DeepSeek)</span>
                  <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 text-[9px] rounded font-semibold uppercase tracking-wider">Universal</span>
                </div>
                <p className="text-slate-500 mb-2">Kompatibel sepenuhnya dengan endpoint standar seperti OpenAI, Groq Cloud, OpenRouter, dan endpoint kustom.</p>
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
                  <span className="font-bold text-slate-800 dark:text-slate-100">Model Pribadi Lokal (Ollama)</span>
                  <span className="px-1.5 py-0.5 bg-violet-100 text-violet-700 dark:bg-violet-950/20 dark:text-violet-400 text-[9px] rounded font-semibold uppercase tracking-wider">100% Offline</span>
                </div>
                <p className="text-slate-500 mb-2">Alur kerja offline sepenuhnya. Terhubung ke instance Ollama lokal Anda melalui endpoint localhost.</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400">Endpoint Default:</span>
                  <code className="bg-slate-100 dark:bg-slate-800 text-indigo-600 px-1 rounded text-[10px]">http://localhost:11434/v1</code>
                </div>
              </div>
            </div>

            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-6">2. Contoh Struktur Payload JSON</h2>
            <p>
              Saat kueri dikirimkan, komponen klien mendekripsi fragmen dokumen yang diperlukan secara lokal dan menyusun permintaan proxy. Berikut adalah contoh format permintaan yang diteruskan dengan aman melalui server route:
            </p>

            <div className="relative">
              <button 
                onClick={() => handleCopy(JSON.stringify(apiPayloadExample, null, 2), 'payload')}
                className="absolute right-2 top-2 p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-500 transition-colors"
                title="Salin Kode"
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

            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-6">3. Panduan Pembuatan API Key</h2>
            <div className="space-y-4">
              <div className="border border-slate-200 dark:border-slate-800 rounded p-4 bg-slate-50/50 dark:bg-slate-950/20">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-bold">1</span>
                  Google Gemini API Key
                </h3>
                <p className="text-slate-500 mb-3">Google Gemini menawarkan akses API tingkat gratis yang melimpah, analisis multi-halaman yang luar biasa, dan pemahaman optik yang kuat.</p>
                <ol className="list-decimal pl-4 space-y-1.5 text-slate-600 dark:text-slate-400">
                  <li>Buka <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-medium">Google AI Studio Console</a>.</li>
                  <li>Klik tombol <span className="font-semibold text-slate-800 dark:text-slate-200">&ldquo;Create API Key&rdquo;</span> yang menonjol.</li>
                  <li>Pilih Google Cloud Project yang ada atau buat baru secara instan.</li>
                  <li>Salin kunci yang baru Anda hasilkan dan simpan dengan aman.</li>
                  <li>Di OcularOCR, klik <span className="font-semibold text-slate-800 dark:text-slate-200">Pengaturan</span>, pilih provider <span className="font-bold">Gemini</span>, masukkan kunci Anda, lalu simpan.</li>
                </ol>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded p-4 bg-slate-50/50 dark:bg-slate-950/20">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-bold">2</span>
                  Konfigurasi OpenAI Compatible / Groq Cloud
                </h3>
                <p className="text-slate-500 mb-3">OpenAI dan Groq didukung sepenuhnya. Groq sangat direkomendasikan karena kecepatan tokennya yang memecahkan rekor dan throughput yang tinggi.</p>
                <ol className="list-decimal pl-4 space-y-1.5 text-slate-600 dark:text-slate-400 mb-3">
                  <li>Buka <a href="https://console.groq.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-medium">Groq Cloud Console</a> (atau OpenAI Platform).</li>
                  <li>Di menu sidebar, pilih <span className="font-semibold text-slate-800 dark:text-slate-200">API Keys</span>.</li>
                  <li>Klik <span className="font-semibold text-slate-800 dark:text-slate-200">&ldquo;Create API Key&rdquo;</span>, salin kunci yang dihasilkan dengan aman.</li>
                  <li>Di OcularOCR, klik <span className="font-semibold text-slate-800 dark:text-slate-200">Pengaturan</span>, pilih tab <span className="font-bold">OpenAI Compatible</span>.</li>
                  <li>Tempelkan kunci Anda, atur endpoint ke: <code className="bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 px-1 rounded text-[10px]">https://api.groq.com/openai/v1/chat/completions</code> dan pilih model <code className="bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 px-1 rounded text-[10px]">meta-llama/llama-4-scout-17b-16e-instruct</code>.</li>
                </ol>
                <div className="p-3 rounded bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 text-[11px]">
                  <span className="font-bold text-indigo-700 dark:text-indigo-400 block mb-1">💡 Model yang Direkomendasikan:</span>
                  <ul className="list-disc pl-4 space-y-1 text-indigo-900/80 dark:text-indigo-300/80">
                    <li>Kami sangat menyarankan untuk menyetel pengidentifikasi model ke <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/60 font-semibold text-indigo-600 dark:text-indigo-400 text-[10px]">meta-llama/llama-4-scout-17b-16e-instruct</code> pada endpoint Groq.</li>
                    <li>Model ini menghadirkan kecepatan token yang luar biasa, keluaran ringkasan berkualitas tinggi, dan **dukungan vision multimodal penuh** untuk ekstraksi OCR langsung dari gambar!</li>
                  </ul>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded p-4 bg-slate-50/50 dark:bg-slate-950/20">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-bold">3</span>
                  Penyiapan API Ollama Lokal
                </h3>
                <p className="text-slate-500 mb-3">Untuk penyiapan offline yang sepenuhnya privat, OcularOCR terhubung langsung ke endpoint kompatibel OpenAI dari instance Ollama lokal Anda.</p>
                <ol className="list-decimal pl-4 space-y-1.5 text-slate-600 dark:text-slate-400 mb-3">
                  <li>Pastikan Ollama terinstal dan berjalan di komputer lokal Anda.</li>
                  <li>Verifikasi bahwa pengaturan asal CORS dikonfigurasi dengan benar untuk memungkinkan koneksi peramban.</li>
                  <li>Di OcularOCR, buka <span className="font-semibold text-slate-800 dark:text-slate-200">Pengaturan</span>, pilih provider <span className="font-bold">Ollama</span>.</li>
                  <li>Biarkan bidang **API Key** kosong, dan pastikan API Endpoint diatur ke: <code className="bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 px-1 rounded text-[10px]">http://localhost:11434/v1</code>.</li>
                  <li>Atur nama model pilihan Anda (misalnya, <code className="bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 px-1 rounded text-[10px]">qwen2.5-vl:7b</code> atau <code className="bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 px-1 rounded text-[10px]">llama3.2-vision</code>).</li>
                </ol>
                <div className="p-3 rounded bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 text-[11px]">
                  <span className="font-bold text-indigo-700 dark:text-indigo-400 block mb-1">💡 Instalasi &amp; Spesifikasi Detail:</span>
                  <p className="text-indigo-900/80 dark:text-indigo-300/80 font-medium">
                    Untuk menelusuri instalasi lengkap, persyaratan perangkat keras, pilihan model, dan cara mengaktifkan CORS di macOS, Windows, atau Linux, lihat detail panduan <button onClick={() => setActiveArticleId('ollama-offline')} className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold inline-flex items-center gap-0.5">AI Offline: Penyiapan Ollama <ChevronRight className="h-3 w-3 inline" /></button>.
                  </p>
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
            <span className="text-[10px] font-bold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">WIKI / DUKUNGAN</span>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">Frequently Asked Questions</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Dapatkan jawaban langsung untuk pertanyaan teknis, kriptografis, dan operasional yang umum.
            </p>
          </div>

          <div className="space-y-4">
            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-4">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-1.5">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                Apa yang terjadi jika saya kehilangan Master Passphrase saya?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Karena OcularOCR adalah sistem <span className="font-bold">Zero-Knowledge</span>, kami tidak menyimpan kunci, hash kata sandi, atau kode pemulihan Anda di server pusat mana pun. Jika Anda kehilangan passphrase, <span className="text-red-500 font-semibold">dokumen Anda akan hilang secara permanen dan tidak dapat dipulihkan</span>. Tidak ada alur reset kata sandi. Selalu simpan passphrase Anda di pengelola kredensial yang aman.
              </p>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-4">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-1.5">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                Di mana berkas dan kunci saya disimpan?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Buffer dokumen terenkripsi dan tag Anda disimpan di sandbox lokal peramban Anda menggunakan <span className="font-bold">IndexedDB</span> (dikelola secara aman melalui kunci IndexedDB). Kunci enkripsi itu sendiri hanya berada di RAM peramban sementara Anda saat vault dibuka, dan segera dihapus dari RAM ketika Anda mengunci vault atau menutup jendela.
              </p>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-4">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-1.5">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                Apakah ada batas ukuran atau jumlah dokumen?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Tidak ada batasan jumlah dokumen yang ketat. IndexedDB mampu menyimpan hingga beberapa gigabyte tergantung pada sisa penyimpanan hard-drive Anda. Namun, file PDF yang sangat besar (50+ halaman) mungkin mengalami keterlambatan perenderaan atau local Tesseract OCR karena alokasi memori peramban yang terbatas.
              </p>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-4">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-1.5">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                Apakah API Key saya terekspos ke browser client?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Tidak. Jika Anda mengonfigurasi pengaturan API kustom (seperti kredensial Gemini atau OpenAI), kunci tersebut akan dienkripsi secara lokal di mesin Anda sebelum ditulis ke penyimpanan. Saat melakukan panggilan API, nilainya untuk sementara dilewatkan melalui handler rute API server lokal yang bertindak sebagai proxy aman, menjaga token pribadi Anda tetap tersembunyi.
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
                      placeholder="Cari Wiki Vault..." 
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
                placeholder="Cari Wiki Vault..." 
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
