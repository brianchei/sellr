import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/auth-provider';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
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
    <html lang="en" data-scroll-behavior="smooth">
      <body className={inter.className}>
        <Providers>
          <AuthProvider>{children}</AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
