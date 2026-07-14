# OcularOCR 1.0.0 Release Candidate

OcularOCR 1.0 brings the encrypted document workflow—from import through OCR,
correction, tables, and export—to a stable release baseline. The application
remains local-first: files, metadata, OCR results, tags, summaries, provider
settings, and backups are encrypted in the browser vault.

## Complete workflow

1. Create a vault with a confirmed password of at least 12 characters.
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

- New vaults always require password encryption and password confirmation.
- Existing passphrase-free legacy vaults still open so their data can be
  backed up and migrated; the weaker mode can no longer be selected for a new
  vault.
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

The release version remains 0.22.0 until the final 1.0.0 version bump is made.
