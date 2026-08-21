import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: 'pipt — one question at a time',
  description: 'PIPT is a small field-note creature learning one thing at a time.',
  openGraph: {
    title: 'pipt — one question at a time',
    description: 'PIPT is a small field-note creature learning one thing at a time.',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'pipt — one question at a time',
    description: 'PIPT is a small field-note creature learning one thing at a time.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
