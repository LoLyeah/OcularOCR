'use client';

import React, { createContext, useContext, useSyncExternalStore, useEffect } from 'react';

export type Language = 'en' | 'id';

interface Translations {
  [key: string]: {
    en: string;
    id: string;
  };
}

export const translationDict: Translations = {
  // App & Common
  appName: { en: 'OcularOCR', id: 'OcularOCR' },
  files: { en: 'Files', id: 'Berkas' },
  settings: { en: 'Settings', id: 'Pengaturan' },
  guide: { en: 'Guide', id: 'Panduan' },
  localEncrypted: { en: 'LOCAL ENCRYPTED', id: 'LOCAL ENCRYPTED' },
  lockVault: { en: 'Lock Vault', id: 'Kunci Vault' },
  saveSettings: { en: 'Save Settings', id: 'Simpan Pengaturan' },
  cancel: { en: 'Cancel', id: 'Batal' },
  close: { en: 'Close', id: 'Tutup' },
  loading: { en: 'Loading...', id: 'Memuat...' },
  success: { en: 'Success', id: 'Sukses' },
  error: { en: 'Error', id: 'Kesalahan' },
  info: { en: 'Info', id: 'Info' },
  updating: { en: 'Updating...', id: 'Memperbarui...' },
  yes: { en: 'Yes', id: 'Ya' },
  no: { en: 'No', id: 'Tidak' },

  // Vault Setup
  initializingVault: { en: 'Initializing Vault...', id: 'Menginisialisasi Vault...' },
  vaultInitFailed: { en: 'Vault Initialization Failed', id: 'Inisialisasi Vault Gagal' },
  checkingVault: { en: 'Checking Vault...', id: 'Memeriksa Vault...' },
  resetVaultWipeData: { en: 'Reset Vault & Wipe Data', id: 'Reset Vault & Hapus Data' },
  areYouSureWipe: { 
    en: 'Are you sure? This will permanently delete all your encrypted documents, settings, and the encryption key. This action cannot be undone.', 
    id: 'Apakah Anda yakin? Tindakan ini akan menghapus semua dokumen terenkripsi, pengaturan, dan kunci enkripsi Anda secara permanen. Tindakan ini tidak dapat dibatalkan.' 
  },
  yesWipeAllData: { en: 'YES, WIPE ALL DATA', id: 'YA, HAPUS SEMUA DATA' },
  welcomeToOcular: { en: 'Welcome to OcularOCR', id: 'Selamat Datang di OcularOCR' },
  chooseSecureVault: { 
    en: 'Choose how you want to secure your local document vault. This determines how your data will be encrypted on this device.', 
    id: 'Pilih bagaimana Anda ingin mengamankan vault dokumen lokal Anda. Ini menentukan bagaimana data Anda akan dienkripsi pada perangkat ini.' 
  },
  encryptedVaultRecommended: { en: 'Encrypted Vault (Recommended)', id: 'Encrypted Vault (Direkomendasikan)' },
  secureAllDocsPass: { 
    en: 'Secure all documents and AI settings with a password. Requires password on every visit.', 
    id: 'Amankan semua dokumen dan pengaturan AI dengan kata sandi. Memerlukan kata sandi pada setiap kunjungan.' 
  },
  openVault: { en: 'Open Vault', id: 'Open Vault' },
  dataStoredLocallyNoPass: { 
    en: 'Data is still stored locally, but automatically unlocked without a password.', 
    id: 'Data tetap disimpan secara lokal, tetapi dibuka secara otomatis tanpa kata sandi.' 
  },
  failedSetupUnencrypted: { en: 'Failed to setup unencrypted vault.', id: 'Gagal menyiapkan vault tanpa enkripsi.' },
  biometricUnlock: { en: 'Biometric Unlock', id: 'Biometric Unlock' },
  vaultSecuredPasskey: { 
    en: 'Your vault is secured with a Passkey. Click below or scan to unlock.', 
    id: 'Vault Anda diamankan dengan Passkey. Klik di bawah ini atau pindai untuk membuka kunci.' 
  },
  unlockWithPasskeyBtn: { en: 'UNLOCK WITH PASSKEY', id: 'BUKA KUNCI DENGAN PASSKEY' },
  orUnlockPasswordLink: { en: 'OR UNLOCK WITH PASSWORD', id: 'ATAU BUKA KUNCI DENGAN KATA SANDI' },
  forgotKeyReset: { en: 'Forgot Key? Reset Vault', id: 'Lupa Kunci? Reset Vault' },
  secureLocalVault: { en: 'Secure Local Vault', id: 'Secure Local Vault' },
  enterVaultPassDecrypt: { 
    en: 'Enter your vault password to decrypt all your data locally.', 
    id: 'Masukkan kata sandi vault Anda untuk mendekripsi semua data Anda secara lokal.' 
  },
  vaultPasswordPlaceholder: { en: 'Vault Password', id: 'Kata Sandi Vault' },
  passwordLengthError: { en: 'Password must be at least 4 characters.', id: 'Kata sandi harus minimal 4 karakter.' },
  unlocking: { en: 'Unlocking...', id: 'Membuka Kunci...' },
  unlockVaultBtn: { en: 'UNLOCK VAULT', id: 'BUKA KUNCI VAULT' },
  orUnlockBiometricsLink: { en: 'OR UNLOCK WITH BIOMETRICS', id: 'ATAU BUKA KUNCI DENGAN BIOMETRIK' },
  forgotPasswordReset: { en: 'Forgot Password? Reset Vault', id: 'Lupa Kata Sandi? Reset Vault' },
  incorrectPassword: { en: 'Incorrect password.', id: 'Kata sandi salah.' },
  failedUnlockVault: { en: 'Failed to unlock vault.', id: 'Gagal membuka kunci vault.' },

  // Settings Modal - General
  aiSettingsTab: { en: 'AI Processing', id: 'Pemrosesan AI' },
  appearanceSettingsTab: { en: 'Appearance', id: 'Tampilan' },
  systemSettingsTab: { en: 'System & Security', id: 'Sistem & Keamanan' },
  saveSettingsBtn: { en: 'Save Settings', id: 'Simpan Pengaturan' },
  savingSettingsToast: { en: 'Saving settings...', id: 'Menyimpan pengaturan...' },
  settingsSavedToast: { en: 'Settings saved', id: 'Pengaturan disimpan' },
  saveFailedToast: { en: 'Save failed', id: 'Gagal menyimpan' },
  failedSaveSettings: { en: 'Failed to encrypt and store the settings.', id: 'Gagal mengenkripsi dan menyimpan pengaturan.' },
  settingsTitle: { en: 'Settings', id: 'Pengaturan' },

  // Settings - AI Tab
  aiProviderLabel: { en: 'AI Provider', id: 'AI Provider' },
  modelNameLabel: { en: 'Model Name', id: 'Model Name' },
  recommendedFlash: { en: 'Recommended: gemini-3.5-flash', id: 'Direkomendasikan: gemini-3.5-flash' },
  apiKeyLabel: { en: 'API Key', id: 'API Key' },
  apiEndpointLabel: { en: 'API Endpoint URL', id: 'API Endpoint URL' },
  useLlmOcrLabel: { en: 'Use LLM Vision for OCR Data Extraction', id: 'Gunakan LLM Vision untuk Ekstraksi Data OCR' },
  useLlmOcrSublabel: { 
    en: 'Extract text more intelligently using the AI model (requires vision support).', 
    id: 'Ekstrak teks secara lebih cerdas menggunakan model AI (memerlukan dukungan vision).' 
  },
  modelTempLabel: { en: 'Model Temperature', id: 'Model Temperature' },
  deterministic: { en: 'Deterministic (0.0)', id: 'Deterministik (0.0)' },
  creative: { en: 'Creative (1.0)', id: 'Kreatif (1.0)' },
  autoTagStrategyLabel: { en: 'Auto-Tagging Strategy', id: 'Strategi Auto-Tagging' },
  autoTagHybrid: { en: 'Hybrid (AI + Rule-based)', id: 'Hybrid (AI + Berbasis Aturan)' },
  autoTagLocal: { en: 'Rule-based (Offline only)', id: 'Berbasis Aturan (Offline saja)' },
  autoTagNone: { en: 'Disabled (No auto-suggest)', id: 'Dinonaktifkan (Tanpa saran otomatis)' },
  autoTagHelp: { 
    en: 'Choose how tags are suggested/generated for imported documents.', 
    id: 'Pilih bagaimana tag disarankan/dihasilkan untuk dokumen yang diimpor.' 
  },
  showAdvancedPrompt: { 
    en: 'Show Advanced Prompt Controls (System instructions)', 
    id: 'Tampilkan Kontrol Prompt Tingkat Lanjut (Instruksi sistem)' 
  },
  hideAdvancedPrompt: { 
    en: 'Hide Advanced Prompt Controls', 
    id: 'Sembunyikan Kontrol Prompt Tingkat Lanjut' 
  },
  customOcrPromptLabel: { en: 'Custom OCR Prompt', id: 'Custom OCR Prompt' },
  customOcrPromptHelp: { 
    en: 'Instructions for AI vision models when extracting text from images.', 
    id: 'Instruksi untuk model AI vision saat mengekstraksi teks dari gambar.' 
  },
  customSummaryPromptLabel: { en: 'Custom Summary Prompt', id: 'Custom Summary Prompt' },
  customSummaryPromptHelp: { 
    en: 'Customize summaries. Placeholders: {{text}}, {{tags}}.', 
    id: 'Kustomisasi ringkasan. Placeholders: {{text}}, {{tags}}.' 
  },
  enablePreprocessingLabel: { en: 'Enable Image Preprocessing', id: 'Aktifkan Pra-pemrosesan Gambar' },
  enablePreprocessingSub: { en: 'Auto-detect and improve image quality before running OCR', id: 'Deteksi otomatis dan tingkatkan kualitas gambar sebelum OCR' },
  grayscaleToggle: { en: 'Grayscale Conversion', id: 'Konversi Skala Abu-abu' },
  contrastToggle: { en: 'Contrast Enhancement', id: 'Peningkatan Kontras' },
  denoiseToggle: { en: 'Noise Reduction (Median Filter)', id: 'Pengurangan Derau (Filter Median)' },
  deskewToggle: { en: 'Auto Deskew (Straighten)', id: 'Auto Deskew (Luruskan)' },
  rotateToggle: { en: 'Auto Rotate Pages', id: 'Auto Rotasi Halaman' },
  binarizeToggle: { en: 'Binarization (Otsu Threshold)', id: 'Binarisasi (Otsu Threshold)' },
  rotationThresholdLabel: { en: 'Rotation Confidence Threshold', id: 'Ambang Batas Kepercayaan Rotasi' },
  ocrLanguagesLabel: { en: 'OCR Languages', id: 'Bahasa OCR' },
  ocrLanguagesSub: { en: 'Select languages to recognize. Bundled languages run offline.', id: 'Pilih bahasa untuk dikenali. Bahasa bawaan berjalan offline.' },
  exportSearchablePdf: { en: 'Searchable PDF (Sandwich)', id: 'PDF Dapat Dicari (Sandwich)' },
  exportTextPdf: { en: 'Text-only PDF', id: 'PDF Teks Saja' },
  pdfRenderScaleLabel: { en: 'PDF Render Scale', id: 'Skala Render PDF' },
  pdfRenderScaleSub: { en: 'Higher = sharper OCR on low-DPI scans (1.5-4.0)', id: 'Lebih tinggi = OCR lebih tajam pada pindaian resolusi rendah (1.5-4.0)' },
  showOcrOverlay: { en: 'Show Confidence Overlay', id: 'Tampilkan Overlay Kepercayaan' },
  hideOcrOverlay: { en: 'Hide Confidence Overlay', id: 'Sembunyikan Overlay Kepercayaan' },
  enablePostOcrCorrection: { en: 'Post-OCR LLM Correction', id: 'Koreksi OCR dengan LLM' },
  enablePostOcrCorrectionSub: { en: 'Send Tesseract result to AI for error cleanup (requires AI config)', id: 'Kirim hasil Tesseract ke AI untuk pembersihan kesalahan (memerlukan konfigurasi AI)' },
  postOcrCorrectionPromptLabel: { en: 'Post-OCR Correction Prompt', id: 'Prompt Koreksi Pasca-OCR' },
  postOcrCorrectionPromptHelp: { en: 'Custom instructions for correcting OCR output. Use {{text}} placeholder.', id: 'Instruksi kustom untuk mengoreksi output OCR. Gunakan placeholder {{text}}.' },
  handwritingMode: { en: 'Handwriting Recognition Mode', id: 'Mode Pengenalan Tulisan Tangan' },
  handwritingModeSub: { en: 'Optimizes AI prompts for handwritten text. Forces LLM Vision OCR.', id: 'Optimalkan prompt AI untuk teks tulisan tangan. Memaksa LLM Vision OCR.' },
  handwritingModeWarning: { en: 'Handwriting mode requires an AI provider with vision support. Tesseract is not available for handwriting.', id: 'Mode tulisan tangan memerlukan penyedia AI dengan dukungan vision. Tesseract tidak tersedia untuk tulisan tangan.' },
  selectRegion: { en: 'Select Region', id: 'Pilih Wilayah' },
  exitRegionMode: { en: 'Exit Region Mode', id: 'Keluar Mode Wilayah' },
  ocrRegion: { en: 'OCR Region(s)', id: 'OCR Wilayah' },
  detectTables: { en: 'Detect Tables', id: 'Deteksi Tabel' },
  exportCsv: { en: 'Export CSV', id: 'Ekspor CSV' },
  exportMarkdownTable: { en: 'Export Table (MD)', id: 'Ekspor Tabel (MD)' },
  noTablesFound: { en: 'No tables detected in this page.', id: 'Tidak ada tabel yang terdeteksi di halaman ini.' },
  tablesDetected: { en: 'Tables detected', id: 'Tabel terdeteksi' },
  regionOcrDone: { en: 'Region OCR complete', id: 'OCR wilayah selesai' },
  exportDocx: { en: 'DOCX', id: 'DOCX' },
  exportSrt: { en: 'SRT', id: 'SRT' },
  exportJson: { en: 'JSON', id: 'JSON' },
  compareEngines: { en: 'Compare Engines', id: 'Bandingkan Mesin' },
  useTesseract: { en: 'Use Tesseract', id: 'Gunakan Tesseract' },
  useLlm: { en: 'Use LLM Vision', id: 'Gunakan LLM Vision' },

  // Settings - Appearance Tab
  colorThemeLabel: { en: 'Color Theme', id: 'Tema Warna' },
  themeLight: { en: 'Light', id: 'Terang' },
  themeDark: { en: 'Dark', id: 'Gelap' },
  themeSystem: { en: 'System', id: 'Sistem' },
  colorThemeHelp: { 
    en: 'Choose how the vault looks. "System" will match your operating system\'s dark or light mode preference.', 
    id: 'Pilih tampilan vault. "Sistem" akan menyesuaikan dengan preferensi mode gelap atau terang sistem operasi Anda.' 
  },
  fontSizeScaleLabel: { en: 'Font Size Scale', id: 'Skala Ukuran Huruf' },
  fontSizeSmall: { en: 'Small', id: 'Kecil' },
  fontSizeMedium: { en: 'Medium', id: 'Sedang' },
  fontSizeLarge: { en: 'Large', id: 'Besar' },
  fontSizeHelp: { 
    en: 'Scale the interface text size. "Small" fits more items, while "Large" increases visual comfort.', 
    id: 'Sesuaikan ukuran teks antarmuka. "Kecil" memuat lebih banyak item, sedangkan "Besar" meningkatkan kenyamanan visual.' 
  },
  languageLabel: { en: 'Language', id: 'Bahasa' },
  languageHelp: { 
    en: 'Choose the application interface language.', 
    id: 'Pilih bahasa antarmuka aplikasi.' 
  },

  // Settings - System & Security Tab
  biometricUnlockLabel: { en: 'Biometric Unlock (Beta)', id: 'Biometric Unlock (Beta)' },
  biometricUnlockHelp: { 
    en: 'Link a Passkey (Touch ID, Face ID, or Windows Hello) to this vault. This creates a secondary secure key that decrypts your master key on this device.', 
    id: 'Hubungkan Passkey (Touch ID, Face ID, atau Windows Hello) ke vault ini. Ini membuat kunci aman sekunder yang mendekripsi kunci utama Anda di perangkat ini.' 
  },
  biometricsUnavailableHelp: { 
    en: 'Biometrics are unavailable. Ensure you are using a modern browser, your context is secure (HTTPS/localhost), and your device supports biometrics.', 
    id: 'Biometrik tidak tersedia. Pastikan Anda menggunakan peramban modern, konteks Anda aman (HTTPS/localhost), dan perangkat Anda mendukung biometrik.' 
  },
  biometricUnlockLinkedText: { en: 'Biometric Unlock Linked', id: 'Biometric Unlock Terhubung' },
  disableBiometricsBtn: { en: 'Disable Biometrics', id: 'Nonaktifkan Biometrik' },
  linkTouchFaceBtn: { en: 'Link Touch ID / Face ID', id: 'Hubungkan Touch ID / Face ID' },
  registeringBiometricsText: { en: 'Registering Biometrics...', id: 'Mendaftarkan Biometrik...' },
  passkeyLinkedSuccess: { en: 'Passkey Linked Successfully', id: 'Passkey Berhasil Terhubung' },
  passkeyLinkedDesc: { 
    en: 'You can now unlock your vault using biometrics (Touch ID / Face ID) or your master password.', 
    id: 'Anda sekarang dapat membuka vault Anda menggunakan biometrik (Touch ID / Face ID) atau kata sandi utama Anda.' 
  },
  passkeyRegFailed: { en: 'Passkey Registration Failed', id: 'Pendaftaran Passkey Gagal' },
  passkeyRegFailedDesc: { 
    en: 'Ensure your device supports biometrics and try again.', 
    id: 'Pastikan perangkat Anda mendukung biometrik dan coba lagi.' 
  },
  passkeyUnlinked: { en: 'Passkey Unlinked', id: 'Passkey Terputus' },
  passkeyUnlinkedDesc: { 
    en: 'Biometric unlock disabled. You can still unlock using your master password.', 
    id: 'Buka kunci biometrik dinonaktifkan. Anda masih dapat membuka kunci menggunakan kata sandi utama Anda.' 
  },
  vaultBackupTitle: { en: 'Vault Backup & Import', id: 'Cadangkan & Impor Vault' },
  vaultBackupHelp: { 
    en: 'Export your encrypted local database to back up your data or move it to a different browser/device. Backups remain fully encrypted.', 
    id: 'Ekspor database lokal Anda yang terenkripsi untuk mencadangkan data Anda atau memindahkannya ke peramban/perangkat lain. Cadangan tetap terenkripsi sepenuhnya.' 
  },
  exportEncryptedBtn: { en: 'Export Encrypted Backup', id: 'Ekspor Cadangan Terenkripsi' },
  importEncryptedBtn: { en: 'Import Encrypted Backup', id: 'Impor Cadangan Terenkripsi' },
  vaultBackupExported: { en: 'Vault Backup Exported', id: 'Cadangan Vault Diekspor' },
  vaultBackupExportedDesc: { 
    en: 'Your local-encrypted backup file has been saved to your downloads.', 
    id: 'File cadangan terenkripsi lokal Anda telah disimpan di folder unduhan Anda.' 
  },
  exportFailed: { en: 'Export Failed', id: 'Gagal Mengekspor' },
  importFailed: { en: 'Import Failed', id: 'Gagal Mengimpor' },
  vaultImportedTitle: { en: 'Vault Imported', id: 'Vault Berhasil Diimpor' },
  vaultImportedDesc: { 
    en: 'Your encrypted backup was loaded. Reloading page to prompt for unlock password...', 
    id: 'Cadangan terenkripsi Anda berhasil dimuat. Memuat ulang halaman untuk meminta kata sandi pembuka kunci...' 
  },
  appUpdateTitle: { en: 'Application Update', id: 'Pembaruan Aplikasi' },
  appUpdateHelp: { 
    en: 'Manage application versions. PWAs cache assets aggressively and may need a hard refresh to load updates.', 
    id: 'Kelola versi aplikasi. PWA menyimpan aset secara agresif dan mungkin memerlukan refresh keras untuk memuat pembaruan.' 
  },
  updateAvailableBadgeTitle: { en: 'Update Available: v{{version}}', id: 'Pembaruan Tersedia: v{{version}}' },
  updateAvailableBadgeHelp: { 
    en: 'A newer version of OcularOCR is ready. Update now to refresh and apply the latest changes. Your local vault remains completely safe.', 
    id: 'Versi baru OcularOCR telah siap. Perbarui sekarang untuk me-refresh dan menerapkan perubahan terbaru. Vault lokal Anda tetap sepenuhnya aman.' 
  },
  updateHardRefreshBtn: { en: 'UPDATE AND HARD REFRESH', id: 'PERBARUI DAN REFRESH KERAS' },
  checkingUpdatesText: { en: 'Checking for updates...', id: 'Memeriksa pembaruan...' },
  checkForUpdatesBtnText: { en: 'Check for Updates', id: 'Periksa Pembaruan' },
  resetVaultStorageTitle: { en: 'Reset Vault Storage', id: 'Reset Penyimpanan Vault' },
  resetVaultStorageHelp: { 
    en: 'This action will permanently delete all encrypted documents, OCR texts, tags, summaries, and configurations from this device. All data resides solely on this client browser: there are no backups, and this deletion is irreversible.', 
    id: 'Tindakan ini akan menghapus semua dokumen terenkripsi, teks OCR, tag, ringkasan, dan konfigurasi dari perangkat ini secara permanen. Semua data berada sepenuhnya di peramban klien ini: tidak ada cadangan, dan penghapusan ini tidak dapat dibatalkan.' 
  },
  understandResetConfirm: { 
    en: 'I understand that my vault data will be permanently deleted and cannot be recovered.', 
    id: 'Saya memahami bahwa data vault saya akan dihapus secara permanen dan tidak dapat dipulihkan.' 
  },
  resettingVaultText: { en: 'Resetting Vault...', id: 'Mereset Vault...' },
  permanentlyDeleteBtn: { en: 'Permanently Delete Vault & Reset', id: 'Hapus Vault Permanen & Reset' },
  resetSuccessTitle: { en: 'Vault reset successfully', id: 'Vault berhasil direset' },
  resetSuccessDesc: { en: 'Redirecting to initial setup...', id: 'Mengarahkan kembali ke penyiapan awal...' },
  resetFailedTitle: { en: 'Reset failed', id: 'Reset gagal' },
  resetFailedDesc: { en: 'An error occurred while clearing the vault.', id: 'Terjadi kesalahan saat menghapus vault.' },

  // File Manager
  dropFilesTitle: { en: 'Drop files here to encrypt & store securely', id: 'Letakkan file di sini untuk mengenkripsi & menyimpan dengan aman' },
  supportedFormatsText: { en: 'Supported formats: PDF, PNG, JPEG, WebP', id: 'Format yang didukung: PDF, PNG, JPEG, WebP' },
  clientSidePrivateInfo: { en: 'All operations are 100% client-side & private', id: 'Semua operasi 100% di sisi klien & privat' },
  yourSecureDocsTitle: { en: 'Your Secure Documents', id: 'Dokumen Aman Anda' },
  searchVaultPlaceholder: { en: 'Search in vault...', id: 'Cari di vault...' },
  addFromUrlBtn: { en: 'Add From URL', id: 'Tambah Dari URL' },
  importFileBtn: { en: 'Import File', id: 'Impor File' },
  encryptingText: { en: 'Encrypting...', id: 'Mengenkripsi...' },
  enterDirectLinkPlaceholder: { 
    en: 'Enter direct file link (e.g., https://example.com/file.pdf)', 
    id: 'Masukkan tautan file langsung (misalnya, https://example.com/file.pdf)' 
  },
  downloadEncryptBtn: { en: 'Download & Encrypt', id: 'Unduh & Enkripsi' },
  processingDocsTitle: { en: 'Processing Documents', id: 'Memproses Dokumen' },
  dragDropOrClickHelp: { en: 'Drag & drop files here, or click to browse', id: 'Seret & letakkan file di sini, atau klik untuk memilih' },
  supportsPdfImagesHelp: { en: 'Supports PDF documents or PNG, JPEG, WebP images', id: 'Mendukung dokumen PDF atau gambar PNG, JPEG, WebP' },
  clientSideEncryptionBadge: { en: '100% Client-Side Encryption (AES-GCM-256)', id: '100% Client-Side Enkripsi (AES-GCM-256)' },
  selectedCountText: { en: '{{count}} selected', id: '{{count}} terpilih' },
  bulkOcrBtn: { en: 'Bulk OCR', id: 'Bulk OCR' },
  autoTagBtn: { en: 'Auto-Tag', id: 'Auto-Tag' },
  exportPdfBtn: { en: 'Export PDF', id: 'Ekspor PDF' },
  bulkDeleteBtn: { en: 'Bulk Delete', id: 'Bulk Delete' },
  fileNameCol: { en: 'File Name', id: 'Nama File' },
  tagsCol: { en: 'Tags', id: 'Tag' },
  statusCol: { en: 'Status', id: 'Status' },
  typeCol: { en: 'Type', id: 'Jenis' },
  dateImportedCol: { en: 'Date Imported', id: 'Tanggal Diimpor' },
  noDocsMatchingSearch: { en: 'No documents match your search criteria.', id: 'Tidak ada dokumen yang cocok dengan kriteria pencarian Anda.' },
  allFilesTab: { en: 'All Files', id: 'Semua File' },
  pdfsTab: { en: 'PDFs', id: 'PDF' },
  imagesTab: { en: 'Images', id: 'Gambar' },
  untaggedTab: { en: 'Untagged', id: 'Tanpa Tag' },
  systemTagsTitle: { en: 'SYSTEM TAGS', id: 'TAG SISTEM' },
  bulkDeleteConfirmTitle: { en: 'Delete {{count}} Documents?', id: 'Hapus {{count}} Dokumen?' },
  bulkDeleteConfirmDesc: { 
    en: 'Are you sure you want to permanently delete these {{count}} documents? This action will destroy the encrypted files and their OCR index.', 
    id: 'Apakah Anda yakin ingin menghapus {{count}} dokumen ini secara permanen? Tindakan ini akan menghancurkan file terenkripsi dan indeks OCR mereka.' 
  },
  deleteDocSingleTitle: { en: 'Delete Document', id: 'Hapus Dokumen' },
  deleteDocSingleDesc: { 
    en: 'Are you sure you want to permanently delete "{{name}}"? This action is irreversible.', 
    id: 'Apakah Anda yakin ingin menghapus "{{name}}" secara permanen? Tindakan ini tidak dapat dibatalkan.' 
  },
  deleteDocsConfirmBtn: { en: 'DELETE DOCUMENTS', id: 'HAPUS DOKUMEN' },
  deleteDocSingleConfirmBtn: { en: 'DELETE DOCUMENT', id: 'HAPUS DOKUMEN' },
  statusOcrPending: { en: 'OCR Pending', id: 'OCR Tertunda' },
  statusOcrCompleted: { en: 'OCR Ready', id: 'OCR Siap' },
  statusOcrProcessing: { en: 'OCR Processing...', id: 'Memproses OCR...' },
  statusOcrFailed: { en: 'OCR Failed', id: 'OCR Gagal' },

  // Document Viewer
  ocrTab: { en: 'OCR Text', id: 'Teks OCR' },
  summaryTab: { en: 'Summary', id: 'Ringkasan' },
  detailsTab: { en: 'Details', id: 'Detail' },
  noOcrTextTitle: { en: 'No OCR Data Indexed', id: 'Data OCR Belum Terindeks' },
  noOcrTextHelp: { 
    en: 'This document hasn\'t been parsed yet. Trigger client-side OCR extraction below to parse the document text.', 
    id: 'Dokumen ini belum diurai. Jalankan ekstraksi OCR di bawah ini untuk mengurai teks dokumen.' 
  },
  runOcrBtn: { en: 'RUN CLIENT-SIDE OCR', id: 'JALANKAN OCR SISI KLIEN' },
  noSummaryTitle: { en: 'No Summary Generated', id: 'Belum Ada Ringkasan' },
  noSummaryHelp: { 
    en: 'Provide an AI configuration key in Settings, then request a summary below.', 
    id: 'Masukkan API key AI di Pengaturan, lalu minta ringkasan di bawah ini.' 
  },
  generateSummaryBtn: { en: 'GENERATE SUMMARY', id: 'BUAT RINGKASAN' },
  regenerateSummaryBtn: { en: 'REGENERATE SUMMARY', id: 'BUAT ULANG RINGKASAN' },
  fileMetadataTitle: { en: 'File Metadata', id: 'Metadata File' },
  dateCreatedLabel: { en: 'Date Created', id: 'Tanggal Dibuat' },
  fileSizeLabel: { en: 'File Size', id: 'Ukuran File' },
  mimeTypeLabel: { en: 'Mime Type', id: 'Jenis Mime' },
  systemDocumentIdLabel: { en: 'System Document ID', id: 'ID Dokumen Sistem' },
  decryptionKeyLabel: { en: 'Decryption IV', id: 'IV Dekripsi' },
  downloadDecryptedBtn: { en: 'Download Decrypted', id: 'Unduh Dekripsi' },
  deleteDocumentBtn: { en: 'Delete Document', id: 'Hapus Dokumen' },
  savingChangesBtn: { en: 'Saving...', id: 'Menyimpan...' },
  saveChangesBtn: { en: 'Save Title', id: 'Simpan Judul' },
  tagsInputPlaceholder: { en: 'Press Enter to add...', id: 'Tekan Enter untuk menambah...' },
  tagsTitle: { en: 'Tags', id: 'Tag' },
  suggestTagsBtn: { en: 'Suggest Tags', id: 'Sarankan Tag' },
  ocrRunningInProgress: { en: 'Running OCR extraction...', id: 'Menjalankan ekstraksi OCR...' },
  ocrSuccessToast: { en: 'OCR completed successfully', id: 'OCR berhasil diselesaikan' },
  ocrFailedToast: { en: 'OCR extraction failed', id: 'Ekstraksi OCR gagal' },
  summaryGeneratingInProgress: { en: 'Generating summary...', id: 'Membuat ringkasan...' },
  summarySuccessToast: { en: 'Summary generated successfully', id: 'Ringkasan berhasil dibuat' },
  summaryFailedToast: { en: 'Summary generation failed', id: 'Pembuatan ringkasan gagal' },
  tagsSuggestingInProgress: { en: 'Analyzing document for tags...', id: 'Menganalisis dokumen untuk tag...' },
  tagsSuggestSuccessToast: { en: 'Tags suggested successfully', id: 'Tag berhasil disarankan' },
  tagsSuggestFailedToast: { en: 'Tags suggestion failed', id: 'Saran tag gagal' },
  pdfExportSuccessToast: { en: 'PDF exported successfully', id: 'PDF berhasil diekspor' },
  pdfExportFailedToast: { en: 'PDF export failed', id: 'Ekspor PDF gagal' },

  // Missing Document Viewer keys
  previewTab: { en: 'Preview', id: 'Pratinjau' },
  textTab: { en: 'Extracted Text', id: 'Teks Ekstraksi' },
  aiAssistantTags: { en: 'AI Assistant & Tags', id: 'Asisten AI & Tag' },
  addBtn: { en: 'Add', id: 'Tambah' },
  suggestedCategories: { en: 'Suggested Categories', id: 'Saran Kategori' },
  noSuggestions: { en: 'No suggestions', id: 'Tidak ada saran' },
  reExtractTextBtn: { en: 'Re-extract Text', id: 'Ekstrak Ulang Teks' },
  clickToExpand: { en: 'Click to expand', id: 'Klik untuk memperluas' },
  expandPanel: { en: 'EXPAND PANEL', id: 'PERLUAS PANEL' },
  documentTags: { en: 'Document Tags', id: 'Tag Dokumen' },
  noTagsAssigned: { en: 'No tags assigned to this document.', id: 'Tidak ada tag yang disematkan ke dokumen ini.' },
  insightsTitle: { en: 'Document Insights', id: 'Wawasan Dokumen' },
  insightsSubTitle: { en: 'Generate a secure summary and extract key data points using your configured LLM.', id: 'Hasilkan ringkasan aman dan ekstrak poin data penting menggunakan LLM Anda.' },
  runOcrFirstHelp: { en: 'Run OCR first to extract text before using AI analysis.', id: 'Jalankan OCR terlebih dahulu untuk mengekstrak teks sebelum menggunakan analisis AI.' },
  processingAi: { en: 'Processing via AI...', id: 'Memproses via AI...' },
  extractTextBtn: { en: 'Extract Text', id: 'Ekstrak Teks' },
  aiAssistant: { en: 'AI Assistant', id: 'Asisten AI' },

  // Version/PWA Banners
  updateCheckingToast: { en: 'Checking for updates', id: 'Memeriksa pembaruan' },
  updateCheckingToastDesc: { en: 'Fetching the latest version from server...', id: 'Mengambil versi terbaru dari server...' },
  updateAvailableToast: { en: 'Update available!', id: 'Pembaruan tersedia!' },
  updateAvailableToastDesc: { en: 'Version v{{version}} is now available (current: v{{current}}).', id: 'Versi v{{version}} kini tersedia (saat ini: v{{current}}).' },
  updateUpToDateToast: { en: 'Up to date', id: 'Sudah versi terbaru' },
  updateUpToDateToastDesc: { en: 'You are running the latest version (v{{current}}).', id: 'Anda menjalankan versi terbaru (v{{current}}).' },
  installAppBannerTitle: { en: 'Install OcularOCR App', id: 'Instal Aplikasi OcularOCR' },
  installAppBannerDesc: { en: 'Install OcularOCR on your device for an app-like experience, offline support, and biometric login integration.', id: 'Instal OcularOCR di perangkat Anda untuk pengalaman seperti aplikasi native, dukungan offline, dan integrasi login biometrik.' },
  installBtn: { en: 'Install App', id: 'Instal Aplikasi' },
  dismissBtn: { en: 'Dismiss', id: 'Abaikan' },
};

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translationDict, replacements?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

const langListeners = new Set<() => void>();

function subscribeToLang(cb: () => void) {
  langListeners.add(cb);
  window.addEventListener('storage', cb);
  return () => {
    langListeners.delete(cb);
    window.removeEventListener('storage', cb);
  };
}

function getLangSnapshot(): Language {
  const v = localStorage.getItem('vault_lang');
  return v === 'en' || v === 'id' ? v : 'en';
}

function notifyLangListeners() {
  langListeners.forEach(l => l());
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const language = useSyncExternalStore(subscribeToLang, getLangSnapshot, () => 'en') as Language;

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Language) => {
    localStorage.setItem('vault_lang', lang);
    document.documentElement.lang = lang;
    notifyLangListeners();
  };

  const t = (key: keyof typeof translationDict, replacements?: Record<string, string | number>): string => {
    const translation = translationDict[key];
    if (!translation) {
      return String(key);
    }
    let text = translation[language] || translation['en'] || String(key);
    if (replacements) {
      Object.entries(replacements).forEach(([k, v]) => {
        text = text.replace(`{{${k}}}`, String(v));
      });
    }
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useI18n must be used within a LanguageProvider');
  }
  return context;
}
