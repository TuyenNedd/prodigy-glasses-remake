import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Prodigy Glasses',
  description: 'E-commerce store for eyeglasses — Prodigy Glasses Remake',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-white text-gray-900 antialiased">{children}</body>
    </html>
  );
}
