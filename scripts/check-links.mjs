import { readFile } from 'node:fs/promises';

const files = ['README.md', 'lib/providers.ts', 'components/guide-content.tsx'];
const urls = new Set();
const apiHosts = new Set(['api.openai.com', 'generativelanguage.googleapis.com']);
for (const file of files) {
  const source = await readFile(file, 'utf8');
  for (const match of source.matchAll(/https:\/\/[^\s)'"`}>]+/g)) {
    const url = match[0].replace(/[.,;:]$/, '');
    if (!apiHosts.has(new URL(url).hostname)) urls.add(url);
  }
}

const failures = [];
await Promise.all([...urls].map(async (url) => {
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'OcularOCR link checker' }, redirect: 'follow', signal: AbortSignal.timeout(15_000) });
    if (!response.ok && response.status !== 403 && response.status !== 429) failures.push(`${response.status} ${url}`);
  } catch (error) {
    failures.push(`${error instanceof Error ? error.message : String(error)} ${url}`);
  }
}));

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Checked ${urls.size} external links.`);
}
