'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Fatal application error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#0f172a', color: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
          <section style={{ width: '100%', maxWidth: 440, textAlign: 'center' }}>
            <h1 style={{ fontSize: 22, marginBottom: 8 }}>OcularOCR could not start</h1>
            <p style={{ color: '#cbd5e1', lineHeight: 1.5 }}>
              Your encrypted vault has not been erased. Reload the application to reconnect to local storage.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{ marginTop: 16, border: 0, borderRadius: 6, padding: '10px 18px', background: '#4f46e5', color: 'white', fontWeight: 700, cursor: 'pointer' }}
            >
              Reload application
            </button>
            {error.digest && <p style={{ marginTop: 16, color: '#64748b', fontSize: 11 }}>Reference: {error.digest}</p>}
          </section>
        </main>
      </body>
    </html>
  );
}
