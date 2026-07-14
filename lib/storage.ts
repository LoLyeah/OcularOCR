import { get, set, keys, del, clear } from 'idb-keyval';
import { arrayBufferToBase64, base64ToArrayBuffer, decryptString, encryptString } from './crypto';


export interface DocumentEntry {
  id: string;
  name: string;
  type: string;
  createdAt: number;
  iv: Uint8Array;
  encryptedData: ArrayBuffer;
  ocrTextIv?: Uint8Array;
  encryptedOcrText?: ArrayBuffer;
  summaryIv?: Uint8Array;
  encryptedSummary?: ArrayBuffer;
  encryptedTags?: ArrayBuffer;
  tagsIv?: Uint8Array;
  encryptedMetadata?: ArrayBuffer;
  metadataIv?: Uint8Array;
}

interface DocumentMetadata {
  name: string;
  type: string;
  createdAt: number;
}

export const STORAGE_KEY_SALT = 'vault_salt';
export const STORAGE_KEY_DOCS = 'doc_';
export const STORAGE_KEY_SETTINGS = 'settings_enc';
export const STORAGE_KEY_VERIFY = 'vault_verify';
export const STORAGE_KEY_KDF_ITERATIONS = 'vault_kdf_iterations';
export const LEGACY_KDF_ITERATIONS = 100_000;
export const CURRENT_KDF_ITERATIONS = 600_000;

export interface AISettings {
  provider: 'gemini' | 'openai' | 'ollama';
  apiKey: string;
  endpoint: string; // for openai or ollama
  model: string;
  useLlmForOcr?: boolean;
  temperature?: number;
  ocrTemperature?: number;
  summaryTemperature?: number;
  correctionTemperature?: number;
  customOcrPrompt?: string;
  customSummaryPrompt?: string;
  autoTagStrategy?: 'hybrid' | 'local' | 'none';
  configs?: Record<string, { apiKey: string; endpoint: string; model: string }>;
  
  // Preprocessing and OCR extensions
  ocrLanguages?: string[]; // e.g., ['eng', 'ind']
  enablePreprocessing?: boolean;
  preprocessingGrayscale?: boolean;
  preprocessingContrast?: boolean;
  preprocessingDenoise?: boolean;
  preprocessingDeskew?: boolean;
  preprocessingRotate?: boolean;
  preprocessingBinarize?: boolean;
  rotationThreshold?: number;
  pdfRenderScale?: number;
  enablePostOcrCorrection?: boolean;
  postOcrCorrectionPrompt?: string;
  handwritingMode?: boolean;
  structuredLlmOcr?: boolean;
  localOnlyMode?: boolean;
  cloudProcessingConsent?: boolean;
  providerVerification?: {
    provider: 'gemini' | 'openai' | 'ollama';
    endpoint: string;
    model: string;
    checkedAt: string;
    capabilities: { text: 'verified' | 'unsupported' | 'untested'; vision: 'verified' | 'unsupported' | 'untested'; structured: 'verified' | 'unsupported' | 'untested' };
  };
}

export interface OcrWord {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  confidence?: number;
}

export type OcrBlockType = 'text' | 'heading' | 'table' | 'list';

export interface OcrTableCell {
  text: string;
  isHeader?: boolean;
  rowSpan?: number;
  colSpan?: number;
  bbox?: { x0: number; y0: number; x1: number; y1: number };
  confidence?: number;
}

export interface OcrTableRow {
  cells: OcrTableCell[];
}

export interface OcrTable {
  id: string;
  pageNumber: number;
  rows: OcrTableRow[];
  bbox?: { x0: number; y0: number; x1: number; y1: number };
  confidence?: number;
  source?: 'offline' | 'provider' | 'user';
}

export interface OcrLine {
  bbox: { x0: number; y0: number; x1: number; y1: number };
  text: string;
  words: OcrWord[];
}

export interface OcrBlock {
  id?: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  text: string;
  type: OcrBlockType;
  level?: number;
  listStyle?: 'ordered' | 'unordered';
  table?: OcrTable;
  confidence?: number;
}

export interface OcrPageData {
  pageNumber: number;
  text: string;
  words: OcrWord[];
  lines?: OcrLine[];
  blocks?: OcrBlock[];
  tables?: OcrTable[];
  width?: number;
  height?: number;
}

export interface StructuredOcrResult {
  version?: number;
  text: string;
  pages: OcrPageData[];
}

export async function getSalt(): Promise<Uint8Array> {
  let salt = await get<Uint8Array>(STORAGE_KEY_SALT);
  if (!salt) {
    salt = crypto.getRandomValues(new Uint8Array(16));
    await set(STORAGE_KEY_SALT, salt);
  }
  return salt;
}

export async function getVerificationToken(): Promise<{ data: ArrayBuffer; iv: Uint8Array } | undefined> {
  return await get<{ data: ArrayBuffer; iv: Uint8Array }>(STORAGE_KEY_VERIFY);
}

export async function setVerificationToken(data: ArrayBuffer, iv: Uint8Array): Promise<void> {
  await set(STORAGE_KEY_VERIFY, { data, iv });
}

export async function saveDocument(doc: DocumentEntry, cryptoKey: CryptoKey): Promise<void> {
  const docToSave = { ...doc };
  delete (docToSave as any).decryptedTags;
  const metadata: DocumentMetadata = {
    name: doc.name,
    type: doc.type,
    createdAt: doc.createdAt,
  };
  const { encrypted, iv } = await encryptString(JSON.stringify(metadata), cryptoKey);
  docToSave.encryptedMetadata = encrypted;
  docToSave.metadataIv = iv;
  // Keep the required in-memory shape while ensuring sensitive metadata is not
  // readable in IndexedDB when the vault is locked.
  docToSave.name = '';
  docToSave.type = 'application/octet-stream';
  docToSave.createdAt = 0;
  await set(`${STORAGE_KEY_DOCS}${doc.id}`, docToSave);
}

export async function decryptDocumentMetadata(doc: DocumentEntry, cryptoKey: CryptoKey): Promise<DocumentEntry> {
  if (!doc.encryptedMetadata || !doc.metadataIv) return doc;
  const metadata = JSON.parse(await decryptString(doc.encryptedMetadata, doc.metadataIv, cryptoKey)) as Partial<DocumentMetadata>;
  if (typeof metadata.name !== 'string' || typeof metadata.type !== 'string' || typeof metadata.createdAt !== 'number') {
    throw new Error(`Document ${doc.id} contains invalid encrypted metadata.`);
  }
  return { ...doc, name: metadata.name, type: metadata.type, createdAt: metadata.createdAt };
}

export async function getDocument(id: string): Promise<DocumentEntry | undefined> {
  return await get<DocumentEntry>(`${STORAGE_KEY_DOCS}${id}`);
}

export async function listDocuments(): Promise<DocumentEntry[]> {
  const allKeys = await keys();
  const docKeys = allKeys.filter((k) => typeof k === 'string' && k.startsWith(STORAGE_KEY_DOCS));
  const docs: DocumentEntry[] = [];
  for (const k of docKeys) {
    const doc = await get<DocumentEntry>(k as string);
    if (doc) docs.push(doc);
  }
  return docs;
}

export async function listDecryptedDocuments(cryptoKey: CryptoKey): Promise<DocumentEntry[]> {
  const storedDocs = await listDocuments();
  const docs = await Promise.all(storedDocs.map(async (storedDoc) => {
    const wasLegacy = !storedDoc.encryptedMetadata || !storedDoc.metadataIv;
    const doc = await decryptDocumentMetadata(storedDoc, cryptoKey);
    if (wasLegacy) await saveDocument(doc, cryptoKey);
    return doc;
  }));
  return docs.sort((a, b) => b.createdAt - a.createdAt);
}

export function getKdfIterations(): number {
  if (typeof window === 'undefined') return LEGACY_KDF_ITERATIONS;
  const stored = Number(localStorage.getItem(STORAGE_KEY_KDF_ITERATIONS));
  return Number.isInteger(stored) && stored >= LEGACY_KDF_ITERATIONS ? stored : LEGACY_KDF_ITERATIONS;
}

export function setKdfIterations(iterations: number): void {
  if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY_KDF_ITERATIONS, String(iterations));
}

export async function deleteDocument(id: string): Promise<void> {
  await del(`${STORAGE_KEY_DOCS}${id}`);
}

export async function saveSettings(encryptedData: ArrayBuffer, iv: Uint8Array): Promise<void> {
  await set(STORAGE_KEY_SETTINGS, { data: encryptedData, iv });
}

export async function getSettings(): Promise<{ data: ArrayBuffer; iv: Uint8Array } | undefined> {
  return await get<{ data: ArrayBuffer; iv: Uint8Array }>(STORAGE_KEY_SETTINGS);
}

export async function clearVault(): Promise<void> {
  // 1. Clear the entire IndexedDB store
  try {
    await clear();
  } catch (err) {
    console.error('Failed to clear IndexedDB store:', err);
  }

  if (typeof window !== 'undefined') {
    // 2. Clear all vault-related localStorage items
    const keysToRemove = [
      'vault_mode',
      'vault_passkey_credential_id',
      'vault_passkey_wrapped_key',
      'vault_passkey_wrapped_iv',
      'vault_theme',
      'vault_font_size',
      'vault_auto_lock_minutes',
      'pwa_prompt_dismissed',
      STORAGE_KEY_KDF_ITERATIONS,
    ];
    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
    });

    // 3. Unregister all service workers
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      } catch (err) {
        console.error('Failed to unregister service workers:', err);
      }
    }

    // 4. Delete all Cache Storage caches
    if ('caches' in window) {
      try {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      } catch (err) {
        console.error('Failed to clear cache storage:', err);
      }
    }
  }
}

function uint8ArrayToArrayBuffer(arr: Uint8Array): ArrayBuffer {
  if (arr.byteOffset === 0 && arr.byteLength === arr.buffer.byteLength) {
    return arr.buffer as ArrayBuffer;
  }
  return arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength) as ArrayBuffer;
}

export interface EncryptedVaultBackup {
  version: 2;
  kdfIterations: number;
  salt: string;
  verifyToken?: {
    data: string;
    iv: string;
  };
  settings?: {
    data: string;
    iv: string;
  };
  documents: Array<{
    id: string;
    name?: string;
    type?: string;
    createdAt?: number;
    iv: string;
    encryptedData: string;
    metadataIv?: string;
    encryptedMetadata?: string;
    ocrTextIv?: string;
    encryptedOcrText?: string;
    summaryIv?: string;
    encryptedSummary?: string;
    encryptedTags?: string;
    tagsIv?: string;
  }>;
}

export async function exportVaultEncrypted(): Promise<string> {
  const salt = await getSalt();
  const verifyToken = await getVerificationToken();
  const settings = await getSettings();
  const documents = await listDocuments();

  const backup: EncryptedVaultBackup = {
    version: 2,
    kdfIterations: getKdfIterations(),
    salt: arrayBufferToBase64(uint8ArrayToArrayBuffer(salt)),
    documents: documents.map((doc) => {
      const docBackup: any = {
        id: doc.id,
        iv: arrayBufferToBase64(uint8ArrayToArrayBuffer(doc.iv)),
        encryptedData: arrayBufferToBase64(doc.encryptedData)
      };
      if (doc.encryptedMetadata && doc.metadataIv) {
        docBackup.metadataIv = arrayBufferToBase64(uint8ArrayToArrayBuffer(doc.metadataIv));
        docBackup.encryptedMetadata = arrayBufferToBase64(doc.encryptedMetadata);
      } else {
        // Backward-compatible export for a vault that has not yet completed its
        // automatic metadata migration.
        docBackup.name = doc.name;
        docBackup.type = doc.type;
        docBackup.createdAt = doc.createdAt;
      }
      if (doc.ocrTextIv && doc.encryptedOcrText) {
        docBackup.ocrTextIv = arrayBufferToBase64(uint8ArrayToArrayBuffer(doc.ocrTextIv));
        docBackup.encryptedOcrText = arrayBufferToBase64(doc.encryptedOcrText);
      }
      if (doc.summaryIv && doc.encryptedSummary) {
        docBackup.summaryIv = arrayBufferToBase64(uint8ArrayToArrayBuffer(doc.summaryIv));
        docBackup.encryptedSummary = arrayBufferToBase64(doc.encryptedSummary);
      }
      if (doc.tagsIv && doc.encryptedTags) {
        docBackup.tagsIv = arrayBufferToBase64(uint8ArrayToArrayBuffer(doc.tagsIv));
        docBackup.encryptedTags = arrayBufferToBase64(doc.encryptedTags);
      }
      return docBackup;
    })
  };

  if (verifyToken) {
    backup.verifyToken = {
      data: arrayBufferToBase64(verifyToken.data),
      iv: arrayBufferToBase64(uint8ArrayToArrayBuffer(verifyToken.iv))
    };
  }

  if (settings) {
    backup.settings = {
      data: arrayBufferToBase64(settings.data),
      iv: arrayBufferToBase64(uint8ArrayToArrayBuffer(settings.iv))
    };
  }

  return JSON.stringify(backup, null, 2);
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown, label: string): UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as UnknownRecord;
}

function asString(value: unknown, label: string, maxLength = 10_000): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > maxLength) throw new Error(`${label} is invalid.`);
  return value;
}

function decodeBase64(value: unknown, label: string, expectedLength?: number): ArrayBuffer {
  const encoded = asString(value, label, 150 * 1024 * 1024);
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.length % 4 !== 0) throw new Error(`${label} is not valid base64.`);
  let decoded: ArrayBuffer;
  try {
    decoded = base64ToArrayBuffer(encoded);
  } catch {
    throw new Error(`${label} is not valid base64.`);
  }
  if (expectedLength !== undefined && decoded.byteLength !== expectedLength) throw new Error(`${label} has an invalid length.`);
  return decoded;
}

function readEncryptedPair(
  record: UnknownRecord,
  dataKey: string,
  ivKey: string,
  label: string,
): { data: ArrayBuffer; iv: Uint8Array } | undefined {
  const hasData = record[dataKey] !== undefined;
  const hasIv = record[ivKey] !== undefined;
  if (hasData !== hasIv) throw new Error(`${label} is incomplete.`);
  if (!hasData) return undefined;
  const data = decodeBase64(record[dataKey], `${label} data`);
  if (data.byteLength < 16) throw new Error(`${label} ciphertext is too short.`);
  return { data, iv: new Uint8Array(decodeBase64(record[ivKey], `${label} IV`, 12)) };
}

function parseBackup(backupJsonStr: string): { entries: [IDBValidKey, unknown][]; kdfIterations: number } {
  if (backupJsonStr.length > 150 * 1024 * 1024) throw new Error('The backup file is too large to import safely.');
  let parsed: unknown;
  try {
    parsed = JSON.parse(backupJsonStr);
  } catch {
    throw new Error('The backup is not valid JSON.');
  }
  const backup = asRecord(parsed, 'Backup');
  const version = backup.version === undefined ? 1 : Number(backup.version);
  if (version !== 1 && version !== 2) throw new Error(`Backup version ${String(backup.version)} is not supported.`);

  const salt = new Uint8Array(decodeBase64(backup.salt, 'Vault salt', 16));
  const verify = readEncryptedPair(asRecord(backup.verifyToken, 'Verification token'), 'data', 'iv', 'Verification token');
  if (!verify) throw new Error('The backup does not contain a vault verification token.');

  const entries: [IDBValidKey, unknown][] = [
    [STORAGE_KEY_SALT, salt],
    [STORAGE_KEY_VERIFY, verify],
  ];

  if (backup.settings !== undefined) {
    const settings = readEncryptedPair(asRecord(backup.settings, 'Settings'), 'data', 'iv', 'Settings');
    if (settings) entries.push([STORAGE_KEY_SETTINGS, settings]);
  }

  if (!Array.isArray(backup.documents) || backup.documents.length > 10_000) {
    throw new Error('The backup document list is invalid or too large.');
  }
  const ids = new Set<string>();
  for (let index = 0; index < backup.documents.length; index++) {
    const record = asRecord(backup.documents[index], `Document ${index + 1}`);
    const id = asString(record.id, `Document ${index + 1} ID`, 200);
    if (ids.has(id)) throw new Error(`Duplicate document ID found: ${id}`);
    ids.add(id);

    const encryptedData = decodeBase64(record.encryptedData, `Document ${index + 1} data`);
    if (encryptedData.byteLength < 16) throw new Error(`Document ${index + 1} ciphertext is too short.`);
    const doc: DocumentEntry = {
      id,
      name: '',
      type: 'application/octet-stream',
      createdAt: 0,
      iv: new Uint8Array(decodeBase64(record.iv, `Document ${index + 1} IV`, 12)),
      encryptedData,
    };

    const metadata = readEncryptedPair(record, 'encryptedMetadata', 'metadataIv', `Document ${index + 1} metadata`);
    if (metadata) {
      doc.encryptedMetadata = metadata.data;
      doc.metadataIv = metadata.iv;
    } else {
      doc.name = asString(record.name, `Document ${index + 1} name`, 1_000);
      doc.type = asString(record.type, `Document ${index + 1} type`, 200);
      const createdAt = Number(record.createdAt);
      if (!Number.isFinite(createdAt) || createdAt < 0) throw new Error(`Document ${index + 1} date is invalid.`);
      doc.createdAt = createdAt;
    }

    const ocr = readEncryptedPair(record, 'encryptedOcrText', 'ocrTextIv', `Document ${index + 1} OCR`);
    if (ocr) { doc.encryptedOcrText = ocr.data; doc.ocrTextIv = ocr.iv; }
    const summary = readEncryptedPair(record, 'encryptedSummary', 'summaryIv', `Document ${index + 1} summary`);
    if (summary) { doc.encryptedSummary = summary.data; doc.summaryIv = summary.iv; }
    const tags = readEncryptedPair(record, 'encryptedTags', 'tagsIv', `Document ${index + 1} tags`);
    if (tags) { doc.encryptedTags = tags.data; doc.tagsIv = tags.iv; }
    entries.push([`${STORAGE_KEY_DOCS}${id}`, doc]);
  }

  const requestedIterations = version === 2 ? Number(backup.kdfIterations) : LEGACY_KDF_ITERATIONS;
  if (!Number.isInteger(requestedIterations) || requestedIterations < LEGACY_KDF_ITERATIONS || requestedIterations > 5_000_000) {
    throw new Error('The backup KDF configuration is invalid.');
  }
  return { entries, kdfIterations: requestedIterations };
}

async function replaceVaultAtomically(entries: [IDBValidKey, unknown][]): Promise<void> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('keyval-store');
    request.onerror = () => reject(request.error || new Error('Unable to open the vault database.'));
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('keyval')) request.result.createObjectStore('keyval');
    };
    request.onsuccess = () => resolve(request.result);
  });

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('keyval', 'readwrite');
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('Backup import failed.'));
      transaction.onabort = () => reject(transaction.error || new Error('Backup import was rolled back.'));
      const store = transaction.objectStore('keyval');
      store.clear();
      for (const [key, value] of entries) store.put(value, key);
    });
  } finally {
    db.close();
  }
}

export async function importVaultEncrypted(backupJsonStr: string): Promise<void> {
  // Parse and decode every field before opening a write transaction. The single
  // IndexedDB transaction guarantees that a failure leaves the old vault intact.
  const { entries, kdfIterations } = parseBackup(backupJsonStr);
  await replaceVaultAtomically(entries);

  if (typeof window !== 'undefined') {
    localStorage.removeItem('vault_passkey_credential_id');
    localStorage.removeItem('vault_passkey_wrapped_key');
    localStorage.removeItem('vault_passkey_wrapped_iv');
    localStorage.setItem('vault_mode', 'encrypted');
    setKdfIterations(kdfIterations);
  }
}
