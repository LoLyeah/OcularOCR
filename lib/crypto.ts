export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptBuffer(buffer: ArrayBuffer | ArrayBufferView, key: CryptoKey): Promise<{ encrypted: ArrayBuffer; iv: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    buffer as unknown as BufferSource
  );
  return { encrypted, iv };
}

export async function decryptBuffer(encrypted: ArrayBuffer, iv: Uint8Array, key: CryptoKey): Promise<ArrayBuffer> {
  return await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    encrypted as unknown as BufferSource
  );
}

export async function encryptString(text: string, key: CryptoKey): Promise<{ encrypted: ArrayBuffer; iv: Uint8Array }> {
  const enc = new TextEncoder();
  return encryptBuffer(enc.encode(text), key);
}

export async function decryptString(encrypted: ArrayBuffer, iv: Uint8Array, key: CryptoKey): Promise<string> {
  const decryptedBuffer = await decryptBuffer(encrypted, iv, key);
  const dec = new TextDecoder();
  return dec.decode(decryptedBuffer);
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
