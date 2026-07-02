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

export async function isWebAuthnPrfSupported(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) return false;
  try {
    const getCaps = PublicKeyCredential.getClientCapabilities;
    if (typeof getCaps === 'function') {
      const caps = await getCaps();
      if (caps) {
        if ('prf' in caps) return !!(caps as any).prf;
        if (caps.extensions && Array.isArray(caps.extensions)) {
          return caps.extensions.includes('prf');
        }
      }
    }
    return true;
  } catch (e) {
    return true;
  }
}

export async function registerPasskeyPrf(username: string, salt: Uint8Array): Promise<{ prfValue: ArrayBuffer; credentialId: string }> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    throw new Error('WebAuthn is not supported in this environment.');
  }

  const rpId = window.location.hostname;
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));

  const options: CredentialCreationOptions = {
    publicKey: {
      challenge,
      rp: {
        name: 'OcularOCR Local Vault',
        id: rpId
      },
      user: {
        id: userId,
        name: username || 'local-user',
        displayName: username || 'Local User'
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },  // ES256
        { type: 'public-key', alg: -257 } // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'required',
        requireResidentKey: true
      },
      extensions: {
        prf: {
          eval: {
            first: salt
          }
        }
      } as any
    }
  };

  const credential = await navigator.credentials.create(options) as PublicKeyCredential;
  if (!credential) {
    throw new Error('Credential creation failed.');
  }

  const extensionResults = credential.getClientExtensionResults() as any;
  const prfResults = extensionResults.prf?.results;
  const firstPrf = prfResults?.first;

  if (!firstPrf) {
    throw new Error('Your security device or browser did not return a PRF encryption key. Please ensure platform biometrics are enabled.');
  }

  const credentialId = arrayBufferToBase64(credential.rawId);

  return {
    prfValue: firstPrf,
    credentialId
  };
}

export async function getPasskeyPrf(credentialIdBase64: string, salt: Uint8Array): Promise<ArrayBuffer> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    throw new Error('WebAuthn is not supported in this environment.');
  }

  const rpId = window.location.hostname;
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const credentialId = base64ToArrayBuffer(credentialIdBase64);

  const options: CredentialRequestOptions = {
    publicKey: {
      challenge,
      rpId,
      allowCredentials: [
        {
          type: 'public-key',
          id: credentialId
        }
      ],
      userVerification: 'required',
      extensions: {
        prf: {
          eval: {
            first: salt
          }
        }
      } as any
    }
  };

  const assertion = await navigator.credentials.get(options) as PublicKeyCredential;
  if (!assertion) {
    throw new Error('Credential assertion failed.');
  }

  const extensionResults = assertion.getClientExtensionResults() as any;
  const prfResults = extensionResults.prf?.results;
  const firstPrf = prfResults?.first;

  if (!firstPrf) {
    throw new Error('Failed to retrieve encryption key from security device (WebAuthn PRF extension).');
  }

  return firstPrf;
}

export async function deriveKeyFromPrf(prfValue: ArrayBuffer): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    prfValue,
    { name: 'HKDF' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(),
      info: new TextEncoder().encode('OcularOCR-Vault-PRF-Key')
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

