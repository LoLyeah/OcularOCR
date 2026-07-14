import type {Metadata, Viewport} from 'next';
import './globals.css'; // Global styles
import { PwaHandler } from '@/components/pwa-handler';
import { LanguageProvider } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'OcularOCR',
  description: 'Secure, client-side encrypted document storage and OCR processing system.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#4f46e5',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('vault_theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                }
                const fontSize = localStorage.getItem('vault_font_size') || 'medium';
                document.documentElement.classList.add('font-size-' + fontSize);
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning className="bg-[#F1F5F9] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans h-dvh flex flex-col overscroll-none">
        <LanguageProvider>
          {children}
          <PwaHandler />
        </LanguageProvider>
      </body>
    </html>
  );
}
