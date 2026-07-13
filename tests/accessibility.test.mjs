import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('dashboard provides skip navigation and current-page semantics', () => {
  const dashboard = readFileSync('components/dashboard.tsx', 'utf8');
  assert.match(dashboard, /href="#main-content"/);
  assert.match(dashboard, /<main id="main-content"/);
  assert.match(dashboard, /aria-current=/);
});

test('primary dialogs trap focus and expose dialog semantics', () => {
  for (const path of [
    'components/settings-modal.tsx',
    'components/pdf-workspace-modal.tsx',
    'components/ocr-diff-modal.tsx',
  ]) {
    const source = readFileSync(path, 'utf8');
    assert.match(source, /useDialogFocus/);
    assert.match(source, /role="dialog"/);
    assert.match(source, /aria-modal="true"/);
    assert.match(source, /aria-labelledby=/);
  }
});

test('destructive confirmations use keyboard-safe alert dialogs', () => {
  const manager = readFileSync('components/file-manager.tsx', 'utf8');
  assert.match(manager, /useDialogFocus/);
  assert.equal(manager.match(/role="alertdialog"/g)?.length, 3);
  assert.equal(manager.match(/aria-modal="true"/g)?.length, 3);
});

test('global styles honor keyboard focus and reduced-motion preferences', () => {
  const styles = readFileSync('app/globals.css', 'utf8');
  assert.match(styles, /:focus-visible/);
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
});

test('continuous integration verifies every release gate', () => {
  const workflow = readFileSync('.github/workflows/quality.yml', 'utf8');
  for (const command of ['npm ci', 'npm run lint', 'npm run typecheck', 'npm test', 'npm audit', 'next build']) {
    assert.match(workflow, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});
