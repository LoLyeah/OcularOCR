# OcularOCR 1.0.0

OcularOCR 1.0 brings the local document workflow—from import through OCR,
correction, tables, and export—to a stable release baseline. The application
remains local-first. The recommended password vault encrypts files, metadata,
OCR results, tags, summaries, provider settings, and backups in the browser;
the optional no-password mode is explicitly limited to non-sensitive use.

## Complete workflow

1. Choose a recommended encrypted vault with a confirmed password of at least
   12 characters, or explicitly choose the warned no-password local mode.
2. Import PDF, PNG, JPEG, or WebP files up to 25 MB each, including supported
   public URLs.
3. Use offline Tesseract OCR or a capability-tested Gemini,
   OpenAI-compatible, or local Ollama model.
4. Review headings, paragraphs, lists, reading order, and detected tables.
5. Preview and accept OCR corrections without overwriting the original result
   unexpectedly.
6. Export Markdown, searchable or reflowed PDF, DOCX, CSV, or structured JSON.
7. Export an encrypted vault backup and request persistent browser storage.

## Stability and security

- New encrypted vaults require password confirmation.
- A clearly warned unencrypted/no-password mode remains available for
  non-sensitive workflows and automatically unlocks with the browser profile.
- The guide includes a dedicated local Ollama installation, vision-model,
  endpoint, CORS, and troubleshooting walkthrough.
- Production responses include framing, content-type, referrer, permissions,
  opener, and content-security protections.
- Unsupported browsers receive a clear preflight error before vault access.
- Backup imports validate size and structure before the atomic replacement
  transaction starts.
- Automatic locking discards the active key after inactivity, including time
  spent with the app in the background.

## PWA, offline, and performance

- The install manifest supports portrait and landscape layouts and declares a
  stable application identity and scope.
- App-shell and bundled OCR assets remain available offline after preparation;
  downloaded language packs survive application updates.
- OCR concurrency is reduced automatically on mobile and memory-constrained
  devices, and idle workers are released after processing.
- Dynamic viewport sizing and safe-area-aware notifications improve installed
  mobile behavior.

## Compatibility and upgrade notes

- Vault backups version 1 and 2 remain supported.
- Existing encrypted documents and legacy plain OCR results migrate when read;
  rescanning is not required.
- Provider settings remain encrypted and retain prior profiles. AI OCR must be
  re-tested when its provider, endpoint, credential, or model changes.
- OcularOCR cannot recover vault passwords. Export a fresh encrypted backup
  before upgrading or moving browser profiles.

Released as version 1.0.0.
