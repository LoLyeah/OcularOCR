import assert from 'node:assert/strict';
import test from 'node:test';

import { detectSupportedType, isPrivateIp } from '../lib/proxy-security.ts';

test('URL import rejects private and special-purpose IP ranges', () => {
  for (const address of ['127.0.0.1', '10.1.2.3', '172.20.1.1', '192.168.1.2', '169.254.169.254', '::1', 'fd00::1', 'fe80::1']) {
    assert.equal(isPrivateIp(address), true, address);
  }
  assert.equal(isPrivateIp('8.8.8.8'), false);
  assert.equal(isPrivateIp('2606:4700:4700::1111'), false);
});

test('URL import trusts file signatures rather than response MIME labels', () => {
  assert.equal(detectSupportedType(new TextEncoder().encode('%PDF-1.7')), 'application/pdf');
  assert.equal(detectSupportedType(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])), 'image/jpeg');
  assert.equal(detectSupportedType(new TextEncoder().encode('<html>not a document</html>')), null);
});
