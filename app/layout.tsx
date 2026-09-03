import './globals.css';
import type { Metadata } from 'next';
import { Lora } from 'next/font/google';
import { appFontVariable } from '@/lib/fonts';
import { AuthProvider } from '@/lib/auth-context';
import { I18nProvider } from '@/lib/i18n';

const lora = Lora({ subsets: ['latin'], variable: '--font-serif' });

export const metadata: Metadata = {
  title: 'Handover \u2014 Website Owner Manuals for Agencies',
  description:
    'Generate a branded website owner manual for every client. Clean, calm, document-like.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${appFontVariable} ${lora.variable}`}>
      <body className="font-sans antialiased">
        <AuthProvider>
          <I18nProvider>{children}</I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
