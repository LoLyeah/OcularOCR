export interface PlatformReadiness {
  supported: boolean;
  missing: string[];
  optional: { serviceWorker: boolean; cacheStorage: boolean; passkeys: boolean };
}

export function getPlatformReadiness(scope: typeof globalThis = globalThis): PlatformReadiness {
  const missing: string[] = [];
  if (!('indexedDB' in scope)) missing.push('IndexedDB');
  if (!scope.crypto?.subtle) missing.push('Web Crypto');
  if (!('WebAssembly' in scope)) missing.push('WebAssembly');
  if (!('Worker' in scope)) missing.push('Web Workers');
  if (!('TextEncoder' in scope) || !('TextDecoder' in scope)) missing.push('text encoding');
  return {
    supported: missing.length === 0,
    missing,
    optional: {
      serviceWorker: 'navigator' in scope && 'serviceWorker' in scope.navigator,
      cacheStorage: 'caches' in scope,
      passkeys: 'PublicKeyCredential' in scope,
    },
  };
}
