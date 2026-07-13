import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

import {
  APP_CACHE_PREFIX,
  CORE_OFFLINE_ASSETS,
  LANGUAGE_CACHE_NAME,
  OCR_LANGUAGES,
  languagePackPath,
} from '../lib/offline.ts';

test('every core offline asset exists and is precached', () => {
  const serviceWorker = readFileSync('public/sw.js', 'utf8');
  assert.equal(new Set(CORE_OFFLINE_ASSETS).size, CORE_OFFLINE_ASSETS.length);

  for (const asset of CORE_OFFLINE_ASSETS.filter((path) => path !== '/')) {
    assert.equal(existsSync(`public${asset}`), true, asset);
    assert.match(serviceWorker, new RegExp(asset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('OCR language catalog has stable, safe download paths', () => {
  const codes = OCR_LANGUAGES.map(({ code }) => code);
  assert.equal(new Set(codes).size, codes.length);
  assert.deepEqual(
    OCR_LANGUAGES.filter(({ bundled }) => bundled).map(({ code }) => code),
    ['eng', 'ind'],
  );
  assert.equal(languagePackPath('chi_sim'), '/tessdata-dynamic/chi_sim.traineddata.gz');
  assert.equal(languagePackPath('../eng'), '/tessdata-dynamic/..%2Feng.traineddata.gz');
});

test('updates preserve downloaded languages and mixed-language OCR has an offline fallback', () => {
  const serviceWorker = readFileSync('public/sw.js', 'utf8');
  const versionHook = readFileSync('hooks/use-version-check.ts', 'utf8');
  const languageRoute = readFileSync('app/tessdata-dynamic/[file]/route.ts', 'utf8');

  assert.match(serviceWorker, new RegExp(LANGUAGE_CACHE_NAME));
  assert.equal(serviceWorker.includes('tessdata-dynamic\\/(eng|ind)'), true);
  assert.match(versionHook, new RegExp(`startsWith\\('${APP_CACHE_PREFIX}'\\)`));
  assert.doesNotMatch(versionHook, /caches\.delete\(key\).*language/i);
  assert.match(languageRoute, /BUNDLED_LANGUAGES = new Set\(\['eng', 'ind'\]\)/);
});
