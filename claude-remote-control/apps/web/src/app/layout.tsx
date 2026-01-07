import type { Metadata } from 'next';
import { JetBrains_Mono, Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { Providers } from '@/components/Providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: '247',
  description: '247 - Web terminal access to Claude Code from anywhere',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-background text-foreground min-h-screen antialiased font-sans">
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
