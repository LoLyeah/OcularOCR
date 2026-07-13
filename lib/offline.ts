export const APP_CACHE_PREFIX = 'ocular-app-cache-';
export const LANGUAGE_CACHE_NAME = 'ocular-language-cache-v1';

export const CORE_OFFLINE_ASSETS = [
  '/',
  '/manifest.json',
  '/icon.svg',
  '/pdf.worker.min.mjs',
  '/tesseract/worker.min.js',
  '/tesseract-core/tesseract-core-lstm.wasm.js',
  '/tesseract-core/tesseract-core-simd-lstm.wasm.js',
  '/tesseract-core/tesseract-core-relaxedsimd-lstm.wasm.js',
  '/tessdata/eng.traineddata.gz',
  '/tessdata/ind.traineddata.gz',
] as const;

export const OCR_LANGUAGES = [
  { code: 'eng', label: 'English', bundled: true },
  { code: 'ind', label: 'Indonesian', bundled: true },
  { code: 'spa', label: 'Spanish', bundled: false },
  { code: 'fra', label: 'French', bundled: false },
  { code: 'deu', label: 'German', bundled: false },
  { code: 'chi_sim', label: 'Chinese (Simplified)', bundled: false },
  { code: 'jpn', label: 'Japanese', bundled: false },
  { code: 'ara', label: 'Arabic', bundled: false },
  { code: 'hin', label: 'Hindi', bundled: false },
] as const;

export type OcrLanguageCode = typeof OCR_LANGUAGES[number]['code'];

export function languagePackPath(code: string): string {
  return `/tessdata-dynamic/${encodeURIComponent(code)}.traineddata.gz`;
}

export async function getOfflineReadiness(): Promise<{
  ready: boolean;
  serviceWorkerRegistered: boolean;
  missingAssets: string[];
}> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return { ready: false, serviceWorkerRegistered: false, missingAssets: [...CORE_OFFLINE_ASSETS] };
  }
  const matches = await Promise.all(CORE_OFFLINE_ASSETS.map(async (asset) => ({ asset, match: await caches.match(asset) })));
  const missingAssets = matches.filter(({ match }) => !match).map(({ asset }) => asset);
  const serviceWorkerRegistered = 'serviceWorker' in navigator && !!(await navigator.serviceWorker.getRegistration('/'));
  return { ready: serviceWorkerRegistered && missingAssets.length === 0, serviceWorkerRegistered, missingAssets };
}

export async function getDownloadedLanguages(): Promise<Set<string>> {
  const downloaded = new Set<string>();
  if (typeof window === 'undefined' || !('caches' in window)) return downloaded;
  const cache = await caches.open(LANGUAGE_CACHE_NAME);
  await Promise.all(OCR_LANGUAGES.filter((language) => !language.bundled).map(async ({ code }) => {
    if (await cache.match(languagePackPath(code))) downloaded.add(code);
  }));
  return downloaded;
}

export async function downloadLanguagePack(code: string): Promise<void> {
  const language = OCR_LANGUAGES.find((entry) => entry.code === code);
  if (!language || language.bundled) return;
  const path = languagePackPath(code);
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Language download failed with status ${response.status}.`);
  const cache = await caches.open(LANGUAGE_CACHE_NAME);
  await cache.put(path, response);
}

export async function removeLanguagePack(code: string): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  const cache = await caches.open(LANGUAGE_CACHE_NAME);
  await cache.delete(languagePackPath(code));
}
