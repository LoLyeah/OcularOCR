'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Recoverable application error:', error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <section className="w-full max-w-md rounded-xl border border-amber-200 bg-white p-6 text-center shadow-sm dark:border-amber-900/60 dark:bg-slate-900">
        <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
        <h1 className="mt-3 text-lg font-bold">OcularOCR needs to recover</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Your encrypted vault remains stored on this device. Try reopening this screen; if the problem continues, reload the app.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 inline-flex items-center gap-2 rounded bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Try again
        </button>
        {error.digest && <p className="mt-4 text-[10px] text-slate-400">Reference: {error.digest}</p>}
      </section>
    </main>
  );
}
