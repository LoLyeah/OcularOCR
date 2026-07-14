'use client';

import { useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, Cloud, Download, ExternalLink, FileText, HelpCircle, KeyRound, Menu, ScanText, Search, ShieldCheck, Table2, X } from 'lucide-react';
import { PROVIDERS } from '@/lib/providers';

type Locale = 'en' | 'id';
type ArticleId = 'start' | 'ocr' | 'structure' | 'export' | 'providers' | 'recovery' | 'faq';

const copy = {
  en: {
    title: 'OcularOCR Guide', search: 'Search the guide…', reviewed: 'Provider guidance reviewed 14 July 2026',
    nav: { start: 'Start & vault', ocr: 'OCR choices', structure: 'Structure & correction', export: 'Export', providers: 'AI providers', recovery: 'Backup & recovery', faq: 'Privacy FAQ' },
  },
  id: {
    title: 'Panduan OcularOCR', search: 'Cari panduan…', reviewed: 'Panduan provider ditinjau 14 Juli 2026',
    nav: { start: 'Mulai & vault', ocr: 'Pilihan OCR', structure: 'Struktur & koreksi', export: 'Ekspor', providers: 'Provider AI', recovery: 'Cadangan & pemulihan', faq: 'FAQ privasi' },
  },
} as const;

const icons = { start: KeyRound, ocr: ScanText, structure: Table2, export: Download, providers: Cloud, recovery: ShieldCheck, faq: HelpCircle };
const articleIds = Object.keys(icons) as ArticleId[];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="space-y-3"><h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2><div className="space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{children}</div></section>;
}

function Steps({ items }: { items: string[] }) {
  return <ol className="space-y-2">{items.map((item, index) => <li key={item} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">{index + 1}</span><span>{item}</span></li>)}</ol>;
}

function Article({ id, locale }: { id: ArticleId; locale: Locale }) {
  const en = locale === 'en';
  if (id === 'start') return <div className="space-y-8">
    <Section title={en ? 'Create and unlock your vault' : 'Buat dan buka vault'}>
      <p>{en ? 'Your passphrase derives the encryption key in this browser. OcularOCR does not store the passphrase and cannot recover it.' : 'Frasa sandi menghasilkan kunci enkripsi di peramban ini. OcularOCR tidak menyimpan frasa sandi dan tidak dapat memulihkannya.'}</p>
      <Steps items={en ? ['Create a strong, unique passphrase and store it safely.', 'Add PDFs or images. Files and metadata are encrypted before IndexedDB storage.', 'Optionally link a supported passkey for faster unlock on this device.', 'Export an encrypted backup before storing irreplaceable documents.'] : ['Buat frasa sandi yang kuat dan unik, lalu simpan dengan aman.', 'Tambahkan PDF atau gambar. File dan metadata dienkripsi sebelum disimpan di IndexedDB.', 'Jika didukung, tautkan passkey untuk membuka lebih cepat di perangkat ini.', 'Ekspor cadangan terenkripsi sebelum menyimpan dokumen yang tidak tergantikan.']} />
    </Section>
    <Section title={en ? 'Daily workflow' : 'Alur kerja harian'}><p>{en ? 'Open a document, choose local or AI OCR, review the result, correct structure and tables, then export the format you need. Lock the vault when finished.' : 'Buka dokumen, pilih OCR lokal atau AI, periksa hasilnya, koreksi struktur dan tabel, lalu ekspor format yang dibutuhkan. Kunci vault setelah selesai.'}</p></Section>
  </div>;

  if (id === 'ocr') return <div className="space-y-8">
    <Section title={en ? 'Choose the right OCR path' : 'Pilih jalur OCR yang tepat'}>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900 dark:bg-emerald-950/20"><h3 className="font-bold text-emerald-800 dark:text-emerald-300">{en ? 'Local Tesseract' : 'Tesseract lokal'}</h3><p className="mt-1 text-xs">{en ? 'Runs in the browser and does not send document content to a provider. Best for clear printed text and offline work.' : 'Berjalan di peramban dan tidak mengirim isi dokumen ke provider. Cocok untuk teks cetak yang jelas dan penggunaan offline.'}</p></div>
        <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-900 dark:bg-indigo-950/20"><h3 className="font-bold text-indigo-800 dark:text-indigo-300">{en ? 'AI OCR' : 'OCR AI'}</h3><p className="mt-1 text-xs">{en ? 'Can improve handwriting and complex layouts. Remote endpoints receive selected page images; explicit cloud consent is required.' : 'Dapat membantu tulisan tangan dan tata letak kompleks. Endpoint remote menerima gambar halaman terpilih; persetujuan cloud wajib.'}</p></div>
      </div>
      <p>{en ? 'Preprocessing can rotate, deskew, increase contrast, denoise, grayscale, or binarize pages. Higher PDF render scale improves small text but uses more memory.' : 'Pra-pemrosesan dapat memutar, meluruskan, meningkatkan kontras, mengurangi noise, membuat skala abu-abu, atau biner. Skala render PDF yang lebih tinggi membantu teks kecil tetapi memakai lebih banyak memori.'}</p>
    </Section>
  </div>;

  if (id === 'structure') return <div className="space-y-8">
    <Section title={en ? 'Headings, lists, and tables' : 'Judul, daftar, dan tabel'}>
      <p>{en ? 'Structured OCR stores each page as editable blocks. Change a block between paragraph, heading, list, or table. Table cells support header flags and row/column spans.' : 'OCR terstruktur menyimpan setiap halaman sebagai blok yang dapat diedit. Ubah blok menjadi paragraf, judul, daftar, atau tabel. Sel tabel mendukung penanda header serta rentang baris/kolom.'}</p>
      <Steps items={en ? ['Run OCR and open the structure editor.', 'Review reading order and block types.', 'Edit text and table cells; add or remove rows and columns as needed.', 'Use correction preview to compare changes before accepting them.'] : ['Jalankan OCR dan buka editor struktur.', 'Periksa urutan baca dan jenis blok.', 'Edit teks dan sel tabel; tambah atau hapus baris dan kolom sesuai kebutuhan.', 'Gunakan pratinjau koreksi untuk membandingkan perubahan sebelum menerimanya.']} />
      <p className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300">{en ? 'AI cleanup sends extracted text—not necessarily page images—to the configured remote provider. Review every correction for names, numbers, and dates.' : 'Pembersihan AI mengirim teks hasil ekstraksi—tidak selalu gambar halaman—ke provider remote yang dikonfigurasi. Periksa setiap koreksi, terutama nama, angka, dan tanggal.'}</p>
    </Section>
  </div>;

  if (id === 'export') return <div className="space-y-8"><Section title={en ? 'Export corrected results' : 'Ekspor hasil terkoreksi'}>
    <p>{en ? 'Exports use the current corrected structure, including edited tables.' : 'Ekspor menggunakan struktur terkoreksi saat ini, termasuk tabel yang telah diedit.'}</p>
    <div className="grid gap-2 sm:grid-cols-2">{(en ? [['Markdown','Headings, lists, and Markdown tables.'],['PDF','Reflowed PDF or searchable PDF with a text layer.'],['DOCX','Editable Word document with native tables.'],['CSV / JSON','Tables for spreadsheets or the full structured data model.']] : [['Markdown','Judul, daftar, dan tabel Markdown.'],['PDF','PDF reflow atau PDF searchable dengan lapisan teks.'],['DOCX','Dokumen Word yang dapat diedit dengan tabel native.'],['CSV / JSON','Tabel untuk spreadsheet atau model data terstruktur lengkap.']]).map(([name, description]) => <div key={name} className="rounded border border-slate-200 p-3 dark:border-slate-800"><h3 className="font-bold text-slate-800 dark:text-slate-200">{name}</h3><p className="text-xs">{description}</p></div>)}</div>
    <p>{en ? 'CSV exports tables only. Searchable PDF preserves the source page appearance and adds invisible selectable text; reflowed PDF rebuilds content from the corrected structure.' : 'CSV hanya mengekspor tabel. PDF searchable mempertahankan tampilan halaman sumber dan menambahkan teks tak terlihat yang dapat dipilih; PDF reflow membangun ulang isi dari struktur terkoreksi.'}</p>
  </Section></div>;

  if (id === 'providers') return <div className="space-y-8"><Section title={en ? 'Set up and verify a provider' : 'Siapkan dan verifikasi provider'}>
    <Steps items={en ? ['Open Settings → AI Processing.', 'Choose Gemini, OpenAI-compatible, or local Ollama.', 'Enter a model ID and, where required, an API key and endpoint.', 'Select Test setup. OcularOCR discovers available models and sends tiny synthetic checks for text, image input, and structured JSON.', 'Enable cloud consent only if you accept the selected remote provider receiving content for the task.'] : ['Buka Pengaturan → Pemrosesan AI.', 'Pilih Gemini, OpenAI-compatible, atau Ollama lokal.', 'Masukkan ID model dan, bila diperlukan, API key serta endpoint.', 'Pilih Uji konfigurasi. OcularOCR menemukan model yang tersedia dan mengirim pengujian sintetis kecil untuk teks, input gambar, dan JSON terstruktur.', 'Aktifkan persetujuan cloud hanya jika Anda menerima provider remote terpilih menerima isi untuk tugas tersebut.']} />
    <div className="space-y-2">{PROVIDERS.map((provider) => <div key={provider.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold text-slate-800 dark:text-slate-200">{provider.name}</h3><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500 dark:bg-slate-800">{provider.kind}</span></div><p className="mt-1 text-xs">{provider.summary}</p><p className="mt-2 text-xs"><span className="font-semibold">{en ? 'Dated example' : 'Contoh bertanggal'}:</span> <code>{provider.modelExample}</code> · <a href={provider.modelsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-indigo-600 hover:underline dark:text-indigo-400">{en ? 'official models' : 'model resmi'} <ExternalLink className="h-3 w-3" /></a></p></div>)}</div>
    <p className="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300">{en ? 'API keys are encrypted at rest inside the vault. To call a provider, the browser decrypts the key in memory and sends it directly to that endpoint. OcularOCR does not hide it behind an AI proxy.' : 'API key dienkripsi saat tersimpan di vault. Untuk memanggil provider, peramban mendekripsi kunci di memori dan mengirimkannya langsung ke endpoint tersebut. OcularOCR tidak menyembunyikannya di balik proxy AI.'}</p>
  </Section></div>;

  if (id === 'recovery') return <div className="space-y-8"><Section title={en ? 'Protect and recover local data' : 'Lindungi dan pulihkan data lokal'}>
    <Steps items={en ? ['Open Settings → Offline & Storage and request persistent storage where supported.', 'Export an encrypted vault backup regularly and keep it outside the browser profile.', 'To restore, choose Import backup. Existing local vault data is replaced only after confirmation.', 'Keep the original vault passphrase. The encrypted backup cannot reset or bypass it.'] : ['Buka Pengaturan → Offline & Penyimpanan dan minta penyimpanan persisten jika didukung.', 'Ekspor cadangan vault terenkripsi secara rutin dan simpan di luar profil peramban.', 'Untuk memulihkan, pilih Impor cadangan. Data vault lokal diganti hanya setelah konfirmasi.', 'Simpan frasa sandi vault asli. Cadangan terenkripsi tidak dapat mereset atau melewatinya.']} />
    <p>{en ? 'Browser data clearing, private browsing, profile removal, storage pressure, or a device failure can remove the local vault. OcularOCR has no server copy.' : 'Penghapusan data peramban, mode privat, penghapusan profil, tekanan penyimpanan, atau kerusakan perangkat dapat menghapus vault lokal. OcularOCR tidak memiliki salinan server.'}</p>
  </Section></div>;

  return <div className="space-y-6"><Section title={en ? 'Privacy boundaries' : 'Batas privasi'}>
    {(en ? [
      ['Does local OCR use the network?', 'The OCR operation itself stays in the browser. A first-time language-pack download or app update still needs a network connection.'],
      ['What leaves my device?', 'Nothing for local Tesseract. AI OCR sends selected page images. AI correction, summaries, and AI tags send extracted text to the configured endpoint.'],
      ['Are API keys visible to the app?', 'Yes while needed for a direct browser request. They are encrypted at rest, but a compromised browser session or malicious extension could access unlocked data.'],
      ['What if a model disappears?', 'Open Settings, discover models again, choose an available model, and rerun the capability test. Dated examples are guidance, not availability guarantees.'],
    ] : [
      ['Apakah OCR lokal memakai jaringan?', 'Operasi OCR tetap di peramban. Unduhan pertama paket bahasa atau pembaruan aplikasi tetap membutuhkan koneksi jaringan.'],
      ['Apa yang keluar dari perangkat?', 'Tidak ada untuk Tesseract lokal. OCR AI mengirim gambar halaman terpilih. Koreksi AI, ringkasan, dan tag AI mengirim teks hasil ekstraksi ke endpoint yang dikonfigurasi.'],
      ['Apakah API key terlihat oleh aplikasi?', 'Ya, saat diperlukan untuk permintaan langsung dari peramban. Kunci dienkripsi saat tersimpan, tetapi sesi peramban yang disusupi atau ekstensi berbahaya dapat mengakses data yang sedang terbuka.'],
      ['Bagaimana jika model hilang?', 'Buka Pengaturan, temukan model lagi, pilih model yang tersedia, lalu jalankan ulang uji kapabilitas. Contoh bertanggal adalah panduan, bukan jaminan ketersediaan.'],
    ]).map(([question, answer]) => <div key={question} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800"><h3 className="font-bold text-slate-800 dark:text-slate-200">{question}</h3><p className="mt-1 text-xs">{answer}</p></div>)}
  </Section></div>;
}

function GuideNav({ c, visible, active, search, onSearch, onSelect }: {
  c: (typeof copy)[Locale]; visible: ArticleId[]; active: ArticleId; search: string;
  onSearch: (value: string) => void; onSelect: (id: ArticleId) => void;
}) {
  return <><div className="relative"><Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" /><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder={c.search} className="w-full rounded border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs dark:border-slate-800 dark:bg-slate-950" /></div><nav className="mt-4 space-y-1">{visible.map((id) => { const Icon = icons[id]; return <button key={id} onClick={() => onSelect(id)} aria-current={active === id ? 'page' : undefined} className={`flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs font-semibold ${active === id ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}><Icon className="h-4 w-4" />{c.nav[id]}</button>; })}</nav></>;
}

export function GuideContent({ locale }: { locale: Locale }) {
  const c = copy[locale];
  const [active, setActive] = useState<ArticleId>('start');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const visible = useMemo(() => articleIds.filter((id) => c.nav[id].toLowerCase().includes(search.toLowerCase())), [c.nav, search]);
  const selectArticle = (id: ArticleId) => { setActive(id); setOpen(false); };
  const ActiveIcon = icons[active];
  return <div className="flex h-full overflow-hidden bg-slate-50 dark:bg-slate-950">
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:block"><div className="mb-4 flex items-center gap-2"><BookOpen className="h-5 w-5 text-indigo-600" /><h1 className="font-bold text-slate-900 dark:text-white">{c.title}</h1></div><GuideNav c={c} visible={visible} active={active} search={search} onSearch={setSearch} onSelect={selectArticle} /><p className="mt-6 flex items-center gap-1 text-[10px] text-slate-400"><CheckCircle2 className="h-3 w-3" />{c.reviewed}</p></aside>
    {open && <div className="absolute inset-0 z-30 bg-slate-900/40 md:hidden" onClick={() => setOpen(false)}><aside className="h-full w-72 bg-white p-4 dark:bg-slate-900" onClick={(event) => event.stopPropagation()}><div className="mb-4 flex items-center justify-between"><h1 className="font-bold">{c.title}</h1><button onClick={() => setOpen(false)} aria-label="Close guide menu"><X className="h-5 w-5" /></button></div><GuideNav c={c} visible={visible} active={active} search={search} onSearch={setSearch} onSelect={selectArticle} /></aside></div>}
    <main className="min-w-0 flex-1 overflow-y-auto"><div className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 md:hidden"><button onClick={() => setOpen(true)} aria-label="Open guide menu"><Menu className="h-5 w-5" /></button><span className="text-sm font-bold">{c.nav[active]}</span></div><article className="mx-auto max-w-3xl px-5 py-8 md:px-10 md:py-12"><header className="mb-8 border-b border-slate-200 pb-5 dark:border-slate-800"><ActiveIcon className="mb-3 h-7 w-7 text-indigo-600" /><h1 className="text-2xl font-bold text-slate-950 dark:text-white">{c.nav[active]}</h1><p className="mt-2 flex items-center gap-1 text-xs text-slate-400"><FileText className="h-3 w-3" />OcularOCR 0.22 guide</p></header><Article id={active} locale={locale} /></article></main>
  </div>;
}
