'use client';

import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { BookOpen, CheckCircle2, Cloud, Download, ExternalLink, FileText, Files, HelpCircle, KeyRound, Menu, ScanText, Search, ShieldCheck, Sparkles, Table2, Terminal, WifiOff, X } from 'lucide-react';
import { PROVIDERS } from '@/lib/providers';

type Locale = 'en' | 'id';
type ArticleId = 'start' | 'documents' | 'ocr' | 'structure' | 'export' | 'offline' | 'automation' | 'providers' | 'ollama' | 'recovery' | 'faq';

const copy = {
  en: {
    title: 'OcularOCR Guide', search: 'Search the guide…', reviewed: 'Provider guidance reviewed 14 July 2026',
    nav: { start: 'Start & vault', documents: 'Manage documents', ocr: 'OCR choices', structure: 'Structure & correction', export: 'Export formats', offline: 'Offline & PWA', automation: 'Tags, summaries & AI', providers: 'AI providers', ollama: 'Local Ollama setup', recovery: 'Backup & recovery', faq: 'FAQ & troubleshooting' },
  },
  id: {
    title: 'Panduan OcularOCR', search: 'Cari panduan…', reviewed: 'Panduan provider ditinjau 14 Juli 2026',
    nav: { start: 'Mulai & vault', documents: 'Kelola dokumen', ocr: 'Pilihan OCR', structure: 'Struktur & koreksi', export: 'Format ekspor', offline: 'Offline & PWA', automation: 'Tag, ringkasan & AI', providers: 'Provider AI', ollama: 'Pengaturan Ollama lokal', recovery: 'Cadangan & pemulihan', faq: 'FAQ & pemecahan masalah' },
  },
} as const;

const icons = { start: KeyRound, documents: Files, ocr: ScanText, structure: Table2, export: Download, offline: WifiOff, automation: Sparkles, providers: Cloud, ollama: Terminal, recovery: ShieldCheck, faq: HelpCircle };
const articleIds = Object.keys(icons) as ArticleId[];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="space-y-3"><h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2><div className="space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{children}</div></section>;
}

function Steps({ items }: { items: string[] }) {
  return <ol className="space-y-2">{items.map((item, index) => <li key={item} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">{index + 1}</span><span>{item}</span></li>)}</ol>;
}

function Command({ children }: { children: string }) {
  return <pre className="overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100"><code>{children}</code></pre>;
}

function Article({ id, locale }: { id: ArticleId; locale: Locale }) {
  const en = locale === 'en';
  if (id === 'start') return <div className="space-y-8">
    <Section title={en ? 'Choose a vault mode' : 'Pilih mode vault'}>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-900 dark:bg-indigo-950/20"><h3 className="font-bold text-indigo-800 dark:text-indigo-300">{en ? 'Encrypted (recommended)' : 'Terenkripsi (direkomendasikan)'}</h3><p className="mt-1 text-xs">{en ? 'A password derives the key that protects documents and settings. Use this for personal, confidential, or irreplaceable material.' : 'Kata sandi menghasilkan kunci yang melindungi dokumen dan pengaturan. Gunakan untuk materi pribadi, rahasia, atau yang tidak tergantikan.'}</p></div>
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/20"><h3 className="font-bold text-amber-800 dark:text-amber-300">{en ? 'No password' : 'Tanpa kata sandi'}</h3><p className="mt-1 text-xs">{en ? 'Opens automatically and offers no meaningful protection from someone with access to the browser profile. Never store sensitive documents or API keys here.' : 'Terbuka otomatis dan tidak memberi perlindungan berarti dari orang yang dapat mengakses profil peramban. Jangan simpan dokumen sensitif atau API key di sini.'}</p></div>
      </div>
    </Section>
    <Section title={en ? 'Create and unlock an encrypted vault' : 'Buat dan buka vault terenkripsi'}>
      <p>{en ? 'Your password derives the encryption key in this browser. OcularOCR does not store the password and cannot recover it.' : 'Kata sandi menghasilkan kunci enkripsi di peramban ini. OcularOCR tidak menyimpan kata sandi dan tidak dapat memulihkannya.'}</p>
      <Steps items={en ? ['Create and confirm a strong, unique password of at least 12 characters, then save it in a password manager.', 'Add PDFs or images. Files and metadata are encrypted before browser storage.', 'Optionally link a supported passkey for faster unlock on this device.', 'Export an encrypted backup before storing irreplaceable documents.'] : ['Buat dan konfirmasi kata sandi unik yang kuat, minimal 12 karakter, lalu simpan di password manager.', 'Tambahkan PDF atau gambar. File dan metadata dienkripsi sebelum penyimpanan peramban.', 'Jika didukung, tautkan passkey untuk membuka lebih cepat di perangkat ini.', 'Ekspor cadangan terenkripsi sebelum menyimpan dokumen yang tidak tergantikan.']} />
    </Section>
    <Section title={en ? 'First-session checklist' : 'Daftar periksa sesi pertama'}><Steps items={en ? ['Choose the interface language, theme, and automatic-lock timeout in Settings.', 'Prepare offline OCR and download every language pack you will need.', 'If using AI, configure one provider and run its capability test with synthetic data.', 'Import a disposable sample, run OCR, correct it, and test your preferred export.', 'Create a backup and confirm where the downloaded file is stored.'] : ['Pilih bahasa antarmuka, tema, dan waktu kunci otomatis di Pengaturan.', 'Siapkan OCR offline dan unduh setiap paket bahasa yang diperlukan.', 'Jika memakai AI, konfigurasikan satu provider dan jalankan uji kapabilitas dengan data sintetis.', 'Impor sampel yang tidak penting, jalankan OCR, koreksi, lalu uji ekspor pilihan Anda.', 'Buat cadangan dan pastikan lokasi file unduhan.']} /></Section>
    <Section title={en ? 'Daily workflow' : 'Alur kerja harian'}><p>{en ? 'Import or open a document, choose local or AI OCR, review confidence and page order, correct text and tables, then export the format you need. Lock the encrypted vault when finished, especially on a shared device.' : 'Impor atau buka dokumen, pilih OCR lokal atau AI, periksa confidence dan urutan halaman, koreksi teks serta tabel, lalu ekspor format yang dibutuhkan. Kunci vault terenkripsi setelah selesai, terutama pada perangkat bersama.'}</p></Section>
  </div>;

  if (id === 'documents') return <div className="space-y-8">
    <Section title={en ? 'Import safely' : 'Impor dengan aman'}>
      <Steps items={en ? ['Select Add Document and choose a PDF, PNG, JPEG, or WebP file. Local imports are admitted according to available browser storage.', 'Review the filename and preview before running OCR. Files of 100 MB or more show a memory warning but are not rejected when storage is sufficient.', 'For URL import, use a public HTTPS file URL; remote imports retain a 25 MB safety limit and private-network addresses are blocked.', 'Wait for storage to finish before closing the tab or locking the vault.'] : ['Pilih Tambah Dokumen dan pilih file PDF, PNG, JPEG, atau WebP. Impor lokal diterima berdasarkan ruang penyimpanan peramban yang tersedia.', 'Periksa nama file dan pratinjau sebelum menjalankan OCR. File 100 MB atau lebih menampilkan peringatan memori tetapi tidak ditolak jika ruang mencukupi.', 'Untuk impor URL, gunakan URL file HTTPS publik; impor remote tetap memiliki batas keamanan 25 MB dan alamat jaringan privat diblokir.', 'Tunggu penyimpanan selesai sebelum menutup tab atau mengunci vault.']} />
      <p className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300">{en ? 'A file remains local only when it is imported from your device. URL import downloads the source over the network, and the source server can observe that request.' : 'File tetap lokal hanya saat diimpor dari perangkat. Impor URL mengunduh sumber melalui jaringan, dan server sumber dapat melihat permintaan tersebut.'}</p>
    </Section>
    <Section title={en ? 'Find and organize documents' : 'Temukan dan atur dokumen'}>
      <p>{en ? 'Search matches document names and available extracted text. Use categories and tags for repeatable filing, then filter the dashboard instead of relying on long filenames.' : 'Pencarian mencocokkan nama dokumen dan teks hasil ekstraksi yang tersedia. Gunakan kategori dan tag untuk pengarsipan konsisten, lalu filter dashboard daripada mengandalkan nama file panjang.'}</p>
      <Steps items={en ? ['Rename the document to a stable human-readable title.', 'Add or correct tags after OCR so they reflect the actual content.', 'Use local automatic tagging for privacy-sensitive work, or AI tagging only after reviewing the provider boundary.', 'Delete obsolete documents carefully; deletion removes the local record and cannot be undone without a backup.'] : ['Ubah nama dokumen menjadi judul yang stabil dan mudah dibaca.', 'Tambah atau koreksi tag setelah OCR agar sesuai isi sebenarnya.', 'Gunakan tagging otomatis lokal untuk pekerjaan sensitif, atau tagging AI hanya setelah meninjau batas provider.', 'Hapus dokumen usang dengan hati-hati; penghapusan menghilangkan data lokal dan tidak dapat dibatalkan tanpa cadangan.']} />
    </Section>
    <Section title={en ? 'Use the PDF workspace' : 'Gunakan ruang kerja PDF'}>
      <p>{en ? 'The PDF workspace can merge documents, reorder, rotate, duplicate, delete, or extract pages. Saving creates a new encrypted PDF and leaves the source documents unchanged.' : 'Ruang kerja PDF dapat menggabungkan dokumen, mengubah urutan, memutar, menduplikasi, menghapus, atau mengekstrak halaman. Penyimpanan membuat PDF terenkripsi baru dan tidak mengubah dokumen sumber.'}</p>
      <p>{en ? 'Check the final page count and order before saving. Very large page plans can use substantial browser memory; split the operation if the device becomes slow.' : 'Periksa jumlah dan urutan halaman sebelum menyimpan. Rencana halaman yang sangat besar dapat memakai banyak memori peramban; bagi operasi jika perangkat melambat.'}</p>
    </Section>
  </div>;

  if (id === 'ocr') return <div className="space-y-8">
    <Section title={en ? 'Choose the right OCR path' : 'Pilih jalur OCR yang tepat'}>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900 dark:bg-emerald-950/20"><h3 className="font-bold text-emerald-800 dark:text-emerald-300">{en ? 'Local Tesseract' : 'Tesseract lokal'}</h3><p className="mt-1 text-xs">{en ? 'Runs in the browser and does not send document content to a provider. Best for clear printed text and offline work.' : 'Berjalan di peramban dan tidak mengirim isi dokumen ke provider. Cocok untuk teks cetak yang jelas dan penggunaan offline.'}</p></div>
        <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-900 dark:bg-indigo-950/20"><h3 className="font-bold text-indigo-800 dark:text-indigo-300">{en ? 'AI OCR' : 'OCR AI'}</h3><p className="mt-1 text-xs">{en ? 'Can improve handwriting and complex layouts. Remote endpoints receive selected page images; explicit cloud consent is required.' : 'Dapat membantu tulisan tangan dan tata letak kompleks. Endpoint remote menerima gambar halaman terpilih; persetujuan cloud wajib.'}</p></div>
      </div>
      <p>{en ? 'Preprocessing can rotate, deskew, increase contrast, denoise, grayscale, or binarize pages. Higher PDF render scale improves small text but uses more memory.' : 'Pra-pemrosesan dapat memutar, meluruskan, meningkatkan kontras, mengurangi noise, membuat skala abu-abu, atau biner. Skala render PDF yang lebih tinggi membantu teks kecil tetapi memakai lebih banyak memori.'}</p>
    </Section>
    <Section title={en ? 'Prepare offline OCR' : 'Siapkan OCR offline'}>
      <Steps items={en ? ['While online, open Settings → Offline & Storage.', 'Prepare offline use and wait for the readiness indicator.', 'Download the exact language packs used by the document; select multiple languages only when necessary.', 'Disconnect from the network and test a sample page before depending on offline OCR in the field.'] : ['Saat online, buka Pengaturan → Offline & Penyimpanan.', 'Siapkan penggunaan offline dan tunggu indikator kesiapan.', 'Unduh paket bahasa yang tepat untuk dokumen; pilih beberapa bahasa hanya bila diperlukan.', 'Putuskan jaringan dan uji halaman sampel sebelum mengandalkan OCR offline di lapangan.']} />
    </Section>
    <Section title={en ? 'Tune preprocessing and page scale' : 'Atur pra-pemrosesan dan skala halaman'}>
      <div className="grid gap-2 sm:grid-cols-2">{(en ? [['Rotation / deskew','Fix sideways pages and slightly tilted scans first.'],['Contrast / denoise','Useful for faint receipts or compression noise; too much can erase thin characters.'],['Grayscale / binarize','Can clarify simple print, but may damage colored annotations and stamps.'],['PDF render scale','Increase for tiny print; reduce when memory use or processing time is excessive.']] : [['Rotasi / pelurusan','Perbaiki halaman menyamping dan scan sedikit miring terlebih dahulu.'],['Kontras / denoise','Berguna untuk struk pudar atau noise kompresi; terlalu tinggi dapat menghapus karakter tipis.'],['Grayscale / biner','Dapat memperjelas cetakan sederhana, tetapi dapat merusak anotasi dan stempel berwarna.'],['Skala render PDF','Naikkan untuk teks kecil; turunkan saat penggunaan memori atau waktu proses berlebihan.']]).map(([name, description]) => <div key={name} className="rounded border border-slate-200 p-3 dark:border-slate-800"><h3 className="font-bold text-slate-800 dark:text-slate-200">{name}</h3><p className="text-xs">{description}</p></div>)}</div>
    </Section>
    <Section title={en ? 'Review results instead of trusting one score' : 'Periksa hasil, jangan hanya percaya satu skor'}>
      <p>{en ? 'Confidence is a clue, not proof. Zoom into low-confidence regions, but also verify names, account numbers, totals, dates, decimal separators, and characters such as O/0 or I/1 even when confidence is high.' : 'Confidence adalah petunjuk, bukan bukti. Perbesar area dengan confidence rendah, tetapi tetap verifikasi nama, nomor rekening, total, tanggal, pemisah desimal, dan karakter seperti O/0 atau I/1 meskipun confidence tinggi.'}</p>
      <p>{en ? 'Use region OCR when only one area is wrong. Compare engines for difficult pages, and keep the original OCR result until the corrected preview is acceptable.' : 'Gunakan OCR area jika hanya satu bagian yang salah. Bandingkan engine untuk halaman sulit, dan pertahankan hasil OCR asli sampai pratinjau koreksi dapat diterima.'}</p>
    </Section>
  </div>;

  if (id === 'structure') return <div className="space-y-8">
    <Section title={en ? 'Headings, lists, and tables' : 'Judul, daftar, dan tabel'}>
      <p>{en ? 'Structured OCR stores each page as editable blocks. Change a block between paragraph, heading, list, or table. Table cells support header flags and row/column spans.' : 'OCR terstruktur menyimpan setiap halaman sebagai blok yang dapat diedit. Ubah blok menjadi paragraf, judul, daftar, atau tabel. Sel tabel mendukung penanda header serta rentang baris/kolom.'}</p>
      <Steps items={en ? ['Run OCR and open the structure editor.', 'Review reading order and block types.', 'Edit text and table cells; add or remove rows and columns as needed.', 'Use correction preview to compare changes before accepting them.'] : ['Jalankan OCR dan buka editor struktur.', 'Periksa urutan baca dan jenis blok.', 'Edit teks dan sel tabel; tambah atau hapus baris dan kolom sesuai kebutuhan.', 'Gunakan pratinjau koreksi untuk membandingkan perubahan sebelum menerimanya.']} />
      <p className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300">{en ? 'AI cleanup sends extracted text—not necessarily page images—to the configured remote provider. Review every correction for names, numbers, and dates.' : 'Pembersihan AI mengirim teks hasil ekstraksi—tidak selalu gambar halaman—ke provider remote yang dikonfigurasi. Periksa setiap koreksi, terutama nama, angka, dan tanggal.'}</p>
    </Section>
    <Section title={en ? 'Repair tables deliberately' : 'Perbaiki tabel dengan teliti'}>
      <Steps items={en ? ['Confirm the header row and reading direction.', 'Correct each cell before changing row or column spans.', 'Add missing rows or columns, then remove empty artifacts.', 'Preview Markdown or CSV to catch alignment and escaping problems.', 'Compare totals and identifiers against the page image.'] : ['Pastikan baris header dan arah baca.', 'Koreksi setiap sel sebelum mengubah rentang baris atau kolom.', 'Tambahkan baris atau kolom yang hilang, lalu hapus artefak kosong.', 'Pratinjau Markdown atau CSV untuk menemukan masalah perataan dan escaping.', 'Bandingkan total serta pengenal dengan gambar halaman.']} />
      <p>{en ? 'Merged cells are preserved in rich formats, but flat formats must repeat or align values. Always inspect CSV output from tables with row or column spans.' : 'Sel gabungan dipertahankan dalam format kaya, tetapi format datar harus mengulang atau meratakan nilai. Selalu periksa output CSV dari tabel dengan rentang baris atau kolom.'}</p>
    </Section>
  </div>;

  if (id === 'export') return <div className="space-y-8"><Section title={en ? 'Export corrected results' : 'Ekspor hasil terkoreksi'}>
    <p>{en ? 'Exports use the current corrected structure, including edited tables.' : 'Ekspor menggunakan struktur terkoreksi saat ini, termasuk tabel yang telah diedit.'}</p>
    <div className="grid gap-2 sm:grid-cols-2">{(en ? [['Markdown','Headings, lists, and Markdown tables.'],['PDF','Reflowed PDF or searchable PDF with a text layer.'],['DOCX','Editable Word document with native tables.'],['CSV / JSON','Tables for spreadsheets or the full structured data model.']] : [['Markdown','Judul, daftar, dan tabel Markdown.'],['PDF','PDF reflow atau PDF searchable dengan lapisan teks.'],['DOCX','Dokumen Word yang dapat diedit dengan tabel native.'],['CSV / JSON','Tabel untuk spreadsheet atau model data terstruktur lengkap.']]).map(([name, description]) => <div key={name} className="rounded border border-slate-200 p-3 dark:border-slate-800"><h3 className="font-bold text-slate-800 dark:text-slate-200">{name}</h3><p className="text-xs">{description}</p></div>)}</div>
    <p>{en ? 'CSV exports tables only. Searchable PDF preserves the source page appearance and adds invisible selectable text; reflowed PDF rebuilds content from the corrected structure.' : 'CSV hanya mengekspor tabel. PDF searchable mempertahankan tampilan halaman sumber dan menambahkan teks tak terlihat yang dapat dipilih; PDF reflow membangun ulang isi dari struktur terkoreksi.'}</p>
    <Steps items={en ? ['Finish text and table corrections before exporting.', 'Choose searchable PDF when visual fidelity matters; choose reflowed PDF, DOCX, or Markdown when editable structure matters.', 'Open the downloaded file and inspect page order, headings, tables, non-Latin characters, and line wrapping.', 'Keep JSON when another system needs the complete versioned structure; use CSV only for extracted tables.'] : ['Selesaikan koreksi teks dan tabel sebelum mengekspor.', 'Pilih PDF searchable jika tampilan asli penting; pilih PDF reflow, DOCX, atau Markdown jika struktur yang dapat diedit lebih penting.', 'Buka file unduhan dan periksa urutan halaman, judul, tabel, karakter non-Latin, dan pembungkusan baris.', 'Simpan JSON jika sistem lain memerlukan struktur berversi lengkap; gunakan CSV hanya untuk tabel hasil ekstraksi.']} />
  </Section></div>;

  if (id === 'offline') return <div className="space-y-8">
    <Section title={en ? 'Install the PWA' : 'Instal PWA'}>
      <Steps items={en ? ['Open OcularOCR in a supported browser over HTTPS or localhost.', 'Use the browser install control or the in-app installation prompt.', 'Launch the installed app once while online so the current app shell can be cached.', 'In Settings → Offline & Storage, prepare offline assets and request persistent storage where supported.'] : ['Buka OcularOCR di peramban yang didukung melalui HTTPS atau localhost.', 'Gunakan kontrol instalasi peramban atau prompt instalasi dalam aplikasi.', 'Jalankan aplikasi terinstal sekali saat online agar app shell saat ini dapat disimpan.', 'Di Pengaturan → Offline & Penyimpanan, siapkan aset offline dan minta penyimpanan persisten jika didukung.']} />
    </Section>
    <Section title={en ? 'Know what works offline' : 'Ketahui fitur yang bekerja offline'}>
      <div className="grid gap-3 md:grid-cols-2"><div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900 dark:bg-emerald-950/20"><h3 className="font-bold text-emerald-800 dark:text-emerald-300">{en ? 'Available after preparation' : 'Tersedia setelah persiapan'}</h3><p className="mt-1 text-xs">{en ? 'Vault access, imported documents, PDF tools, downloaded Tesseract languages, local OCR, editing, and local exports.' : 'Akses vault, dokumen impor, alat PDF, bahasa Tesseract terunduh, OCR lokal, pengeditan, dan ekspor lokal.'}</p></div><div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900"><h3 className="font-bold text-slate-800 dark:text-slate-200">{en ? 'Still needs connectivity' : 'Tetap memerlukan koneksi'}</h3><p className="mt-1 text-xs">{en ? 'Cloud AI, first-time language downloads, URL import, app updates, and any provider not running on this device.' : 'AI cloud, unduhan bahasa pertama, impor URL, pembaruan aplikasi, dan provider apa pun yang tidak berjalan di perangkat ini.'}</p></div></div>
    </Section>
    <Section title={en ? 'Update without losing offline languages' : 'Perbarui tanpa kehilangan bahasa offline'}>
      <p>{en ? 'When an update banner appears, finish active work and export a backup before refreshing. The service worker replaces the app shell while preserving separately downloaded OCR language packs. Reopen Offline & Storage afterward to confirm readiness.' : 'Saat banner pembaruan muncul, selesaikan pekerjaan aktif dan ekspor cadangan sebelum refresh. Service worker mengganti app shell sambil mempertahankan paket bahasa OCR yang diunduh terpisah. Buka kembali Offline & Penyimpanan setelahnya untuk memastikan kesiapan.'}</p>
      <p>{en ? 'Browser cleanup, private mode, profile removal, or storage pressure can still remove local data. Installation alone is not a backup.' : 'Pembersihan peramban, mode privat, penghapusan profil, atau tekanan penyimpanan tetap dapat menghapus data lokal. Instalasi saja bukan cadangan.'}</p>
    </Section>
  </div>;

  if (id === 'automation') return <div className="space-y-8">
    <Section title={en ? 'Choose local or AI-assisted organization' : 'Pilih pengaturan lokal atau berbantuan AI'}>
      <p>{en ? 'Local tagging uses filename and extracted-text rules without sending content away. AI tagging can interpret context better, but sends the text required for classification to the configured endpoint.' : 'Tagging lokal memakai aturan nama file dan teks hasil ekstraksi tanpa mengirim isi keluar. Tagging AI dapat memahami konteks lebih baik, tetapi mengirim teks yang diperlukan untuk klasifikasi ke endpoint terkonfigurasi.'}</p>
      <Steps items={en ? ['Run OCR and correct obvious recognition errors first.', 'Choose local tags for predictable private classification or AI tags for contextual suggestions.', 'Review every suggested category and remove misleading tags.', 'Keep tag names consistent so dashboard filters remain useful.'] : ['Jalankan OCR dan koreksi kesalahan pengenalan yang jelas terlebih dahulu.', 'Pilih tag lokal untuk klasifikasi privat yang dapat diprediksi atau tag AI untuk saran kontekstual.', 'Periksa setiap kategori yang disarankan dan hapus tag yang menyesatkan.', 'Jaga konsistensi nama tag agar filter dashboard tetap berguna.']} />
    </Section>
    <Section title={en ? 'Summaries, cleanup, and translation' : 'Ringkasan, pembersihan, dan terjemahan'}>
      <p>{en ? 'These tools use the currently configured AI provider. A summary may omit details; cleanup can alter names or numbers; translation can change legal or technical meaning. Treat every output as a draft and compare it with the source.' : 'Alat ini memakai provider AI yang sedang dikonfigurasi. Ringkasan dapat menghilangkan detail; pembersihan dapat mengubah nama atau angka; terjemahan dapat mengubah makna hukum atau teknis. Perlakukan setiap output sebagai draf dan bandingkan dengan sumber.'}</p>
      <p className="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300">{en ? 'Cloud consent is per privacy boundary, not a guarantee of provider retention or training policy. Review the provider’s current terms before sending confidential content.' : 'Persetujuan cloud adalah batas privasi, bukan jaminan kebijakan retensi atau pelatihan provider. Tinjau ketentuan provider terbaru sebelum mengirim isi rahasia.'}</p>
    </Section>
    <Section title={en ? 'Custom prompts' : 'Prompt khusus'}>
      <p>{en ? 'Use short, specific instructions and state the required output. Test prompt changes on non-sensitive samples because a prompt that improves one document type may damage another. Capability checks verify transport and format support, not factual accuracy.' : 'Gunakan instruksi singkat dan spesifik serta nyatakan output yang dibutuhkan. Uji perubahan prompt pada sampel tidak sensitif karena prompt yang memperbaiki satu jenis dokumen dapat merusak jenis lain. Uji kapabilitas memverifikasi koneksi dan dukungan format, bukan akurasi fakta.'}</p>
    </Section>
  </div>;

  if (id === 'providers') return <div className="space-y-8"><Section title={en ? 'Set up and verify a provider' : 'Siapkan dan verifikasi provider'}>
    <Steps items={en ? ['Open Settings → AI Processing.', 'Choose Gemini, OpenAI-compatible, or local Ollama.', 'Enter a model ID and, where required, an API key and endpoint.', 'Select Test setup. OcularOCR discovers available models and sends tiny synthetic checks for text, image input, and structured JSON.', 'Enable cloud consent only if you accept the selected remote provider receiving content for the task.'] : ['Buka Pengaturan → Pemrosesan AI.', 'Pilih Gemini, OpenAI-compatible, atau Ollama lokal.', 'Masukkan ID model dan, bila diperlukan, API key serta endpoint.', 'Pilih Uji konfigurasi. OcularOCR menemukan model yang tersedia dan mengirim pengujian sintetis kecil untuk teks, input gambar, dan JSON terstruktur.', 'Aktifkan persetujuan cloud hanya jika Anda menerima provider remote terpilih menerima isi untuk tugas tersebut.']} />
    <div className="space-y-2">{PROVIDERS.map((provider) => <div key={provider.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold text-slate-800 dark:text-slate-200">{provider.name}</h3><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500 dark:bg-slate-800">{provider.kind}</span></div><p className="mt-1 text-xs">{provider.summary}</p><p className="mt-2 text-xs"><span className="font-semibold">{en ? 'Dated example' : 'Contoh bertanggal'}:</span> <code>{provider.modelExample}</code> · <a href={provider.modelsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-indigo-600 hover:underline dark:text-indigo-400">{en ? 'official models' : 'model resmi'} <ExternalLink className="h-3 w-3" /></a></p></div>)}</div>
    <p className="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300">{en ? 'API keys are encrypted at rest inside the vault. To call a provider, the browser decrypts the key in memory and sends it directly to that endpoint. OcularOCR does not hide it behind an AI proxy.' : 'API key dienkripsi saat tersimpan di vault. Untuk memanggil provider, peramban mendekripsi kunci di memori dan mengirimkannya langsung ke endpoint tersebut. OcularOCR tidak menyembunyikannya di balik proxy AI.'}</p>
    <h3 className="font-bold text-slate-800 dark:text-slate-200">{en ? 'Understand the capability test' : 'Pahami uji kapabilitas'}</h3>
    <p>{en ? 'Model discovery checks what the endpoint currently exposes. The synthetic tests separately check text, image input, and structured JSON. A model may pass text but fail OCR because it lacks vision, or return text while ignoring the requested JSON schema.' : 'Penemuan model memeriksa apa yang tersedia di endpoint saat ini. Uji sintetis memeriksa teks, input gambar, dan JSON terstruktur secara terpisah. Model dapat lulus teks tetapi gagal OCR karena tidak memiliki vision, atau menghasilkan teks sambil mengabaikan skema JSON.'}</p>
    <p>{en ? 'Re-test after changing provider, endpoint, API key, model, or server version. A successful test does not guarantee availability, pricing, retention policy, or accurate document extraction.' : 'Uji ulang setelah mengganti provider, endpoint, API key, model, atau versi server. Uji berhasil tidak menjamin ketersediaan, harga, kebijakan retensi, atau ekstraksi dokumen yang akurat.'}</p>
  </Section></div>;

  if (id === 'ollama') return <div className="space-y-8">
    <Section title={en ? 'Run private AI with Ollama' : 'Jalankan AI privat dengan Ollama'}>
      <p>{en ? 'Ollama runs the model on your computer. OcularOCR sends requests directly from this browser to the local Ollama API, so no cloud API key is required.' : 'Ollama menjalankan model di komputer Anda. OcularOCR mengirim permintaan langsung dari peramban ini ke API Ollama lokal, sehingga API key cloud tidak diperlukan.'}</p>
      <Steps items={en ? ['Install Ollama for macOS, Windows, or Linux from the official download page.', 'Start Ollama, then download a vision-capable model such as Gemma 3.', 'Configure OcularOCR with the local endpoint and exact installed model name.', 'Run Test setup before processing a document.'] : ['Instal Ollama untuk macOS, Windows, atau Linux dari halaman unduhan resmi.', 'Jalankan Ollama, lalu unduh model yang mendukung vision seperti Gemma 3.', 'Konfigurasikan OcularOCR dengan endpoint lokal dan nama model terinstal yang tepat.', 'Jalankan Uji konfigurasi sebelum memproses dokumen.']} />
      <p><a href="https://ollama.com/download" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline dark:text-indigo-400">{en ? 'Download Ollama' : 'Unduh Ollama'} <ExternalLink className="h-3 w-3" /></a></p>
    </Section>
    <Section title={en ? 'Start and download a vision model' : 'Jalankan dan unduh model vision'}>
      <p>{en ? 'The desktop app normally starts the local service automatically. For a manual or Linux setup, start it from a terminal:' : 'Aplikasi desktop biasanya menjalankan layanan lokal secara otomatis. Untuk pengaturan manual atau Linux, jalankan dari terminal:'}</p>
      <Command>ollama serve</Command>
      <p>{en ? 'In another terminal, download and verify a vision model:' : 'Di terminal lain, unduh dan verifikasi model vision:'}</p>
      <Command>{`ollama pull gemma3\nollama run gemma3`}</Command>
      <p className="text-xs">{en ? 'Models can require several gigabytes of disk and memory. Choose a smaller vision model if the computer becomes slow.' : 'Model dapat memerlukan beberapa gigabita ruang disk dan memori. Pilih model vision yang lebih kecil jika komputer menjadi lambat.'}</p>
    </Section>
    <Section title={en ? 'Connect OcularOCR' : 'Hubungkan OcularOCR'}>
      <Steps items={en ? ['Open Settings → AI Processing and choose Ollama.', 'Use http://localhost:11434/v1/chat/completions as the endpoint.', 'Enter gemma3, or the exact name shown by ollama ls. Leave the API key blank.', 'Select Test setup and confirm text, image, and structured-output checks.'] : ['Buka Pengaturan → Pemrosesan AI dan pilih Ollama.', 'Gunakan http://localhost:11434/v1/chat/completions sebagai endpoint.', 'Masukkan gemma3, atau nama persis yang ditampilkan oleh ollama ls. Kosongkan API key.', 'Pilih Uji konfigurasi dan pastikan pengujian teks, gambar, serta output terstruktur berhasil.']} />
      <Command>http://localhost:11434/v1/chat/completions</Command>
    </Section>
    <Section title={en ? 'Fix browser access or CORS errors' : 'Atasi kesalahan akses peramban atau CORS'}>
      <p>{en ? 'Ollama permits common loopback origins by default. If OcularOCR is served from another origin and the browser blocks it, add only that exact app origin to OLLAMA_ORIGINS, restart Ollama, and test again. Avoid a wildcard on machines that handle sensitive documents.' : 'Ollama mengizinkan origin loopback umum secara default. Jika OcularOCR disajikan dari origin lain dan diblokir peramban, tambahkan hanya origin aplikasi tersebut ke OLLAMA_ORIGINS, mulai ulang Ollama, lalu uji kembali. Hindari wildcard pada komputer yang menangani dokumen sensitif.'}</p>
      <p><a href="https://docs.ollama.com/faq#how-can-i-allow-additional-web-origins-to-access-ollama" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline dark:text-indigo-400">{en ? 'Official origin and environment-variable instructions' : 'Petunjuk resmi origin dan environment variable'} <ExternalLink className="h-3 w-3" /></a></p>
      <p className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300">{en ? 'Ollama is local, but prompts and page images are still visible to the local Ollama process and model. Keep Ollama bound to loopback unless you intentionally secure network access.' : 'Ollama bersifat lokal, tetapi prompt dan gambar halaman tetap terlihat oleh proses serta model Ollama lokal. Biarkan Ollama terikat ke loopback kecuali Anda sengaja mengamankan akses jaringan.'}</p>
    </Section>
  </div>;

  if (id === 'recovery') return <div className="space-y-8"><Section title={en ? 'Protect and recover local data' : 'Lindungi dan pulihkan data lokal'}>
    <Steps items={en ? ['Open Settings → Offline & Storage and request persistent storage where supported.', 'Export an encrypted vault backup regularly and keep it outside the browser profile.', 'To restore, choose Import backup. Existing local vault data is replaced only after confirmation.', 'Keep the original vault passphrase. The encrypted backup cannot reset or bypass it.'] : ['Buka Pengaturan → Offline & Penyimpanan dan minta penyimpanan persisten jika didukung.', 'Ekspor cadangan vault terenkripsi secara rutin dan simpan di luar profil peramban.', 'Untuk memulihkan, pilih Impor cadangan. Data vault lokal diganti hanya setelah konfirmasi.', 'Simpan frasa sandi vault asli. Cadangan terenkripsi tidak dapat mereset atau melewatinya.']} />
    <p>{en ? 'Browser data clearing, private browsing, profile removal, storage pressure, or a device failure can remove the local vault. OcularOCR has no server copy.' : 'Penghapusan data peramban, mode privat, penghapusan profil, tekanan penyimpanan, atau kerusakan perangkat dapat menghapus vault lokal. OcularOCR tidak memiliki salinan server.'}</p>
    <h3 className="font-bold text-slate-800 dark:text-slate-200">{en ? 'Practice a restore' : 'Latih proses pemulihan'}</h3>
    <Steps items={en ? ['Create a fresh backup after important changes.', 'Use a separate browser profile or test device so the working vault is not replaced.', 'Import the backup and unlock it with the original password.', 'Open several documents, inspect OCR and settings, then test one export.', 'Delete the temporary profile when verification is complete.'] : ['Buat cadangan baru setelah perubahan penting.', 'Gunakan profil peramban atau perangkat uji terpisah agar vault kerja tidak diganti.', 'Impor cadangan dan buka dengan kata sandi asli.', 'Buka beberapa dokumen, periksa OCR dan pengaturan, lalu uji satu ekspor.', 'Hapus profil sementara setelah verifikasi selesai.']} />
    <p className="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300">{en ? 'Import replaces the current local vault after confirmation. Never test a restore over the only copy of your data.' : 'Impor mengganti vault lokal saat ini setelah konfirmasi. Jangan pernah menguji pemulihan di atas satu-satunya salinan data.'}</p>
  </Section></div>;

  return <div className="space-y-6"><Section title={en ? 'Privacy boundaries' : 'Batas privasi'}>
    {(en ? [
      ['Does local OCR use the network?', 'The OCR operation itself stays in the browser. A first-time language-pack download or app update still needs a network connection.'],
      ['What leaves my device?', 'Nothing for local Tesseract. AI OCR sends selected page images. AI correction, summaries, and AI tags send extracted text to the configured endpoint.'],
      ['Are API keys visible to the app?', 'Yes while needed for a direct browser request. They are encrypted at rest, but a compromised browser session or malicious extension could access unlocked data.'],
      ['What if a model disappears?', 'Open Settings, discover models again, choose an available model, and rerun the capability test. Dated examples are guidance, not availability guarantees.'],
      ['Why is OCR slow or the tab reloading?', 'Reduce PDF render scale, process fewer pages, close other heavy tabs, and avoid unnecessary multiple languages. Mobile and low-memory devices intentionally use fewer OCR workers.'],
      ['Why is an export missing table alignment?', 'Correct header cells and spans in the structure editor first. Use DOCX or reflowed PDF for rich tables; CSV is flat and cannot represent every merged-cell layout.'],
      ['Why can’t I reach Ollama?', 'Confirm Ollama is running, the model appears in ollama ls, the endpoint uses localhost:11434, and the app origin is allowed by Ollama. Then rerun Test setup.'],
      ['Can OcularOCR recover my password?', 'No. Restore requires the original encrypted-vault password. Keep it in a password manager and maintain tested backups.'],
    ] : [
      ['Apakah OCR lokal memakai jaringan?', 'Operasi OCR tetap di peramban. Unduhan pertama paket bahasa atau pembaruan aplikasi tetap membutuhkan koneksi jaringan.'],
      ['Apa yang keluar dari perangkat?', 'Tidak ada untuk Tesseract lokal. OCR AI mengirim gambar halaman terpilih. Koreksi AI, ringkasan, dan tag AI mengirim teks hasil ekstraksi ke endpoint yang dikonfigurasi.'],
      ['Apakah API key terlihat oleh aplikasi?', 'Ya, saat diperlukan untuk permintaan langsung dari peramban. Kunci dienkripsi saat tersimpan, tetapi sesi peramban yang disusupi atau ekstensi berbahaya dapat mengakses data yang sedang terbuka.'],
      ['Bagaimana jika model hilang?', 'Buka Pengaturan, temukan model lagi, pilih model yang tersedia, lalu jalankan ulang uji kapabilitas. Contoh bertanggal adalah panduan, bukan jaminan ketersediaan.'],
      ['Mengapa OCR lambat atau tab dimuat ulang?', 'Kurangi skala render PDF, proses lebih sedikit halaman, tutup tab berat lain, dan hindari banyak bahasa yang tidak perlu. Perangkat seluler dan memori rendah sengaja memakai lebih sedikit worker OCR.'],
      ['Mengapa perataan tabel hilang saat ekspor?', 'Koreksi sel header dan rentang di editor struktur terlebih dahulu. Gunakan DOCX atau PDF reflow untuk tabel kaya; CSV bersifat datar dan tidak dapat mewakili semua tata letak sel gabungan.'],
      ['Mengapa Ollama tidak dapat diakses?', 'Pastikan Ollama berjalan, model muncul di ollama ls, endpoint memakai localhost:11434, dan origin aplikasi diizinkan Ollama. Lalu jalankan kembali Uji konfigurasi.'],
      ['Bisakah OcularOCR memulihkan kata sandi?', 'Tidak. Pemulihan memerlukan kata sandi vault terenkripsi asli. Simpan di password manager dan pertahankan cadangan yang telah diuji.'],
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
  const mainRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const visible = useMemo(() => articleIds.filter((id) => c.nav[id].toLowerCase().includes(search.toLowerCase())), [c.nav, search]);
  const selectArticle = (id: ArticleId) => {
    setActive(id);
    setOpen(false);
    requestAnimationFrame(() => mainRef.current?.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));
  };
  const ActiveIcon = icons[active];
  const pageTransition = reduceMotion ? { duration: 0 } : { duration: 0.16, ease: 'easeOut' as const };
  return <motion.div initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={pageTransition} className="flex h-full overflow-hidden bg-slate-50 dark:bg-slate-950">
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:block"><div className="mb-4 flex items-center gap-2"><BookOpen className="h-5 w-5 text-indigo-600" /><h1 className="font-bold text-slate-900 dark:text-white">{c.title}</h1></div><GuideNav c={c} visible={visible} active={active} search={search} onSearch={setSearch} onSelect={selectArticle} /><p className="mt-6 flex items-center gap-1 text-[10px] text-slate-400"><CheckCircle2 className="h-3 w-3" />{c.reviewed}</p></aside>
    <AnimatePresence>
      {open && <motion.div initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30 bg-slate-900/40 backdrop-blur-sm md:hidden" onClick={() => setOpen(false)}><motion.aside initial={reduceMotion ? false : { x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={reduceMotion ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 220 }} className="h-full w-72 bg-white p-4 shadow-xl dark:bg-slate-900" onClick={(event) => event.stopPropagation()}><div className="mb-4 flex items-center justify-between"><h1 className="font-bold">{c.title}</h1><button onClick={() => setOpen(false)} aria-label="Close guide menu"><X className="h-5 w-5" /></button></div><GuideNav c={c} visible={visible} active={active} search={search} onSearch={setSearch} onSelect={selectArticle} /></motion.aside></motion.div>}
    </AnimatePresence>
    <main ref={mainRef} className="min-w-0 flex-1 overflow-y-auto"><div className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 md:hidden"><button onClick={() => setOpen(true)} aria-label="Open guide menu"><Menu className="h-5 w-5" /></button><span className="text-sm font-bold">{c.nav[active]}</span></div><AnimatePresence mode="wait" initial={false}><motion.article key={active} initial={reduceMotion ? false : { opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={reduceMotion ? undefined : { opacity: 0, x: -12 }} transition={pageTransition} className="mx-auto max-w-3xl px-5 py-8 md:px-10 md:py-12"><header className="mb-8 border-b border-slate-200 pb-5 dark:border-slate-800"><ActiveIcon className="mb-3 h-7 w-7 text-indigo-600" /><h1 className="text-2xl font-bold text-slate-950 dark:text-white">{c.nav[active]}</h1><p className="mt-2 flex items-center gap-1 text-xs text-slate-400"><FileText className="h-3 w-3" />OcularOCR 1.0 guide</p></header><Article id={active} locale={locale} /></motion.article></AnimatePresence></main>
  </motion.div>;
}
