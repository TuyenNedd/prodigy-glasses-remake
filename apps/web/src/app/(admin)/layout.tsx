'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/admin-dashboard', label: 'Dashboard' },
  { href: '/admin-users', label: 'Users' },
  { href: '/admin-products', label: 'Products' },
  { href: '/admin-categories', label: 'Categories' },
  { href: '/admin-orders', label: 'Orders' },
  { href: '/admin-comments', label: 'Comments' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 border-r bg-gray-50 p-4">
        <h2 className="mb-6 text-lg font-bold">Admin Panel</h2>
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded px-3 py-2 text-sm ${
                pathname === item.href ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
