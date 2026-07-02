import { get, set, keys, del } from 'idb-keyval';

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
}

export const STORAGE_KEY_SALT = 'vault_salt';
export const STORAGE_KEY_DOCS = 'doc_';
export const STORAGE_KEY_SETTINGS = 'settings_enc';
export const STORAGE_KEY_VERIFY = 'vault_verify';

export interface AISettings {
  provider: 'gemini' | 'openai' | 'ollama';
  apiKey: string;
  endpoint: string; // for openai or ollama
  model: string;
  useLlmForOcr?: boolean;
  temperature?: number;
  customOcrPrompt?: string;
  customSummaryPrompt?: string;
  autoTagStrategy?: 'hybrid' | 'local' | 'none';
  configs?: Record<string, { apiKey: string; endpoint: string; model: string }>;
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

export async function saveDocument(doc: DocumentEntry): Promise<void> {
  const docToSave = { ...doc };
  delete (docToSave as any).decryptedTags;
  await set(`${STORAGE_KEY_DOCS}${doc.id}`, docToSave);
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
  return docs.sort((a, b) => b.createdAt - a.createdAt);
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
  const allKeys = await keys();
  for (const k of allKeys) {
    if (typeof k === 'string' && (k.startsWith(STORAGE_KEY_DOCS) || k === STORAGE_KEY_SALT || k === STORAGE_KEY_SETTINGS || k === STORAGE_KEY_VERIFY)) {
      await del(k);
    }
  }
  if (typeof window !== 'undefined') {
    localStorage.removeItem('vault_mode');
    localStorage.removeItem('vault_passkey_credential_id');
  }
}

