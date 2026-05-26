import type { Metadata } from 'next';
import './globals.css';
import { QueryProvider } from '@/providers/query-provider';

export const metadata: Metadata = {
  title: 'Prodigy Glasses',
  description: 'E-commerce store for eyeglasses — Prodigy Glasses Remake',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
