# OcularOCR Roadmap

## 0.21.0 — Structured OCR and Rich Export

**Status:** Released in 0.21.0.

Turn OCR output into an editable document structure that is shared by online AI
providers, local AI endpoints, and offline Tesseract. Use that structure to
produce exports that preserve meaning instead of flattening every page to plain
text.

### Document structure

- Introduce a versioned OCR document model for headings, paragraphs, lists,
  tables, and page boundaries.
- Represent tables as rows and cells, including bounding boxes, header cells,
  and row or column spans when the OCR engine can identify them.
- Preserve reading order and confidence metadata without breaking existing
  encrypted OCR records.
- Migrate older OCR results when they are opened, without requiring documents
  to be scanned again.

### Online and offline OCR

- Return the same structured model from Gemini, OpenAI-compatible providers,
  Ollama, and offline Tesseract.
- Improve offline layout analysis using hOCR word and line positions to detect
  headings, lists, multiple tables, columns, and page numbers.
- Validate provider responses and fall back gracefully when a model cannot
  provide structured output.
- Let users review detected blocks, change a block type, and correct table cells
  before export.

### Rich exports

- Export GitHub-Flavored Markdown with headings, paragraphs, lists, tables,
  escaped cell content, and clear page boundaries.
- Export reflowed PDFs with real headings, wrapped paragraphs, lists, repeated
  table headers, automatic page breaks, and selectable text.
- Keep searchable-image PDF export available for maximum visual fidelity.
- Export DOCX files with native headings, lists, and tables.
- Export one table or all detected tables as CSV, while retaining structured
  JSON as the lossless interchange format.
- Provide an export preview and clear warnings when layout confidence is low.

### Quality requirements

- Use shared rendering fixtures so Markdown, PDF, DOCX, CSV, and JSON exports
  agree on content and reading order.
- Cover borderless tables, merged cells, multi-page tables, multi-column pages,
  mixed languages, and documents with no tables.
- Keep extraction and export local unless the user explicitly selects and
  consents to a remote OCR provider.
- Process large documents page by page and expose progress and cancellation.

### Completion criteria

- The same sample documents produce equivalent structure through online and
  offline OCR, allowing for confidence differences.
- Users can correct detected structure and export it without rescanning.
- Tables remain readable across PDF page breaks and valid in Markdown, DOCX,
  CSV, and JSON.
- Existing encrypted vaults and OCR results remain compatible.
- Automated tests cover the shared model, migrations, layout detection,
  correction workflow, and every export format.

## 0.22.0 — Guide, Settings, and Provider Refresh

**Status: Implemented.**

Replace hard-coded and conflicting provider guidance with one verified source of
truth, then rebuild Settings, the in-app English and Indonesian guides, and the
README around the app's actual behavior. Model catalogs change independently of
OcularOCR, so the UI must not present an old model name as a permanent default
or claim capabilities that have not been checked.

### Provider and model registry

- Create a shared provider registry for names, endpoints, documentation links,
  model requirements, and task capabilities used by runtime code and the UI.
- Remove duplicated model defaults and recommendations from OCR, summarization,
  tagging, Settings, guides, translations, and the README.
- Prefer provider model discovery where an API supports it; otherwise accept a
  user-entered model ID with provider-specific examples that are clearly dated.
- Add a connection and capability check for image input, structured output, and
  text generation before a model is used for OCR.
- Distinguish verified support, user-supplied compatibility, and untested models
  instead of maintaining a speculative model leaderboard.
- Document a review date and official source for every curated recommendation,
  plus a safe fallback when a model is retired or unavailable to an account.

### Settings redesign

- Give each provider a focused setup flow with endpoint validation, model
  selection, connection status, capability results, and actionable errors.
- Explain which operations send page images or extracted text to a remote
  provider and keep cloud consent visible next to those controls.
- Separate local Tesseract, local OpenAI-compatible endpoints, and remote cloud
  providers so "offline," "local," and "OpenAI compatible" are not conflated.
- Preserve existing encrypted settings and provider profiles during migration.
- Make advanced prompts and sampling controls task-aware, with sensible defaults
  and reset controls rather than one ambiguous configuration for every task.

### Guide and README rewrite

- Rewrite both in-app guides from the current product workflow, including vault
  setup, OCR choices, structured OCR, correction, tables, exports, recovery, and
  privacy boundaries.
- Keep English and Indonesian content structurally equivalent and test that all
  navigation targets and external links are valid.
- Remove unsupported benchmarks, invented release details, stale model rankings,
  and provider claims that cannot be traced to official documentation.
- Correct API-key and network-flow explanations to match the shipped client-side
  implementation exactly.
- Update screenshots, feature lists, setup steps, environment examples, and
  troubleshooting; clearly label optional, experimental, and provider-dependent
  features.
- Add a short release support policy covering browsers, vault compatibility,
  model deprecations, and how documentation freshness is maintained.

### Maintenance safeguards

- Add tests that fail when runtime defaults, Settings examples, translations,
  guides, and README provider metadata drift apart.
- Add an automated external-link check and a scheduled reminder to review model
  recommendations against official provider documentation.
- Keep capability-based wording wherever possible so routine model releases do
  not require rewriting the whole guide.

### Completion criteria

- No model identifier or endpoint default is duplicated outside the shared
  provider registry without an explicit compatibility reason.
- A user can configure and test each provider without consulting source code.
- Settings reports whether the selected model can perform the requested OCR
  operation before document content is sent.
- English and Indonesian guides describe the same current features and privacy
  behavior, and all instructions match the shipped UI.
- README claims, provider links, and model examples have sources and review dates.
- Existing provider settings migrate without losing encrypted credentials.

## 1.0.0 — Stable Release

**Status: Implemented; awaiting the explicit 1.0.0 release bump.**

### Launch hardening

- Require password confirmation for encrypted vaults while keeping an explicit,
  clearly warned no-password option for non-sensitive local workflows.
- Add production browser security headers, platform capability preflight, safe
  backup-size handling, and semantic update-version comparison.
- Verify encrypted settings, backup versions, legacy OCR records, and existing
  vaults remain compatible.

### Browser, PWA, offline, and performance

- Use dynamic mobile viewport sizing and safe-area-aware notifications.
- Finalize manifest identity, scope, orientation, service-worker cache migration,
  update behavior, and offline asset coverage.
- Scale OCR concurrency for mobile and low-memory devices and release idle
  workers after processing.
- Cover security, migration, browser support, PWA metadata, offline behavior,
  performance limits, and release documentation in automated tests.

### Release documentation

- Publish release notes covering setup, import, OCR choices, correction, tables,
  exports, backup, privacy, compatibility, and upgrade behavior.
- Maintain an auditable release checklist for automated, browser, data recovery,
  and final manual release operations.

Version 1.0.0 is ready when the automated release gates pass and the final two
credential- and profile-dependent manual smoke tests are completed by the
release owner.
