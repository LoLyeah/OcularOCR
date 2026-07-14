# 1.0 Release Checklist

## Automated gates

- [x] TypeScript compilation
- [x] ESLint
- [x] Unit, migration, security, accessibility, provider, offline, and export tests
- [x] Production dependency audit at high severity
- [x] Production Next.js build
- [x] Official documentation link check

## Browser and device gates

- [x] New encrypted-vault setup and password confirmation
- [x] Existing vault unlock path retained
- [x] Desktop and narrow mobile layout smoke test
- [x] Manifest, service-worker registration, and offline asset preparation
- [x] Dynamic viewport and safe-area behavior for installed mode
- [x] Unsupported-platform preflight behavior

## Data and recovery gates

- [x] Legacy OCR normalization without rescanning
- [x] Version 1 and 2 encrypted backup validation
- [x] Atomic backup replacement
- [x] Provider profile migration without credential loss
- [x] App updates preserve IndexedDB and downloaded OCR language packs

## Manual release operation

- [ ] Export and restore a representative encrypted vault in a second browser profile
- [ ] Run one local Tesseract scan and one consented provider scan with real credentials
- [ ] Bump the application version to 1.0.0
- [ ] Tag the release and publish the final release notes
