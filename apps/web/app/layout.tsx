import type { Metadata } from 'next';
import { Inter, Instrument_Serif } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/auth-provider';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument-serif',
  display: 'swap',
});

function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return 'http://localhost:3000';
}

export const metadata: Metadata = {
  metadataBase: new URL(resolveSiteUrl()),
  title: 'Sellr — The Marketplace That Actually Closes',
  description: 'A trust-native local marketplace for verified communities.',
  icons: {
    icon: [{ url: '/brand/sellr-app-icon.png', type: 'image/png' }],
    apple: [{ url: '/brand/sellr-app-icon.png', type: 'image/png' }],
  },
  openGraph: {
    type: 'website',
    siteName: 'Sellr',
    images: [
      {
        url: '/brand/sellr-logo-wordmark.png',
        alt: 'Sellr logo',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${instrumentSerif.variable}`}
    >
      <body>
        <Providers>
          <AuthProvider>{children}</AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
