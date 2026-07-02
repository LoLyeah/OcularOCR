import { get, set, keys, del } from 'idb-keyval';
import { arrayBufferToBase64, base64ToArrayBuffer } from './crypto';


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
    localStorage.removeItem('vault_passkey_wrapped_key');
  }
}

function uint8ArrayToArrayBuffer(arr: Uint8Array): ArrayBuffer {
  if (arr.byteOffset === 0 && arr.byteLength === arr.buffer.byteLength) {
    return arr.buffer as ArrayBuffer;
  }
  return arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength) as ArrayBuffer;
}

export interface EncryptedVaultBackup {
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
    name: string;
    type: string;
    createdAt: number;
    iv: string;
    encryptedData: string;
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
    salt: arrayBufferToBase64(uint8ArrayToArrayBuffer(salt)),
    documents: documents.map((doc) => {
      const docBackup: any = {
        id: doc.id,
        name: doc.name,
        type: doc.type,
        createdAt: doc.createdAt,
        iv: arrayBufferToBase64(uint8ArrayToArrayBuffer(doc.iv)),
        encryptedData: arrayBufferToBase64(doc.encryptedData)
      };
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

export async function importVaultEncrypted(backupJsonStr: string): Promise<void> {
  const backup = JSON.parse(backupJsonStr) as EncryptedVaultBackup;
  if (!backup.salt || !backup.documents) {
    throw new Error('Invalid backup format.');
  }

  await clearVault();

  const saltBuffer = base64ToArrayBuffer(backup.salt);
  await set(STORAGE_KEY_SALT, new Uint8Array(saltBuffer));

  if (backup.verifyToken) {
    await set(STORAGE_KEY_VERIFY, {
      data: base64ToArrayBuffer(backup.verifyToken.data),
      iv: new Uint8Array(base64ToArrayBuffer(backup.verifyToken.iv))
    });
  }

  if (backup.settings) {
    await set(STORAGE_KEY_SETTINGS, {
      data: base64ToArrayBuffer(backup.settings.data),
      iv: new Uint8Array(base64ToArrayBuffer(backup.settings.iv))
    });
  }

  for (const doc of backup.documents) {
    const docEntry: DocumentEntry = {
      id: doc.id,
      name: doc.name,
      type: doc.type,
      createdAt: doc.createdAt,
      iv: new Uint8Array(base64ToArrayBuffer(doc.iv)),
      encryptedData: base64ToArrayBuffer(doc.encryptedData)
    };
    if (doc.ocrTextIv && doc.encryptedOcrText) {
      docEntry.ocrTextIv = new Uint8Array(base64ToArrayBuffer(doc.ocrTextIv));
      docEntry.encryptedOcrText = base64ToArrayBuffer(doc.encryptedOcrText);
    }
    if (doc.summaryIv && doc.encryptedSummary) {
      docEntry.summaryIv = new Uint8Array(base64ToArrayBuffer(doc.summaryIv));
      docEntry.encryptedSummary = base64ToArrayBuffer(doc.encryptedSummary);
    }
    if (doc.tagsIv && doc.encryptedTags) {
      docEntry.tagsIv = new Uint8Array(base64ToArrayBuffer(doc.tagsIv));
      docEntry.encryptedTags = base64ToArrayBuffer(doc.encryptedTags);
    }
    await saveDocument(docEntry);
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem('vault_mode', 'encrypted');
  }
}


